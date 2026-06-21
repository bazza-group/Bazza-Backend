import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum StatusPlano {
  PENDENTE = 'pendente',
  ATIVO = 'ativo',
  REJEITADO = 'rejeitado',
  EXPIRADO = 'expirado',
}

export enum TipoPlano {
  GRATUITO = 'gratuito',
  DIARIO = 'diario',
  SEMANAL = 'semanal',
  MENSAL = 'mensal',
}

@Entity('planos')
export class Plano {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'userId' })
  user: any;

  @Column({ type: 'enum', enum: TipoPlano, enumName: 'tipo_plano_enum' })
  tipo: TipoPlano;

  @Column({ type: 'enum', enum: StatusPlano, enumName: 'status_plano_enum', default: StatusPlano.PENDENTE })
  status: StatusPlano;

  @Column('decimal', { precision: 10, scale: 2 })
  valor: number;

  @Column({ type: 'bytea', nullable: true })
  comprovativo: Buffer;

  @Column({ nullable: true })
  comprovativoMime: string;

  @Column({ nullable: true, type: 'timestamp' })
  ativoEm: Date;

  @Column({ nullable: true, type: 'timestamp' })
  expiraEm: Date;

  @Column({ nullable: true })
  motivoRejeicao: string;

  @CreateDateColumn()
  criadoEm: Date;
}