import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  Matches,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PlotType } from "@prisma/client";
import { CreateQuestionDto } from "./create-question.dto";

export class UpdateShowWithEpisodeDto {
  // Show fields
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

  // Episode (Plot) fields
  @IsOptional()
  @IsEnum(PlotType)
  type?: PlotType;

  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfQuestions?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "activeStartDate must be in YYYY-MM-DD format",
  })
  activeStartDate?: string; // YYYY-MM-DD format

  @IsOptional()
  @IsString()
  activeStartTime?: string; // HH:mm format

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "closeEndDate must be in YYYY-MM-DD format",
  })
  closeEndDate?: string; // YYYY-MM-DD format

  @IsOptional()
  @IsString()
  closeEndTime?: string; // HH:mm format

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];
}
