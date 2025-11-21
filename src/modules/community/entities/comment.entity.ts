export interface Comment {
  id: string;
  postId: string;
  userId: string;
  parentCommentId?: string | null;
  content: string;
  likesCount: number;
  repliesCount: number;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    uniqueHandle: string;
    profilePicUrl?: string | null;
  };
  replies?: Comment[];
  isLiked?: boolean;
}
