import { IsString, IsNotEmpty, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class QuestionResultDto {
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @IsString()
  @IsNotEmpty()
  correctOptionId!: string;
}

export class AnnounceResultsDto {
  @IsString()
  @IsNotEmpty()
  plotId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionResultDto)
  results!: QuestionResultDto[];
}
