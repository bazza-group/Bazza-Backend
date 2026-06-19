import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Upload, TipoUpload } from './entities/upload.entity';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(Upload) private uploadRepo: Repository<Upload>,
    private chatGateway: ChatGateway,
  ) {}

  async fazer(
    userId: string,
    file: Express.Multer.File,
    tipo: TipoUpload,
  ): Promise<any> {
    if (!file) throw new BadRequestException('Ficheiro não foi enviado');

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('Ficheiro excede 10MB');
    }

    const tiposPermitidos = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
      'image/bmp',
      'application/pdf',
    ];
    if (!tiposPermitidos.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo '${file.mimetype}' não permitido. Use JPG, PNG, GIF, WebP ou PDF`);
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Ficheiro está vazio');
    }

    console.log(`[Upload] ${tipo} user=${userId} size=${file.size} mime=${file.mimetype} name=${file.originalname}`);

    // Substituir se já existe
    const existente = await this.uploadRepo.findOne({ where: { userId, tipo } });
    let uploadId: string;
    let isUpdate = false;

    if (existente) {
      existente.ficheiro = file.buffer;
      existente.nomeOriginal = file.originalname;
      existente.mimeType = file.mimetype;
      existente.tamanho = file.size;
      await this.uploadRepo.save(existente);
      uploadId = existente.id;
      isUpdate = true;
      console.log(`[Upload] Documento actualizado: ${existente.id}`);
    } else {
      const upload = this.uploadRepo.create({
        userId,
        tipo,
        ficheiro: file.buffer,
        nomeOriginal: file.originalname,
        mimeType: file.mimetype,
        tamanho: file.size,
      });
      const saved = await this.uploadRepo.save(upload);
      uploadId = saved.id;
      console.log(`[Upload] Novo documento criado: ${saved.id}`);
    }

    // Emitir evento socket para o admin — atualização em tempo real
    try {
      this.chatGateway.server.to('role_admin').emit('document:update', {
        userId,
        uploadId,
        tipo,
        nomeOriginal: file.originalname,
        mimeType: file.mimetype,
        criadoEm: new Date().toISOString(),
        acao: isUpdate ? 'actualizado' : 'criado',
      });
      console.log(`[Upload] Socket emit → role_admin document:update ${tipo} (${isUpdate ? 'update' : 'new'})`);
    } catch (err) {
      console.warn('[Upload] Falha ao emitir socket:', err);
    }

    const uploadData = await this.uploadRepo.findOne({
      where: { id: uploadId },
      select: ['id', 'userId', 'tipo', 'nomeOriginal', 'mimeType', 'tamanho', 'criadoEm'],
    });

    return {
      message: isUpdate ? 'Ficheiro actualizado' : 'Ficheiro enviado com sucesso',
      upload: uploadData,
    };
  }

  async obterFicheiro(id: string) {
    const upload = await this.uploadRepo.findOne({
      where: { id },
      select: ['ficheiro', 'mimeType', 'nomeOriginal'],
    });
    if (!upload) throw new NotFoundException('Ficheiro não encontrado');

    return {
      buffer: Buffer.isBuffer(upload.ficheiro)
        ? upload.ficheiro
        : Buffer.from(upload.ficheiro),
      mimeType: upload.mimeType,
      nomeOriginal: upload.nomeOriginal,
    };
  }

  async buscarPorId(id: string) {
    const upload = await this.uploadRepo.findOne({
      where: { id },
      select: ['id', 'userId', 'tipo', 'nomeOriginal', 'mimeType', 'tamanho', 'criadoEm'],
    });
    if (!upload) throw new NotFoundException('Upload não encontrado');
    return this.formatarResponse(upload);
  }

  async listarDoUtilizador(userId: string) {
    const uploads = await this.uploadRepo
      .createQueryBuilder('u')
      .where('u.userId = :userId', { userId })
      .select(['u.id', 'u.tipo', 'u.nomeOriginal', 'u.mimeType', 'u.tamanho', 'u.criadoEm'])
      .orderBy('u.criadoEm', 'DESC')
      .getMany();

    return uploads.map((u) => this.formatarResponse(u));
  }

  async listarTodos(skip = 0, take = 20) {
    const query = this.uploadRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.userId', 'u.tipo', 'u.nomeOriginal', 'u.mimeType', 'u.tamanho', 'u.criadoEm']);

    const [uploads, total] = await query
      .orderBy('u.criadoEm', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return {
      data: uploads.map((u) => this.formatarResponse(u)),
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
    };
  }

  async remover(id: string, userId: string) {
    const upload = await this.uploadRepo.findOne({ where: { id } });
    if (!upload) throw new NotFoundException('Upload não encontrado');
    if (upload.userId !== userId) throw new ForbiddenException('Sem permissão');

    await this.uploadRepo.remove(upload);
    return { message: 'Upload removido com sucesso' };
  }

  async temTodosDocumentosObrigatorios(userId: string): Promise<boolean> {
    const tipos = [
      TipoUpload.FOTO_PERFIL,
      TipoUpload.DOCUMENTO_BI_FRENTE,
      TipoUpload.DOCUMENTO_BI_VERSO,
      TipoUpload.DOCUMENTO_CARTA_FRENTE,
      TipoUpload.DOCUMENTO_CARTA_VERSO,
      TipoUpload.FOTO_VEICULO,
      TipoUpload.FOTO_PLACA,
    ];
    const uploads = await this.uploadRepo.find({ where: { userId } });
    return tipos.every((tipo) => uploads.some((u) => u.tipo === tipo));
  }

  private formatarResponse(upload: any) {
    const { ficheiro, ...rest } = upload;
    return rest;
  }
}
