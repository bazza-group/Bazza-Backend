import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('documentos_motoqueiro')
export class Documento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  motoqueiroId: string;

  @ManyToOne('Deliver', (d: any) => d.documentos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'motoqueiroId' })
  deliver: any;

  @Column({
    type: 'enum',
    enum: [
      'bi_frente',
      'bi_verso',
      'carta_conducao_frente',
      'carta_conducao_verso',
      'foto_veiculo',
    ],
  })
  tipo: string;

  @Column()
  arquivoUrl: string;

  @Column({
    type: 'enum',
    enum: ['pendente', 'aprovado', 'rejeitado'],
    default: 'pendente',
  })
  status: string;

  @Column({ nullable: true })
  motivoRejeicao: string;

  @CreateDateColumn()
  criadoEm: Date;
}