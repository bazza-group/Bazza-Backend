import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('mensagens_chat')
export class MensagemChat {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() pedidoId: string;
  @Column() remetenteId: string;
  @Column({ type: 'enum', enum: ['cliente', 'motoqueiro'] }) remetenteTipo: 'cliente' | 'motoqueiro';
  @Column({ type: 'text' }) texto: string;
  @Column({ default: false }) lida: boolean;
  @CreateDateColumn() criadoEm: Date;
}