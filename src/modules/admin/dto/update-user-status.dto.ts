import { IsEnum, IsNotEmpty } from "class-validator";

export enum UserStatus {
  ACTIVE = "ACTIVE",
  LOCKED = "LOCKED",
}

export class UpdateUserStatusDto {
  @IsEnum(["ACTIVE", "LOCKED"] as any)
  @IsNotEmpty()
  status!: UserStatus;
}
