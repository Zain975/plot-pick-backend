import { IsNotEmpty, IsString } from "class-validator";

export class ResendEmailOtpDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
