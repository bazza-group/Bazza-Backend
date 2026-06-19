import {
  Entity, Column, PrimaryGeneratedColumn, ManyToOne,
  OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum StatusPedido {
  A_PROCURAR_MOTOQUEIRO = 'a_procurar_motoqueiro',
  MOTOQUEIRO_ATRIBUIDO  = 'motoqueiro_atribuido',
  A_CAMINHO_RECOLHA     = 'a_caminho_recolha',
  EM_PAUSA              = 'em_pausa',
  RECOLHIDO             = 'recolhido',
  ENTREGANDO            = 'entregando',
  ENTREGUE              = 'entregue',
  CANCELADO             = 'cancelado',
}

export enum TipoPagamento {
  NUMERARIO   = 'numerario',
  CARTEIRA    = 'carteira',
  STRIPE      = 'stripe',
}

@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn('uuid')              id: string;
  @Column()                                    numeroPedido: string;
  @Column()                                    clienteId: string;
  @Column({ nullable: true })                  motoqueiroId: string;

  // Localização
  @Column('decimal', { precision: 10, scale: 8 }) origemLatitude: number;
  @Column('decimal', { precision: 10, scale: 8 }) origemLongitude: number;
  @Column()                                        origemEndereco: string;
  @Column({ nullable: true })                      origemInstrucoes: string;
  @Column('decimal', { precision: 10, scale: 8 }) destinoLatitude: number;
  @Column('decimal', { precision: 10, scale: 8 }) destinoLongitude: number;
  @Column()                                        destinoEndereco: string;
  @Column({ nullable: true })                      destinoInstrucoes: string;

  // Encomenda
  @Column('decimal', { precision: 10, scale: 2 }) distanciaKm: number;
  @Column({ default: 'documento' })               tipo: string;
  @Column({ nullable: true })                     descricaoEncomenda: string;
  @Column({ default: false })                     fragil: boolean;

  // Preço e pagamento
  @Column('decimal', { precision: 10, scale: 2 })        valorEntrega: number;
  @Column({ type: 'enum', enum: TipoPagamento, default: TipoPagamento.NUMERARIO }) tipoPagamento: TipoPagamento;

  // QR / Código de confirmação
  @Column({ nullable: true })  codigoQr: string;
  @Column({ nullable: true })  codigoNumerico: string;
  @Column({ default: false })  codigoConfirmado: boolean;
  @Column({ nullable: true, type: 'timestamp' }) codigoConfirmadoEm: Date;

  // Status
  @Column({ type: 'enum', enum: StatusPedido, default: StatusPedido.A_PROCURAR_MOTOQUEIRO })
  status: StatusPedido;

  // Timestamps de transição
  @Column({ nullable: true, type: 'timestamp' }) atribuidoEm: Date;
  @Column({ nullable: true, type: 'timestamp' }) recolhidoEm: Date;
  @Column({ nullable: true, type: 'timestamp' }) entregueEm: Date;
  @Column({ nullable: true, type: 'timestamp' }) canceladoEm: Date;
  @Column({ nullable: true })                    motivoCancelamento: string;

  @CreateDateColumn() criadoEm: Date;
  @UpdateDateColumn() atualizadoEm: Date;

  // Relations
  @ManyToOne('User', (u: any) => u.pedidosCliente)
  @JoinColumn({ name: 'clienteId' })
  cliente: any;

  @ManyToOne('Deliver', { nullable: true })
  @JoinColumn({ name: 'motoqueiroId' })
  motoqueiro: any;

  @OneToMany('Avaliacao', (a: any) => a.pedido)
  avaliacoes: any[];
}