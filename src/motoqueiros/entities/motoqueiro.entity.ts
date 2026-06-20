import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

export enum DeliverStatus {
  PENDENTE = 'pendente_aprovacao',
  ACTIVO = 'activo',
  SUSPENSO = 'suspenso',
}

export enum DeliverDisponibilidade {
  ONLINE = 'online',
  OFFLINE = 'offline',
  OCUPADO = 'ocupado',
}

@Entity('delivers')
export class Deliver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @OneToOne('User', (u: any) => u.deliver)
  @JoinColumn({ name: 'userId' })
  user: any;

  @Column({ nullable: true })
  numeroCartaConducao: string;

  @Column({ type: 'date', nullable: true })
  validadeCartaConducao: Date;

  @Column({ nullable: true })
  morada: string;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  latitudeAtual: number;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  longitudeAtual: number;

  @Column({ type: 'timestamp', nullable: true })
  localizacaoAtualizadaEm: Date;

  @Column({
    type: 'enum',
    enum: DeliverDisponibilidade,
    default: DeliverDisponibilidade.OFFLINE,
  })
  statusDisponibilidade: DeliverDisponibilidade;

  @Column({
    type: 'enum',
    enum: DeliverStatus,
    default: DeliverStatus.PENDENTE,
  })
  status: DeliverStatus;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  classificacaoMedia: number;

  @Column({ default: 0 })
  totalAvaliacoes: number;

  @Column({ nullable: true, type: 'timestamp' })
  aprovadoEm: Date;

  @Column({ nullable: true })
  motivoRejeicao: string;

  @CreateDateColumn()
  criadoEm: Date;

  @OneToMany('Veiculo', (v: any) => v.deliver, { eager: true })
  veiculos: any[];

  @OneToMany('Documento', (d: any) => d.deliver)
  documentos: any[];
}

// Alias para compatibilidade com código que usa "Motoqueiro"
export { Deliver as Motoqueiro };