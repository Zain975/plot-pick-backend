import { IsEnum, IsNotEmpty } from "class-validator";

export enum UserStatus {
  KYC_PENDING = "KYC_PENDING",
  ACTIVE = "ACTIVE",
  LOCKED = "LOCKED",
}

export class UpdateUserStatusDto {
  @IsEnum(["KYC_PENDING", "ACTIVE", "LOCKED"] as any)
  @IsNotEmpty()
  status!: UserStatus;
}
