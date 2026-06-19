// src/auth/auth.controller.ts
import { Controller, Post, Get, Patch, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── OTP ──────────────────────────────────────────────────────────────────
  @Public()
  @Post('telefone/enviar-otp')
  @ApiOperation({ summary: 'Envia OTP por SMS (backend simples)' })
  enviarOTP(@Body('telefone') telefone: string) {
    return this.authService.enviarOTP(telefone);
  }

  @Public()
  @Post('telefone/verificar-otp')
  @ApiOperation({ summary: 'Verifica OTP e retorna utilizador' })
  verificarOTP(@Body() body: { telefone: string; codigo: string }) {
    return this.authService.verificarOTP(body.telefone, body.codigo);
  }

  // ── Admin Login (dev) ────────────────────────────────────────────────────
  @Public()
  @Post('admin-login')
  @ApiOperation({ summary: 'Login de admin para painel (dev)' })
  adminLogin(@Body('telefone') telefone: string) {
    return this.authService.adminLogin(telefone);
  }

  // ── Google ────────────────────────────────────────────────────────────────
  @Public()
  @Post('google')
  @ApiOperation({ summary: 'Login/Registo com Google' })
  loginGoogle(@Body() body: { uid: string; email?: string; displayName?: string; photoURL?: string }) {
    return this.authService.loginGoogle(body);
  }

  // ── Firebase token sync ───────────────────────────────────────────────────
  @Public()
  @Post('firebase/sincronizar')
  @ApiOperation({ summary: 'Sincroniza com Firebase ID token' })
  sincronizarFirebase(@Body('idToken') idToken: string) {
    return this.authService.sincronizarFirebaseToken(idToken);
  }

  // ── Perfil ────────────────────────────────────────────────────────────────
  @ApiBearerAuth('firebase')
  @Get('perfil')
  perfil(@CurrentUser() user: User) {
    return user;
  }

  @ApiBearerAuth('firebase')
  @Patch('perfil')
  atualizarPerfil(@CurrentUser() user: User, @Body() body: any) {
    return this.authService.atualizarPerfil(user.id, body);
  }

  @ApiBearerAuth('firebase')
  @Post('complete-profile')
  @ApiOperation({ summary: 'Completar perfil e activar conta' })
  completeProfile(
    @CurrentUser() user: User,
    @Body() body: { nome?: string; sobrenome?: string; telefone?: string; role?: 'client' | 'deliver' },
  ) {
    return this.authService.completeProfile(user.id, body);
  }

  @ApiBearerAuth('firebase')
  @Patch('escolher-role')
  escolherRole(@CurrentUser() user: User, @Body('role') role: 'cliente' | 'motoqueiro') {
    return this.authService.escolherRole(user.id, role);
  }

  @ApiBearerAuth('firebase')
  @Patch('fcm-token')
  atualizarFcmToken(@CurrentUser() user: User, @Body('fcmToken') fcmToken: string) {
    return this.authService.atualizarFcmToken(user.id, fcmToken);
  }
}