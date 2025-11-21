import { IsNotEmpty, IsString } from "class-validator";

export class AdminResendOtpDto {
  @IsString()
  @IsNotEmpty()
  adminId!: string;
}
