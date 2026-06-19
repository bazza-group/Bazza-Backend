import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChatGateway } from './chat.gateway';

@ApiTags('Chat')
@ApiBearerAuth('firebase')
@Controller('chat')
export class ChatController {
  constructor(private readonly gateway: ChatGateway) {}

  @Get(':pedidoId')
  historico(@Param('pedidoId') pedidoId: string) {
    return this.gateway.getHistorico(pedidoId);
  }
}