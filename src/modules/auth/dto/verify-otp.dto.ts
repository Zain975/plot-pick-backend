import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(["email", "phone", "login-email", "login-phone"])
  context!: "email" | "phone" | "login-email" | "login-phone";

  @IsString()
  @IsNotEmpty()
  otp!: string;
}
