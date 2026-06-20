import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Upload } from './entities/upload.entity';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Upload]),
    MulterModule.register({ storage: memoryStorage() }),
    ChatModule,
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
