export interface Admin {
  id: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
