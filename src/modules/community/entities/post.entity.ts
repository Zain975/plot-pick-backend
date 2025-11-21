export interface Post {
  id: string;
  userId: string;
  description?: string | null;
  mediaUrls: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    uniqueHandle: string;
    profilePicUrl?: string | null;
  };
  isLiked?: boolean;
  isShared?: boolean;
}
