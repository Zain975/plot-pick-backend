import { IsNotEmpty, IsString, Length } from "class-validator";

export class AdminVerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  adminId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp!: string;
}
