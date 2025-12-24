import { QuestionType } from "@prisma/client";

export class Question {
  id!: string;
  plotId!: string;
  questionText!: string;
  type!: QuestionType;
  order!: number;
  isPaused!: boolean;
  correctOptionId?: string;
  createdAt!: Date;
  updatedAt!: Date;
  plot?: any;
  options?: any[];
  predictions?: any[];
  correctOption?: any;
}
