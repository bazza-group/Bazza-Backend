import { Module, Global, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

export const FIREBASE_APP = 'FIREBASE_APP';

@Global()
@Module({
  providers: [
    {
      provide: FIREBASE_APP,
      useFactory: () => {
        // Evita erro de "App already exists" caso recarregue
        if (admin.apps.length > 0) return admin.apps[0];

        const logger = new Logger('Firebase');

        try {
          // O replace corrige as quebras de linha (\n) lidas do .env
          const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

          const app = admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: privateKey,
            }),
          });

          logger.log('✅ Firebase inicializado com sucesso via .env');
          return app;
        } catch (error: any) {
          logger.error(`❌ Erro ao inicializar Firebase: ${error.message}`);
          throw error;
        }
      },
    },
  ],
  exports: [FIREBASE_APP],
})
export class FirebaseModule {}