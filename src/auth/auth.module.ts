import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { SmsModule } from '../sms/sms/sms.module';
import { PreferenciasModule } from '../preferencias/preferencias.module';

@Module({
  imports: [UsersModule, FirebaseModule, SmsModule, PreferenciasModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}