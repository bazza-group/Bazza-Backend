// src/auth/dto/update-role.dto.ts
import { IsEnum } from 'class-validator';

export enum UserRole {
  CLIENT = 'client',
  DELIVER = 'deliver',
  ADMIN = 'admin',
}

export class UpdateRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}