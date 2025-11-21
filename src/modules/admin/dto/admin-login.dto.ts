import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class AdminLoginDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(100)
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
