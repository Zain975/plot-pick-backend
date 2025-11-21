export type DocumentType = "DRIVER_LICENSE" | "PASSPORT" | "STATE_ID";
export type AccountPrivacy = "PUBLIC" | "PRIVATE";
export type UserStatus = "ACTIVE" | "LOCKED";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  uniqueHandle: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  dateOfBirth?: Date | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  last4Ssn?: string | null;
  profilePicUrl?: string | null;
  accountPrivacy: AccountPrivacy;
  xUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  documentType?: DocumentType | null;
  documentFrontUrl?: string | null;
  documentBackUrl?: string | null;
  emailVerifiedAt?: Date | null;
  phoneVerifiedAt?: Date | null;
  identityVerifiedAt?: Date | null;
  signupStep: number;
  status: UserStatus;
  plotPoints: number;
  createdAt: Date;
  updatedAt: Date;
}
