import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('rotas_salvas')
export class RotaSalva {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 100 })
  nome: string; // Ex: "Casa → Trabalho"

  @Column()
  origemEndereco: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  origemLatitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  origemLongitude: number;

  @Column({ nullable: true })
  origemInstrucoes: string;

  @Column()
  destinoEndereco: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  destinoLatitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  destinoLongitude: number;

  @Column({ nullable: true })
  destinoInstrucoes: string;

  // Motoqueiro preferido para esta rota
  @Column({ nullable: true })
  motoqueiroPreferdoId: string;

  @Column({ default: 0 })
  vezesUsada: number;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}

