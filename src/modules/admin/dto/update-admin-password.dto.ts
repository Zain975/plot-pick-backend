import { IsNotEmpty, IsString, MinLength, MaxLength } from "class-validator";

export class UpdateAdminPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: "Current password must be at least 8 characters long" })
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: "New password must be at least 8 characters long" })
  @MaxLength(100, { message: "New password cannot exceed 100 characters" })
  newPassword!: string;
}