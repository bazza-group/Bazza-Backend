import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
// CORREÇÃO 3: Adicionado "type" antes da importação do Response
import type { Response } from 'express'; 
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { TipoUpload } from './entities/upload.entity';

@ApiTags('Uploads')
@ApiBearerAuth('firebase')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly service: UploadsService) {}

  // ── FOTO DE PERFIL ────────────────────────────────────
  @Post('foto-perfil')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload de foto de perfil' })
  uploadFotoPerfil(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Ficheiro não foi enviado');
    console.log(`[Upload] foto_perfil user=${user.id} size=${file.size} mime=${file.mimetype}`);
    return this.service.fazer(user.id, file, TipoUpload.FOTO_PERFIL);
  }

  // ── DOCUMENTOS ────────────────────────────────────────
  @Post('documento-bi-frente')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload de BI (frente)' })
  uploadBIFrente(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Ficheiro não foi enviado');
    return this.service.fazer(user.id, file, TipoUpload.DOCUMENTO_BI_FRENTE);
  }

  @Post('documento-bi-verso')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload de BI (verso)' })
  uploadBIVerso(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Ficheiro não foi enviado');
    return this.service.fazer(user.id, file, TipoUpload.DOCUMENTO_BI_VERSO);
  }

  @Post('documento-carta-frente')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload de Carta (frente)' })
  uploadCartaFrente(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Ficheiro não foi enviado');
    return this.service.fazer(user.id, file, TipoUpload.DOCUMENTO_CARTA_FRENTE);
  }

  @Post('documento-carta-verso')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload de Carta (verso)' })
  uploadCartaVerso(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Ficheiro não foi enviado');
    return this.service.fazer(user.id, file, TipoUpload.DOCUMENTO_CARTA_VERSO);
  }

  @Post('foto-veiculo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload de foto do veículo' })
  uploadFotoVeiculo(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Ficheiro não foi enviado');
    return this.service.fazer(user.id, file, TipoUpload.FOTO_VEICULO);
  }

  @Post('foto-placa')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload de foto da placa do veículo' })
  uploadFotoPlaca(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Ficheiro não foi enviado');
    return this.service.fazer(user.id, file, TipoUpload.FOTO_PLACA);
  }

  @Post('prova-entrega')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload de prova de entrega' })
  uploadProvaEntrega(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Ficheiro não foi enviado');
    return this.service.fazer(user.id, file, TipoUpload.PROVA_ENTREGA);
  }

  // ── LISTAR ────────────────────────────────────────────
  @Get('meus')
  @ApiOperation({ summary: 'Listar meus uploads' })
  listarMeus(@CurrentUser() user: User) {
    return this.service.listarDoUtilizador(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalhes de um upload' })
  buscar(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }

  // ── DOWNLOAD ──────────────────────────────────────────
  @Get(':id/download')
  @ApiOperation({ summary: 'Descarregar ficheiro' })
  async download(@Param('id') id: string, @Res() res: Response) {
    const { buffer, mimeType, nomeOriginal } = await this.service.obterFicheiro(
      id,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nomeOriginal}"`,
    );
    res.send(buffer);
  }

  // ── REMOVER ───────────────────────────────────────────
  @Delete(':id')
  @ApiOperation({ summary: 'Remover upload' })
  remover(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.remover(id, user.id);
  }
}