import { UserRole } from "src/auth/dto/update-role.dto";

export class CreateUserDto {
  firebaseUid: string;
  phoneNumber: string;
  phoneVerified: boolean;
  role: UserRole;
}