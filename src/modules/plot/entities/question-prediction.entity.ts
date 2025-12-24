export class QuestionPrediction {
  id!: string;
  plotPredictionId!: string;
  questionId!: string;
  optionId!: string;
  createdAt!: Date;
  updatedAt!: Date;
  plotPrediction?: any;
  question?: any;
  option?: any;
}
