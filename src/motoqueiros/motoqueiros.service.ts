import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deliver, DeliverStatus, DeliverDisponibilidade } from './entities/motoqueiro.entity';
import { Veiculo } from './entities/veiculo.entity';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Upload } from '../uploads/entities/upload.entity';
import { UsersService } from '../users/users.service';
import { UploadsService } from '../uploads/uploads.service';
import { PlanosService } from '../planos/planos.service';
import { NotificationsService } from '../notificacao/notificacao.service';

@Injectable()
export class MotoqueirosService {
  constructor(
    @InjectRepository(Deliver) private motoRepo: Repository<Deliver>,
    @InjectRepository(Veiculo) private veiculoRepo: Repository<Veiculo>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Upload) private uploadRepo: Repository<Upload>,
    private usersService: UsersService,
    private uploadsService: UploadsService,
    private planosService: PlanosService,
    private notifications: NotificationsService,
  ) {}

  async encontrarPorUsuario(userId: string): Promise<Deliver | null> {
    return this.motoRepo.findOne({ where: { userId } });
  }

  async encontrarPorUsuarioComUser(userId: string): Promise<Deliver | null> {
    return this.motoRepo.findOne({ where: { userId }, relations: ['user'] });
  }

  async completarPerfilMotoqueiro(
    userId: string,
    dados: {
      nome?: string;
      sobrenome?: string;
      email?: string;
      dataNascimento?: string;
      numeroBI?: string;
      numeroCarta?: string;
      validadeCarta?: string;
      morada?: string;
      marca: string;
      modelo: string;
      placa: string;
      corPrincipal: string;
      ano: number;
    },
  ) {
    // 1. Atualizar dados pessoais e documento no Utilizador
    const userUpdate: any = {};
    if (dados.nome) userUpdate.nome = dados.nome;
    if (dados.sobrenome) userUpdate.sobrenome = dados.sobrenome;
    if (dados.email) userUpdate.email = dados.email;
    if (dados.dataNascimento) {
      // Converter DD/MM/YYYY para Date
      const [day, month, year] = dados.dataNascimento.split('/');
      if (day && month && year) {
        userUpdate.dataNascimento = new Date(`${year}-${month}-${day}`);
      }
    }
    if (dados.numeroBI) {
      userUpdate.numeroDocumento = dados.numeroBI;
      userUpdate.tipoDocumento = 'BI';
    }
    if (Object.keys(userUpdate).length > 0) {
      await this.userRepo.update(userId, userUpdate);
    }

    // 2. Procura ou cria o registo de motoqueiro
    let motoqueiro = await this.motoRepo.findOne({ where: { userId } });

    if (!motoqueiro) {
      motoqueiro = this.motoRepo.create({
        userId,
        ...(dados.numeroCarta && { numeroCartaConducao: dados.numeroCarta }),
        ...(dados.validadeCarta && { validadeCartaConducao: new Date(dados.validadeCarta) }),
        status: DeliverStatus.PENDENTE,
      });
    } else {
      if (dados.numeroCarta) motoqueiro.numeroCartaConducao = dados.numeroCarta;
      if (dados.validadeCarta) motoqueiro.validadeCartaConducao = new Date(dados.validadeCarta);
    }

    motoqueiro = await this.motoRepo.save(motoqueiro);

    // 3. Atualizar role do user para 'deliver' e marcar como pendente até aprovação do admin
    await this.userRepo.update(userId, { role: UserRole.DELIVER, status: UserStatus.PENDING });

    // 4. Criar Veículo
    const matriculaFormatada = dados.placa.toUpperCase();
    const veiculoExiste = await this.veiculoRepo.findOne({
      where: { matricula: matriculaFormatada },
    });

    if (veiculoExiste && veiculoExiste.motoqueiroId !== motoqueiro.id) {
      throw new BadRequestException('Esta matrícula já está registada no sistema.');
    }

    if (!veiculoExiste) {
      const veiculo = this.veiculoRepo.create({
        motoqueiroId: motoqueiro.id,
        marca: dados.marca,
        modelo: dados.modelo,
        matricula: matriculaFormatada,
        cor: dados.corPrincipal,
        ano: dados.ano,
      });
      await this.veiculoRepo.save(veiculo);
    }

    // 5. Atribuir plano gratuito de 7 dias (trial) — logo no cadastro
    try {
      await this.planosService.atribuirPlanoGratuito(userId);
    } catch (e) {
      console.warn('[Motoqueiros] Falha ao atribuir plano gratuito no cadastro:', (e as Error).message);
    }

    return {
      message: 'Perfil e veículo registados.',
      motoqueiroId: motoqueiro.id,
    };
  }

  async buscarPorUserId(userId: string): Promise<Deliver> {
    const motoqueiro = await this.motoRepo.findOne({
      where: { userId },
      relations: ['user', 'veiculos'],
    });
    if (!motoqueiro) throw new NotFoundException('Perfil de motoqueiro não encontrado');
    return motoqueiro;
  }

  /**
   * Buscar documentos do motoqueiro.
   * Os documentos não têm status individual — o motoqueiro é aprovado como um todo.
   */
  async buscarMeusDocumentos(userId: string) {
    const uploads = await this.uploadRepo
      .createQueryBuilder('u')
      .where('u.userId = :userId', { userId })
      .andWhere('u.tipo IN (:...tipos)', {
        tipos: [
          'documento_bi_frente',
          'documento_bi_verso',
          'documento_carta_frente',
          'documento_carta_verso',
          'foto_veiculo',
          'foto_placa',
          'foto_perfil',
        ],
      })
      .select([
        'u.id',
        'u.tipo',
        'u.nomeOriginal',
        'u.mimeType',
        'u.tamanho',
        'u.criadoEm',
      ])
      .orderBy('u.criadoEm', 'DESC')
      .getMany();

    return uploads.map((u) => ({
      id: u.id,
      tipo: u.tipo,
      nomeOriginal: u.nomeOriginal,
      mimeType: u.mimeType,
      tamanho: u.tamanho,
      criadoEm: u.criadoEm,
    }));
  }

  async listarPendentesAprovacao() {
    return this.motoRepo.find({
      where: { status: DeliverStatus.PENDENTE },
      relations: ['user', 'veiculos'],
      order: { criadoEm: 'ASC' },
    });
  }

  /**
   * Ver detalhes completos do motoqueiro.
   * A verificação de documentos é por existência, não por status.
   */
  async verDetalhesCompletos(motoqueiroId: string) {
    const motoqueiro = await this.motoRepo.findOne({
      where: { id: motoqueiroId },
      relations: ['user', 'veiculos'],
    });
    if (!motoqueiro) throw new NotFoundException('Motoqueiro não encontrado');

    const uploads = await this.uploadRepo
      .createQueryBuilder('u')
      .where('u.userId = :userId', { userId: motoqueiro.userId })
      .select([
        'u.id',
        'u.tipo',
        'u.nomeOriginal',
        'u.mimeType',
        'u.tamanho',
        'u.criadoEm',
      ])
      .orderBy('u.criadoEm', 'DESC')
      .getMany();

    const temTodosDocumentos = await this.uploadsService.temTodosDocumentosObrigatorios(motoqueiro.userId);

    return {
      motoqueiro,
      uploads,
      temTodosDocumentos,
    };
  }

  /**
   * Aprovar motoqueiro.
   * Verifica se tem todos os documentos obrigatórios (por existência, não status).
   */
  async aprovar(motoqueiroId: string) {
    const motoqueiro = await this.motoRepo.findOne({
      where: { id: motoqueiroId },
      relations: ['user'],
    });
    if (!motoqueiro) throw new NotFoundException('Motoqueiro não encontrado');

    const temTodosDocumentos = await this.uploadsService.temTodosDocumentosObrigatorios(motoqueiro.userId);

    if (!temTodosDocumentos) {
      throw new BadRequestException(
        'Motoqueiro não tem todos os documentos obrigatórios.',
      );
    }

    motoqueiro.status = DeliverStatus.ACTIVO;
    motoqueiro.aprovadoEm = new Date();
    await this.motoRepo.save(motoqueiro);

    // Activar o user também
    await this.userRepo.update(motoqueiro.userId, { status: UserStatus.ACTIVE });

    // Atribuir plano gratuito de 7 dias (trial) — só após aprovação do admin
    try {
      await this.planosService.atribuirPlanoGratuito(motoqueiro.userId);
    } catch (e) {
      console.warn('[Motoqueiros] Falha ao atribuir plano gratuito na aprovação:', (e as Error).message);
    }

    // Notificar o motoqueiro que foi aprovado
    try {
      await this.notifications.criar(
        motoqueiro.userId,
        'aprovacao',
        'Conta Aprovada!',
        'Parabéns! A sua conta de entregador foi aprovada. Já pode começar a receber pedidos de entrega.',
        { tipo: 'aprovacao', accao: 'motoqueiro_aprovado' },
      );
    } catch (e) {
      console.warn('[Motoqueiros] Falha ao enviar notificação de aprovação:', (e as Error).message);
    }

    return { message: 'Motoqueiro aprovado' };
  }

  async rejeitar(motoqueiroId: string, motivo: string) {
    const motoqueiro = await this.motoRepo.findOne({
      where: { id: motoqueiroId },
    });
    if (!motoqueiro) throw new NotFoundException('Motoqueiro não encontrado');

    motoqueiro.status = DeliverStatus.SUSPENSO;
    motoqueiro.motivoRejeicao = motivo;
    await this.motoRepo.save(motoqueiro);

    await this.userRepo.update(motoqueiro.userId, {
      status: UserStatus.SUSPENDED,
    });

    return { message: 'Motoqueiro rejeitado' };
  }

  async atualizarStatus(
    userId: string,
    status: 'online' | 'offline' | 'ocupado',
  ) {
    const motoqueiro = await this.buscarPorUserId(userId);
    motoqueiro.statusDisponibilidade = status as DeliverDisponibilidade;
    return this.motoRepo.save(motoqueiro);
  }

  async atualizarLocalizacao(userId: string, latitude: number, longitude: number) {
    const motoqueiro = await this.buscarPorUserId(userId);
    motoqueiro.latitudeAtual = latitude;
    motoqueiro.longitudeAtual = longitude;
    motoqueiro.localizacaoAtualizadaEm = new Date();
    return this.motoRepo.save(motoqueiro);
  }

  async listarOnline() {
    return this.motoRepo.find({
      where: { statusDisponibilidade: DeliverDisponibilidade.ONLINE },
      relations: ['user'],
    });
  }
}
