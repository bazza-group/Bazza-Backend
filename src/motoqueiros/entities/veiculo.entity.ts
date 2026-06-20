import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('veiculos')
export class Veiculo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  motoqueiroId: string;

  @ManyToOne('Deliver', (d: any) => d.veiculos)
  @JoinColumn({ name: 'motoqueiroId' })
  deliver: any;

  @Column()
  marca: string;

  @Column()
  modelo: string;

  @Column({ unique: true })
  matricula: string;

  @Column()
  cor: string;

  @Column({ nullable: true })
  ano: number;

  @Column({ default: true })
  ativo: boolean;
}