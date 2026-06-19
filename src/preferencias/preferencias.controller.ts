import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PreferenciasService } from './preferencias.service';
import { UpdatePreferenciaDto } from './dto/update-preferencia.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Preferências')
@ApiBearerAuth()
@Controller('preferencias')
export class PreferenciasController {
  constructor(private readonly service: PreferenciasService) {}

  @Get()
  @ApiOperation({ summary: 'Obter preferências do utilizador autenticado' })
  obter(@CurrentUser() user: any) {
    return this.service.obterPorUsuario(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Atualizar preferências do utilizador autenticado' })
  atualizar(@CurrentUser() user: any, @Body() dto: UpdatePreferenciaDto) {
    return this.service.atualizar(user.id, dto);
  }
}
