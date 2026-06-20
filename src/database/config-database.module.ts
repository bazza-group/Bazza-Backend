import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseSyncService } from './database-sync.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
    }),
  ],
  providers: [DatabaseSyncService],
  exports: [ConfigModule, DatabaseSyncService],
})
export class ConfigDatabaseModule {}
