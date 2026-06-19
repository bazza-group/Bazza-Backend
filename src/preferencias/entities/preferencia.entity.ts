import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, OneToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('preferencias')
export class Preferencia {
  @PrimaryGeneratedColumn('uuid') id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column() userId: string;

  @Column({ default: true }) notificacoesPush: boolean;

  @Column({ default: true }) som: boolean;

  @Column({ default: 'pt' }) idioma: string;

  @Column({ default: 'dark' }) tema: string;

  @Column({ default: false }) autoAprovacao: boolean;

  @CreateDateColumn() criadoEm: Date;

  @UpdateDateColumn() atualizadoEm: Date;
}
