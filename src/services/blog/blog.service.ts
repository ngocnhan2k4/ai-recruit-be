import { RESPONSE_CODE } from "@/common/constants";
import { BlogPost, IBlogRepository } from "@/core";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);
  constructor(private readonly blogRepository: IBlogRepository) {}

  async checkValidPost(postId: string): Promise<BlogPost> {
    const post = await this.blogRepository.get(postId);
    if (!post) {
      throw new NotFoundException({
        message: "Blog post not found",
        code: RESPONSE_CODE.BLOG_POST_NOT_FOUND,
      });
    }

    return post;
  }

  async checkIsAuthor(postId: string, userId: string): Promise<void> {
    const post = await this.checkValidPost(postId);

    if (post.authorId !== userId) {
      throw new NotFoundException({
        message: "Blog post not found",
        code: RESPONSE_CODE.BLOG_POST_NOT_FOUND,
      });
    }
  }

  async checkPostExists(postId: string): Promise<void> {
    await this.checkValidPost(postId);
  }
}
