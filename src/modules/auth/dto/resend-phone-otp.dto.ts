import { IsNotEmpty, IsString } from "class-validator";

export class ResendPhoneOtpDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
