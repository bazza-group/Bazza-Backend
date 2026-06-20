import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('carteiras')
export class Carteira {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @OneToOne('User', (u: any) => u.carteira)
  @JoinColumn({ name: 'userId' })
  user: any;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  saldo: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  saldoPendente: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalGanho: number;

  @CreateDateColumn()
  criadoEm: Date;

  @OneToMany('Transacao', (t: any) => t.carteira)
  transacoes: any[];
}