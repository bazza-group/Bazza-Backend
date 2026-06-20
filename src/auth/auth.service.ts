import { Injectable, BadRequestException, ForbiddenException, Inject, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PreferenciasService } from '../preferencias/preferencias.service';
import { SmsService } from '../sms/sms/sms.service';
import * as admin from 'firebase-admin';
import * as jwt from 'jsonwebtoken';
import { FIREBASE_APP } from '../firebase/firebase.module';

const JWT_SECRET = process.env.JWT_SECRET || 'baza_admin_jwt_secret_2026';

interface OTPCache {
  codigo: string;
  tentativas: number;
  expiraEm: Date;
}
const otpStore = new Map<string, OTPCache>();

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly preferenciasService: PreferenciasService,
    private readonly smsService: SmsService,
    @Inject(FIREBASE_APP) private firebaseApp: admin.app.App,
  ) {}

  // ─── 1. ENVIAR OTP ────────────────────────────────────────────────────────
  async enviarOTP(telefone: string) {
    const tel = telefone.replace(/^\+244/, '').replace(/\s/g, '');
    if (!/^9\d{8}$/.test(tel)) {
      throw new BadRequestException('Número inválido. Formato: 9XXXXXXXX');
    }

    const codigo = Math.floor(1000 + Math.random() * 9000).toString();

    otpStore.set(tel, {
      codigo,
      tentativas: 5,
      expiraEm: new Date(Date.now() + 10 * 60 * 1000),
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const isHomologado = `+244${tel}` === '+244958651191';

    const mensagem = `O seu código de verificação Baza é: ${codigo}`;
    console.log(`[OTP] Para +244${tel}: ${codigo}`);

    if (isProduction || isHomologado) {
      // Disparar SMS em background — não bloquear a resposta ao cliente
      this.smsService.enviarSms(tel, mensagem).catch((err) => {
        console.error(`[OTP] Falha ao enviar SMS para +244${tel}:`, err.message);
      });
    } else {
      console.log(`[OTP][DEV] Mock mode — SMS não enviado`);
    }

    return {
      message: 'Código enviado por SMS',
      telefone: tel,
    };
  }

  // ─── 2. VERIFICAR OTP ─────────────────────────────────────────────────────
  async verificarOTP(telefone: string, codigo: string) {
    const tel = telefone.replace(/^\+244/, '').replace(/\s/g, '');
    const dados = otpStore.get(tel);

    if (!dados || dados.expiraEm < new Date()) {
      otpStore.delete(tel);
      throw new BadRequestException('Código expirado. Solicita um novo.');
    }
    if (dados.tentativas <= 0) {
      otpStore.delete(tel);
      throw new BadRequestException('Demasiadas tentativas. Solicita um novo código.');
    }
    if (dados.codigo !== codigo) {
      dados.tentativas--;
      throw new BadRequestException(`Código incorreto. Restam ${dados.tentativas} tentativas.`);
    }
    otpStore.delete(tel);

    // Procura ou cria utilizador
    let user = await this.usersService.findByPhone(tel);
    if (!user) {
      user = await this.usersService.criar({
        firebaseUid: `phone_${tel}_${Date.now()}`,
        telefone: tel,
        telefoneVerificado: true,
        status: 'pending' as any,
      });
    }
    if (!user) throw new BadRequestException('Erro ao processar utilizador');

    // Bloquear administradores de usar a app mobile
    if (user.role === 'admin') {
      throw new ForbiddenException('Esta conta é de administrador. Usa o painel web para aceder.');
    }

    // User eliminado — permitir re-registo como novo user (limpar dados pessoais)
    if (user.status === 'eliminado') {
      await this.usersService.atualizar(user.id, {
        status: 'pending' as any,
        role: 'client' as any,
        telefone: tel,
        telefoneVerificado: true,
        nome: null as any,
        sobrenome: null as any,
        email: null as any,
        dataNascimento: null as any,
        numeroDocumento: null as any,
        fotoPerfil: null as any,
        fotoPerfilUrl: null as any,
        planoAtivo: null as any,
        planoExpiraEm: null as any,
      } as any);
      user = await this.usersService.buscarPorId(user.id);
    }

    // Bloquear utilizadores suspensos
    if (user.status === 'suspended') {
      throw new ForbiddenException('Esta conta está suspensa. Contacta o suporte para mais informações.');
    }

    // IMPORTANTE: Actualizar firebaseUid para o UUID do user
    // Isto é necessário porque o custom token é criado com user.id (UUID)
    // e o FirebaseAuthGuard procura por firebaseUid = decoded.uid
    if (!user.firebaseUid || user.firebaseUid !== user.id) {
      try {
        await this.usersService.atualizar(user.id, { firebaseUid: user.id } as any);
        user.firebaseUid = user.id;
      } catch (e) {
        console.error('[verificarOTP] Falha ao sincronizar firebaseUid:', (e as Error).message);
        throw new BadRequestException('Erro ao sincronizar conta. Tenta novamente.');
      }
    }

    // Gerar JWT para autenticação nas requests seguintes
    const token = jwt.sign(
      { userId: user.id, role: user.role || 'client' },
      JWT_SECRET,
      { expiresIn: '30d' },
    );

    const profileComplete = user.status === 'active' && !!user.nome;

    return {
      message: 'Autenticado com sucesso',
      isNewUser: !user.nome,
      profileComplete,
      user,
      token,
    };
  }

  // ─── 2b. ADMIN LOGIN ──────────────────────────────────────────────────────
  async adminLogin(telefone: string) {
    const tel = telefone.replace(/^\+244/, '').replace(/\s/g, '');
    if (!/^9\d{8}$/.test(tel)) {
      throw new BadRequestException('Número inválido. Formato: 9XXXXXXXX');
    }

    let user = await this.usersService.findByPhone(tel);
    if (!user) {
      user = await this.usersService.criar({
        firebaseUid: `admin_${tel}_${Date.now()}`,
        telefone: tel,
        telefoneVerificado: true,
        nome: 'Admin',
        sobrenome: 'Bazza',
      });
    }

    // Bloquear utilizadores eliminados
    if (user.status === 'eliminado') {
      throw new ForbiddenException('Esta conta foi eliminada.');
    }

    // Garantir que o user tem role admin
    if (user.role !== 'admin') {
      await this.usersService.atualizar(user.id, { role: 'admin' as any });
      user.role = 'admin' as any;
    }

    // Gerar JWT token para o admin panel
    const token = jwt.sign(
      { userId: user.id, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    return {
      message: 'Login admin bem-sucedido',
      user,
      token,
    };
  }

  // ─── 3. GOOGLE ────────────────────────────────────────────────────────────
  async loginGoogle(data: { uid: string; email?: string; displayName?: string; photoURL?: string }) {
    // Procura por firebaseUid primeiro, depois por email (utilizadores que se registaram por telefone)
    let user = await this.usersService.findOneByFirebaseUid(data.uid);
    if (!user && data.email) {
      user = await this.usersService.findByEmail(data.email);
      // Se encontrou por email mas o firebaseUid é diferente, atualizar para o Google UID
      if (user && user.firebaseUid !== data.uid) {
        await this.usersService.atualizar(user.id, { firebaseUid: data.uid } as any);
        user.firebaseUid = data.uid;
      }
    }
    const isNewUser = !user;

    if (!user) {
      const partes = (data.displayName || '').trim().split(' ');
      try {
        user = await this.usersService.criar({
          firebaseUid: data.uid,
          email: data.email,
          nome: partes[0] || 'Utilizador',
          sobrenome: partes.slice(1).join(' ') || '',
          fotoPerfil: data.photoURL || undefined,
          status: 'pending' as any,
        });
      } catch (e) {
        // Race condition: outro dispositivo criou o utilizador ao mesmo tempo
        // Tentar encontrar novamente em vez de falhar
        user = await this.usersService.findOneByFirebaseUid(data.uid);
        if (!user) {
          throw e; // Se realmente não existe, propagar o erro original
        }
      }
    } else {
      // User eliminado — permitir re-registo como novo user (limpar dados pessoais)
      if (user.status === 'eliminado') {
        await this.usersService.atualizar(user.id, {
          status: 'pending' as any,
          role: 'client' as any,
          nome: null as any,
          sobrenome: null as any,
          email: null as any,
          dataNascimento: null as any,
          numeroDocumento: null as any,
          fotoPerfil: null as any,
          fotoPerfilUrl: null as any,
          telefone: null as any,
          telefoneVerificado: false,
          planoAtivo: null as any,
          planoExpiraEm: null as any,
        } as any);
        user = await this.usersService.findOneByFirebaseUid(data.uid);
        const tokenReactivacao = jwt.sign(
          { userId: user!.id, role: user!.role || 'client' },
          JWT_SECRET,
          { expiresIn: '30d' },
        );
        return { message: 'Conta reactivada', isNewUser: true, user, token: tokenReactivacao };
      }
      // Bloquear utilizadores suspensos
      if (user.status === 'suspended') {
        throw new ForbiddenException('Esta conta está suspensa. Contacta o suporte para mais informações.');
      }
      // Actualiza foto se não tiver
      if (data.photoURL && !user.fotoPerfil) {
        await this.usersService.atualizar(user.id, { fotoPerfilUrl: data.photoURL } as any);
      }
    }

    const profileComplete = user.status === 'active' && !!user.telefone;

    // Gerar JWT para autenticação nas requests seguintes
    const token = jwt.sign(
      { userId: user.id, role: user.role || 'client' },
      JWT_SECRET,
      { expiresIn: '30d' },
    );

    return {
      message: 'Autenticado com Google',
      isNewUser: isNewUser || !user.telefone,
      profileComplete,
      user,
      token,
    };
  }

  // ─── 4. SINCRONIZAR FIREBASE TOKEN (para validar idToken do frontend) ─────
  async sincronizarFirebaseToken(idToken: string) {
    try {
      const decoded = await admin.auth(this.firebaseApp).verifyIdToken(idToken);
      const user = await this.usersService.encontrarOuCriar(decoded);
      return { message: 'Token válido', isNewUser: !user.nome, user };
    } catch {
      throw new UnauthorizedException('Token Firebase inválido');
    }
  }

  // ─── 5. PERFIL ────────────────────────────────────────────────────────────
  async atualizarPerfil(userId: string, dados: {
    nome?: string; sobrenome?: string; dataNascimento?: string;
    email?: string; telefone?: string;
  }) {
    const update: any = { ...dados };
    if (dados.dataNascimento) update.dataNascimento = new Date(dados.dataNascimento);
    const user = await this.usersService.atualizar(userId, update);
    return { message: 'Perfil actualizado', user };
  }

  // ─── 5b. COMPLETAR PERFIL ────────────────────────────────────────────────
  async completeProfile(userId: string, dados: {
    nome?: string; sobrenome?: string; telefone?: string;
    role?: 'client' | 'deliver';
  }) {
    const update: any = { ...dados };
    // Deliver NUNCA fica active aqui — precisa de aprovação do admin primeiro
    // Só activar o user se tiver telefone, nome, E NÃO for deliver
    if (dados.nome && dados.telefone && dados.role !== 'deliver') {
      update.status = 'active';
    }
    const user = await this.usersService.atualizar(userId, update);
    return { message: 'Perfil completado', user, profileComplete: user.status === 'active' };
  }

  // ─── 6. ROLE ──────────────────────────────────────────────────────────────
  async escolherRole(userId: string, role: 'cliente' | 'motoqueiro') {
    const dbRole = role === 'cliente' ? 'client' : 'deliver';
    const update: any = { role: dbRole };
    // Se escolheu deliver, verificar se auto-aprovação está ativa
    if (dbRole === 'deliver') {
      const autoAprovacao = await this.verificarAutoAprovacao();
      if (!autoAprovacao) {
        update.status = 'pending';
      }
    }
    const user = await this.usersService.atualizar(userId, update);
    return { message: `Role: ${role}`, user };
  }

  private async verificarAutoAprovacao(): Promise<boolean> {
    try {
      // Buscar o admin para ler as preferências
      const adminUser = await this.usersService.encontrarPorRole('admin');
      if (!adminUser) return false;
      const prefs = await this.preferenciasService.obterPorUsuario(adminUser.id);
      return prefs?.autoAprovacao ?? false;
    } catch {
      return false;
    }
  }

  // ─── 7. FCM ───────────────────────────────────────────────────────────────
  async atualizarFcmToken(userId: string, fcmToken: string) {
    await this.usersService.atualizar(userId, { fcmToken } as any);
    return { message: 'Token FCM actualizado' };
  }
}