import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, OneToOne, OneToMany, DeleteDateColumn,
} from 'typeorm';

export enum UserRole {
  CLIENT = 'client',
  DELIVER = 'deliver',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  ELIMINADO = 'eliminado',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true, nullable: true }) firebaseUid: string;
  @Column({ unique: true, nullable: true }) telefone: string;
  @Column({ default: false }) telefoneVerificado: boolean;
  @Column({ nullable: true }) nome: string;
  @Column({ nullable: true }) sobrenome: string;
  @Column({ unique: true, nullable: true }) email: string;
  @Column({ nullable: true, type: 'date' }) dataNascimento: Date;
  @Column({ nullable: true }) numeroDocumento: string;
  @Column({ default: 'BI', nullable: true }) tipoDocumento: string;
  @Column({ nullable: true, type: 'longblob' }) fotoPerfil: Buffer;
  @Column({ nullable: true }) fotoPerfilUrl: string; // URL externa (Google)
  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT }) role: UserRole;
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE }) status: UserStatus;
  @Column({ nullable: true }) fcmToken: string;
  @Column({ nullable: true }) planoAtivo: string;
  @Column({ nullable: true, type: 'timestamp' }) planoExpiraEm: Date;
  @CreateDateColumn() criadoEm: Date;
  @UpdateDateColumn() atualizadoEm: Date;
  @DeleteDateColumn({ nullable: true }) deletadoEm: Date;

  @OneToOne('Deliver', (d: any) => d.user, { nullable: true }) deliver: any;
  @OneToMany('Pedido', (p: any) => p.cliente) pedidosCliente: any[];
  @OneToMany('Pedido', (p: any) => p.motoqueiro) pedidosMotoqueiro: any[];
  @OneToOne('Carteira', (c: any) => c.user, { nullable: true }) carteira: any;
  @OneToMany('Notificacao', (n: any) => n.user) notificacoes: any[];
}