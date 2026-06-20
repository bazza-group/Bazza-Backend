import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('avaliacoes')
export class Avaliacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pedidoId: string;

  @ManyToOne('Pedido', (p: any) => p.avaliacoes)
  @JoinColumn({ name: 'pedidoId' })
  pedido: any;

  @Column()
  autorId: string;

  @ManyToOne('User', { eager: false })
  @JoinColumn({ name: 'autorId' })
  autor: any;

  @Column()
  avaliadoId: string;

  @ManyToOne('User', { eager: false })
  @JoinColumn({ name: 'avaliadoId' })
  avaliado: any;

  @Column('tinyint')
  rating: number; // 1-5

  @Column({ nullable: true, type: 'text' })
  comentario: string;

  @CreateDateColumn()
  criadoEm: Date;
}