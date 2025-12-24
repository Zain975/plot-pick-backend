import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { QuestionType } from "@prisma/client";
import { CreateQuestionOptionDto } from "./create-question-option.dto";

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionText!: string;

  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsInt()
  @Min(1)
  order!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  options!: CreateQuestionOptionDto[];
}
