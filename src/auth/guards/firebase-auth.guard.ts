import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as admin from 'firebase-admin';
import * as jwt from 'jsonwebtoken';
import { UsersService } from '../../users/users.service';

export const IS_PUBLIC_KEY = 'isPublic';
const JWT_SECRET = process.env.JWT_SECRET || 'baza_admin_jwt_secret_2026';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private usersService: UsersService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verifica se a rota é pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token não fornecido');
    }

    const token = authHeader.replace('Bearer ', '');

    // Verificar JWT (gerado pelo backend no login OTP, Google, e admin)
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
      const user = await this.usersService.buscarPorId(decoded.userId);
      if (user) {
        // Bloquear utilizadores eliminados ou suspensos
        if (user.status === 'eliminado') {
          throw new ForbiddenException('Esta conta foi eliminada.');
        }
        if (user.status === 'suspended') {
          throw new ForbiddenException('Esta conta está suspensa.');
        }
        request.user = user;
        return true;
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      // Não é JWT válido — tentar como Firebase token abaixo
    }

    // Suporte retroativo a tokens admin legados (formato: admin_token_<userId>)
    if (token.startsWith('admin_token_')) {
      const userId = token.replace('admin_token_', '');
      try {
        const user = await this.usersService.buscarPorId(userId);
        if (user && user.role === 'admin') {
          request.user = user;
          return true;
        }
      } catch {}
      throw new UnauthorizedException('Token de admin inválido');
    }

    try {
      const decoded = await admin.auth().verifyIdToken(token);

      // Carrega o user completo da BD (sem criar duplicados)
      const user = await this.usersService.encontrarPorFirebaseUid(decoded.uid);
      if (!user) {
        throw new UnauthorizedException('Utilizador não encontrado na base de dados');
      }

      // Bloquear utilizadores eliminados ou suspensos
      if (user.status === 'eliminado') {
        throw new ForbiddenException('Esta conta foi eliminada.');
      }
      if (user.status === 'suspended') {
        throw new ForbiddenException('Esta conta está suspensa.');
      }

      request.user = user;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Token Firebase inválido ou expirado');
    }
  }
}