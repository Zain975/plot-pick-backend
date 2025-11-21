import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from "class-validator";
import { DocumentType } from "../../user/entities/user.entity";

export class SignupStep3Dto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  last4Ssn?: string;

  @IsOptional()
  @IsEnum(["DRIVER_LICENSE", "PASSPORT", "STATE_ID"] as any)
  documentType?: DocumentType;
}
