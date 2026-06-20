import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('suportes')
export class Suporte {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 150 })
  assunto: string;

  @Column({ type: 'text' })
  mensagem: string;

  @Column({
    type: 'enum',
    enum: ['aberto', 'em_analise', 'resolvido', 'fechado', 'eliminado'],
    default: 'aberto',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  resposta: string;

  @Column({ nullable: true })
  respondidoPor: string; // userId do admin

  @CreateDateColumn()
  criadoEm: Date;

  @Column({ nullable: true })
  resolvidoEm: Date;
}
