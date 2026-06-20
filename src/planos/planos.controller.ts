import { Controller, Post, Get, Patch, Param, Body, Query, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PlanosService } from './planos.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { TipoPlano } from './entities/plano.entity';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/guards/roles.guard';

@ApiTags('Planos')
@ApiBearerAuth('firebase')
@Controller('planos')
export class PlanosController {
  constructor(private readonly service: PlanosService) {}

  @Post('submeter')
  @UseInterceptors(FileInterceptor('comprovativo', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  submeter(
    @CurrentUser() user: User,
    @Body('tipo') tipo: TipoPlano,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.submeterComprovativo(user.id, tipo, file);
  }

  @Get('meus')
  meus(@CurrentUser() user: User) {
    return this.service.listarMeus(user.id);
  }

  @Get('ativo')
  ativo(@CurrentUser() user: User) {
    return this.service.planoAtivo(user.id);
  }

  @Get('pode-aceitar')
  async podeAceitar(@CurrentUser() user: User) {
    const pode = await this.service.podeAceitarEntregas(user.id);
    return { podeAceitar: pode };
  }

  @Get(':id/comprovativo')
  async comprovativo(@Param('id') id: string, @Res() res: Response) {
    const { buffer, mime } = await this.service.obterComprovativo(id);
    res.setHeader('Content-Type', mime);
    res.send(buffer);
  }

  // Admin
  @Patch(':id/aprovar')
  @Roles('admin')
  aprovar(@Param('id') id: string) {
    return this.service.aprovar(id);
  }

  @Patch(':id/rejeitar')
  @Roles('admin')
  rejeitar(@Param('id') id: string, @Body('motivo') motivo: string) {
    return this.service.rejeitar(id, motivo);
  }

  @Get('admin/todos')
  @Roles('admin')
  todos(@Query('tipo') tipo?: string, @Query('status') status?: string, @Query('search') search?: string) {
    return this.service.listarTodos({ tipo, status, search });
  }

  @Get('admin/estatisticas')
  @Roles('admin')
  estatisticas() {
    return this.service.obterEstatisticas();
  }
}