import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { DatabaseSyncService } from './database/database-sync.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Body parser — NÃO usar express.json/urlencoded aqui pois conflita com
  // multer (FileInterceptor) nos uploads. NestJS já tem body parser próprio.

  // Habilitar CORS
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Adicionar validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Sincronizar schema do banco de dados se necessário
  if (process.env.DB_SYNCHRONIZE === 'true') {
    try {
      logger.log('DB_SYNCHRONIZE detectado, sincronizando schema do banco...');
      const syncService = app.get(DatabaseSyncService);
      await syncService.safeSynchronize();
      logger.log('Schema sincronizado com sucesso');
    } catch (error) {
      logger.error('Erro ao sincronizar schema do banco:', error);
      // Não falhar a inicialização da aplicação se a sincronização falhar
      // Pois o schema pode já estar correto
      logger.warn('Continuando inicialização mesmo com erro de sincronização');
    }
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`Servidor iniciado em http://localhost:${port}`);

}
void bootstrap();
