import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('precificacoes')
export class Precificacao {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valorTotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  distanciaKm!: number;

  @Column({ type: 'int' })
  tempoMinutos!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  taxaBaseUtilizada!: number;

  @CreateDateColumn()
  criadoEm!: Date;
}