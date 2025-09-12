import { IsEmail, IsString } from 'class-validator';

export class LoginUserDto {
  @IsEmail()
  display_email!: string;

  @IsString()
  password!: string;
}
