import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'El nickname es obligatorio' })
  nickname!: string;

  @IsEmail({}, { message: 'El correo electrónico debe ser válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  display_email!: string;  // Obligatorio

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password!: string;

  // Campos opcionales
  custom_profile_image_url?: string;
  bio?: string;
}