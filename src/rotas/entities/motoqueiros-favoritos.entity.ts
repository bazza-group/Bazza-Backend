import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('motoqueiros_favoritos')
@Unique(['clienteId', 'motoqueiroId'])
export class MotoqueiroFavorito {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clienteId: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clienteId' })
  cliente: any;

  @Column()
  motoqueiroId: string;

  @ManyToOne('Deliver', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'motoqueiroId' })
  motoqueiro: any;

  @Column({ nullable: true })
  alcunha: string;

  @Column({ default: 0 })
  totalEntregasJuntos: number;

  @CreateDateColumn()
  criadoEm: Date;
}