import { PlotType, PlotStatus } from "@prisma/client";

export class Plot {
  id!: string;
  showId!: string;
  type!: PlotType;
  numberOfQuestions!: number;
  activeStartDate!: Date;
  activeStartTime!: string;
  closeEndDate!: Date;
  closeEndTime!: string;
  status!: PlotStatus;
  createdAt!: Date;
  updatedAt!: Date;
  show?: any;
  questions?: any[];
}
