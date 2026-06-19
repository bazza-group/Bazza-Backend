import { PartialType } from '@nestjs/swagger';
import { CriarPedidoDto } from './create-pedido.dto';

export class AtualizarPedidoDto extends PartialType(CriarPedidoDto) {}