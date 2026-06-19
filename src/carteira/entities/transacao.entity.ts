import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

export enum TipoTransacao {
  CREDITO = 'credito',
  DEBITO = 'debito',
}

@Entity('transacoes')
export class Transacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  carteiraId: string;

  @ManyToOne('Carteira', (c: any) => c.transacoes)
  @JoinColumn({ name: 'carteiraId' })
  carteira: any;

  @Column({ type: 'enum', enum: TipoTransacao })
  tipo: TipoTransacao;

  @Column('decimal', { precision: 15, scale: 2 })
  valor: number;

  @Column({ nullable: true })
  descricao: string;

  @Column({ nullable: true })
  pedidoId: string;

  @CreateDateColumn()
  criadoEm: Date;
}