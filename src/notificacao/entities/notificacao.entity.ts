import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('notificacoes')
export class Notificacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne('User', (u: any) => u.notificacoes)
  @JoinColumn({ name: 'userId' })
  user: any;

  @Column()
  tipo: string;

  @Column()
  titulo: string;

  @Column({ type: 'text' })
  mensagem: string;

  @Column({ type: 'json', nullable: true })
  dados: Record<string, any>;

  @Column({ default: false })
  lida: boolean;

  @CreateDateColumn()
  criadoEm: Date;
}