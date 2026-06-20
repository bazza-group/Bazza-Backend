import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ScheduleModule } from '@nestjs/schedule';

// Firebase
import { FirebaseModule } from './firebase/firebase.module';

// Entities
import { User } from './users/entities/user.entity';
import { Deliver } from './motoqueiros/entities/motoqueiro.entity';
import { Veiculo } from './motoqueiros/entities/veiculo.entity';
import { Documento } from './motoqueiros/entities/documento.entity';
import { Pedido } from './pedidos/entities/pedido.entity';
import { Avaliacao } from './avaliacoes/entities/avaliacoe.entity';
import { Carteira } from './carteira/entities/carteira.entity';
import { Transacao } from './carteira/entities/transacao.entity';
import { Notificacao } from './notificacao/entities/notificacao.entity';
import { Upload } from './uploads/entities/upload.entity';
import { Suporte } from './suporte/entities/suporte.entity';
import { MensagemSuporte } from './suporte/entities/mensagem-suporte.entity';
import { RotaSalva } from './rotas/entities/rotas-salvas.entity';
import { MotoqueiroFavorito } from './rotas/entities/motoqueiros-favoritos.entity';

// Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MotoqueirosModule } from './motoqueiros/motoqueiros.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { CarteiraModule } from './carteira/carteira.module';
import { NotificacoesModule } from './notificacao/notificacao.module';
import { UploadsModule } from './uploads/uploads.module';
import { SuporteModule } from './suporte/suporte.module';
import { AvaliacoesModule } from './avaliacoes/avaliacoes.module';
import { RotasModule } from './rotas/rotas.module';
import { AdminModule } from './admin/admin.module';
import { GoogleMapsModule } from './google-maps/google-maps.module';
import { SmsModule } from './sms/sms/sms.module';

// Guards
import { FirebaseAuthGuard } from './auth/guards/firebase-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Reflector, APP_FILTER } from '@nestjs/core';
import { PlanosModule } from './planos/planos.module';
import { Plano } from './planos/entities/plano.entity';
import { ChatModule } from './chat/chat.module';
import { PreferenciasModule } from './preferencias/preferencias.module';
import { AdminLog } from './admin/entities/admin-log.entity';
import { Preferencia } from './preferencias/entities/preferencia.entity';
import { SeedModule } from './seeds/seed.module';
import { PrecificacaoModule } from './precificacao/precificacao.module';
import { PaymentsModule } from './payments/payments.module';
import { MensagemChat } from './chat/entities/mensagem.entity';
import { Denuncia } from './denuncias/entities/denuncia.entity';
import { DenunciasModule } from './denuncias/denuncias.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

@Module({
  imports: [
    // Config global
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),

    // Upload em memória (sem disco)
    MulterModule.register({ storage: memoryStorage() }),

    // Banco de dados
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'baza_db',
      entities: [
        User,
        Deliver,
        Veiculo,
        Documento,
        Pedido,
        Avaliacao,
        Carteira,
        Transacao,
        Notificacao,
        Upload,
        Suporte,
        MensagemSuporte,
        RotaSalva,
        MotoqueiroFavorito,
        Plano,
        AdminLog,
        Preferencia,
        MensagemChat,
        Denuncia,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: false,
      charset: 'utf8mb4',
    }),

    // Módulos da aplicação
    FirebaseModule,
    AuthModule,
    UsersModule,
    MotoqueirosModule,
    PedidosModule,
    CarteiraModule,
    NotificacoesModule,
    UploadsModule,
    SuporteModule,
    AvaliacoesModule,
    RotasModule,
    AdminModule,
    GoogleMapsModule,
    SmsModule,
    PlanosModule,
    ChatModule,
    PreferenciasModule,
    SeedModule,
    PrecificacaoModule,
    PaymentsModule,
    DenunciasModule,
  ],
  providers: [
    Reflector,
    {
      provide: APP_GUARD,
      useClass: FirebaseAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}