export class PlotPrediction {
  id!: string;
  userId!: string;
  plotId!: string;
  predictedAmount!: number;
  createdAt!: Date;
  updatedAt!: Date;
  user?: any;
  plot?: any;
  questionPredictions?: any[];
}
