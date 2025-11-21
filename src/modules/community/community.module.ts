import { Module, forwardRef } from "@nestjs/common";
import { PostsModule } from "./posts/posts.module";
import { CommentsModule } from "./comments/comments.module";
import { FollowModule } from "./follow/follow.module";

@Module({
  imports: [PostsModule, CommentsModule, FollowModule],
  exports: [PostsModule, CommentsModule, FollowModule],
})
export class CommunityModule {}
