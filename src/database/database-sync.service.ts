import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Serviço para sincronizar o schema do banco de dados de forma segura.
 * Desabilita as constraints de chave estrangeira antes de fazer a coluna,
 * para evitar erros como: "Cannot change column 'id': used in a foreign key constraint"
 */
@Injectable()
export class DatabaseSyncService {
  private readonly logger = new Logger(DatabaseSyncService.name);

  constructor(private dataSource: DataSource) {}

  /**
   * Sincroniza o schema do banco de dados de forma segura,
   * desabilitando temporariamente as constraints de FK
   */
  async safeSynchronize(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      this.logger.log('Iniciando sincronização segura do schema...');

      // Desabilitar foreign key checks
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
      this.logger.log('Foreign key checks desabilitados');

      // Executar sincronização
      await this.dataSource.synchronize();
      this.logger.log('Schema sincronizado com sucesso');

      // Reabilitar foreign key checks
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
      this.logger.log('Foreign key checks reabilitados');
    } catch (error) {
      this.logger.error('Erro ao sincronizar o schema:', error);
      // Garantir que FK checks é reabilitado mesmo em caso de erro
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (e) {
        this.logger.error('Erro crítico ao reabilitar FK checks:', e);
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Desabilita as constraints de FK para executar migrações ou alterações estruturais
   */
  async disableForeignKeyChecks(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
      this.logger.log('Foreign key checks desabilitados');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reabilita as constraints de FK após executar migrações ou alterações estruturais
   */
  async enableForeignKeyChecks(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
      this.logger.log('Foreign key checks reabilitados');
    } finally {
      await queryRunner.release();
    }
  }
}
