import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Pagamentos')
@ApiBearerAuth('firebase')
@Controller('payments')
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Post('criar-intent')
  async criarIntent(
    @CurrentUser() user: User,
    @Body() body: { valor: number; pedidoId: string },
  ) {
    return this.service.criarPaymentIntent(
      body.valor * 100, // converter para centimos
      user.email,
      body.pedidoId,
    );
  }
}