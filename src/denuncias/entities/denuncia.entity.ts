import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

export enum TipoDenuncia {
  CLIENTE = 'cliente',
  MOTOQUEIRO = 'motoqueiro',
}

export enum StatusDenuncia {
  PENDENTE = 'pendente',
  EM_ANALISE = 'em_analise',
  RESOLVIDA = 'resolvida',
  ARQUIVADA = 'arquivada',
}

@Entity('denuncias')
export class Denuncia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pedidoId: string;

  @Column()
  autorId: string;

  @Column()
  denunciadoId: string;

  @Column({ type: 'enum', enum: TipoDenuncia })
  tipo: TipoDenuncia;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ type: 'simple-array', nullable: true })
  motivos: string[];

  @Column({
    type: 'enum',
    enum: StatusDenuncia,
    default: StatusDenuncia.PENDENTE,
  })
  status: StatusDenuncia;

  @Column({ nullable: true })
  resolvidoPor: string;

  @Column({ nullable: true, type: 'text' })
  resolucaoNota: string;

  @Column({ nullable: true, type: 'timestamp' })
  resolvidoEm: Date;

  @CreateDateColumn()
  criadoEm: Date;

  // Relations
  @ManyToOne('Pedido', { nullable: true })
  @JoinColumn({ name: 'pedidoId' })
  pedido: any;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'autorId' })
  autor: any;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'denunciadoId' })
  denunciado: any;
}
