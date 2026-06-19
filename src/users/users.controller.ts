import { Controller, Get, Patch, Delete, Post, Body, HttpCode, HttpStatus, UseInterceptors, UploadedFile, Res, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { Upload, TipoUpload } from '../uploads/entities/upload.entity';

@ApiTags('Utilizadores')
@ApiBearerAuth('firebase')
@Controller('users')
export class UsersController {
  constructor(
    private readonly service: UsersService,
    @InjectRepository(Upload) private uploadRepo: Repository<Upload>,
  ) {}

  @Get('perfil')
  meuPerfil(@CurrentUser() user: User) {
    // Excluir fotoPerfil (longblob) — é devolvido via GET /users/foto-perfil
    const { fotoPerfil, ...rest } = user as any;
    return rest;
  }

  @Patch('perfil')
  atualizarPerfil(@CurrentUser() user: User, @Body() body: any) {
    return this.service.atualizarPerfilBasico(user.id, body);
  }

  @Post('foto-perfil')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadFoto(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Ficheiro não foi enviado');
    await this.service.atualizar(user.id, { fotoPerfil: file.buffer } as any);
    return { message: 'Foto actualizada com sucesso' };
  }

  @Get('foto-perfil')
  async getFoto(@CurrentUser() user: User, @Res() res: Response) {
    const u = await this.service.buscarPorId(user.id);

    // 1. Verificar fotoPerfil (blob armazenado diretamente no user)
    if (u.fotoPerfil) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.send(Buffer.isBuffer(u.fotoPerfil) ? u.fotoPerfil : Buffer.from(u.fotoPerfil));
      return;
    }

    // 2. Verificar fotoPerfilUrl (URL externa do Google)
    if (u.fotoPerfilUrl) {
      return res.redirect(u.fotoPerfilUrl);
    }

    // 3. Fallback: verificar tabela uploads para foto_perfil
    const upload = await this.uploadRepo.findOne({
      where: { userId: user.id, tipo: TipoUpload.FOTO_PERFIL },
      select: ['ficheiro', 'mimeType'],
      order: { criadoEm: 'DESC' },
    });
    if (upload?.ficheiro) {
      res.setHeader('Content-Type', upload.mimeType || 'image/jpeg');
      res.send(Buffer.isBuffer(upload.ficheiro) ? upload.ficheiro : Buffer.from(upload.ficheiro));
      return;
    }

    return res.status(404).json({ message: 'Sem foto' });
  }

  @Delete('conta')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminarConta(@CurrentUser() user: User) {
    return this.service.eliminarConta(user.id);
  }
}