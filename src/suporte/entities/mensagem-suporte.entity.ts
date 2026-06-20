import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Suporte } from './suporte.entity';

@Entity('mensagens_suporte')
export class MensagemSuporte {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ticketId: string;

  @ManyToOne(() => Suporte, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Suporte;

  @Column()
  remetenteId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'remetenteId' })
  remetente: User;

  @Column({
    type: 'enum',
    enum: ['cliente', 'admin'],
  })
  remetenteTipo: string;

  @Column({ type: 'text' })
  texto: string;

  @Column({ default: false })
  lida: boolean;

  @CreateDateColumn()
  criadoEm: Date;
}
