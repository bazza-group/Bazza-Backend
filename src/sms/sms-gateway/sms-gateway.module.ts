import { Module } from '@nestjs/common';
import { SmsGatewayService } from './sms-gateway.service';

@Module({
  providers: [SmsGatewayService],
  exports: [SmsGatewayService],
})
export class SmsGatewayModule {}
