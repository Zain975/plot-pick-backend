import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateShowDto {
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsInt()
  @Min(1)
  seasonNumber!: number;

  @IsInt()
  @Min(1)
  episode!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  minimumAmount!: number;

  @IsNumber()
  @Min(0)
  maximumAmount!: number;

  @IsNumber()
  @Min(0)
  payoutAmount!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  plotpicksVig!: number;

  @IsBoolean()
  bonusKicker!: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusAmount?: number;
}
