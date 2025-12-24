export class Show {
  id!: string;
  thumbnailUrl?: string;
  title!: string;
  seasonNumber!: number;
  episode!: number;
  description?: string;
  minimumAmount!: number;
  maximumAmount!: number;
  payoutAmount!: number;
  plotpicksVig!: number;
  bonusKicker!: boolean;
  bonusAmount?: number;
  createdAt!: Date;
  updatedAt!: Date;
  plots?: any[];
}
