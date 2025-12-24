import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from "class-validator";

export class UpdateShowDto {
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  seasonNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  episode?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  payoutAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  plotpicksVig?: number;

  @IsOptional()
  @IsBoolean()
  bonusKicker?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusAmount?: number;
}
