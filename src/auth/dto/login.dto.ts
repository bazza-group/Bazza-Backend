import { IsString, IsPhoneNumber } from 'class-validator';

export class LoginDto {
  @IsPhoneNumber('AO') // Angola
  phoneNumber: string;

  @IsString()
  firebaseToken: string;
}
