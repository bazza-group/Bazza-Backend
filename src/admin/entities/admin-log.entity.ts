import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('admin_logs')
export class AdminLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  adminId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'adminId' })
  admin!: User;

  @Column()
  acao!: string;

  @Column({ type: 'text', nullable: true })
  detalhes!: string;

  @CreateDateColumn()
  criadoEm!: Date;
}