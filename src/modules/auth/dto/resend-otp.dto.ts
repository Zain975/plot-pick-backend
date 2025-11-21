import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class ResendOtpDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(["email", "phone", "login-email", "login-phone"])
  context!: "email" | "phone" | "login-email" | "login-phone";
}
