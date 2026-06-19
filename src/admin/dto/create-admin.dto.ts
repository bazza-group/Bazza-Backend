import { IsString, IsEmail, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class CreateAdminDto {
  @IsNotEmpty()
  @IsString()
  firebaseUid!: string; // Para manter o padrão do Firebase

  @IsString()
  nome!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role: UserRole = UserRole.ADMIN;
}