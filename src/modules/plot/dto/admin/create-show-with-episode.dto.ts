import {
  IsString,
  IsNotEmpty,
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

export class CreateShowWithEpisodeDto {
  // Show fields
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

  // Episode (Plot) fields
  @IsEnum(PlotType)
  type!: PlotType;

  @IsInt()
  @Min(1)
  numberOfQuestions!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "activeStartDate must be in YYYY-MM-DD format",
  })
  activeStartDate!: string; // YYYY-MM-DD format

  @IsString()
  @IsNotEmpty()
  activeStartTime!: string; // HH:mm format

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "closeEndDate must be in YYYY-MM-DD format",
  })
  closeEndDate!: string; // YYYY-MM-DD format

  @IsString()
  @IsNotEmpty()
  closeEndTime!: string; // HH:mm format

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions!: CreateQuestionDto[];
}
