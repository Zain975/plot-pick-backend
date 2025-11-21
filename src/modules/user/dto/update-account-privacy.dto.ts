import { IsEnum, IsNotEmpty } from "class-validator";

export enum AccountPrivacy {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}

export class UpdateAccountPrivacyDto {
  @IsEnum(AccountPrivacy)
  @IsNotEmpty()
  accountPrivacy!: AccountPrivacy;
}
