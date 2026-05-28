import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { BlogPost, BlogPostStatus, IBlogRepository } from "@/core";
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);
  constructor(private readonly blogRepository: IBlogRepository) {}

  async getValidPost(postId: string): Promise<BlogPost> {
    const post = await this.blogRepository.get(postId);
    if (!post) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.BLOG_POST_NOT_FOUND,
        code: RESPONSE_CODE.BLOG_POST_NOT_FOUND,
      });
    }

    return post;
  }

  async checkIsAuthor(postId: string, userId: string): Promise<BlogPost> {
    const post = await this.getValidPost(postId);

    if (post.authorId !== userId) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.BLOG_POST_NOT_FOUND,
        code: RESPONSE_CODE.BLOG_POST_NOT_FOUND,
      });
    }

    return post;
  }

  async checkNotDraft(postId: string): Promise<BlogPost> {
    const post = await this.getValidPost(postId);

    if (post.status === (BlogPostStatus.DRAFT as string)) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.BLOG_POST_NOT_FOUND,
        code: RESPONSE_CODE.BLOG_POST_NOT_FOUND,
      });
    }

    return post;
  }

  async checkPublished(postId: string): Promise<BlogPost> {
    const post = await this.getValidPost(postId);

    if (post.status !== (BlogPostStatus.PUBLISHED as string)) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.BLOG_POST_NOT_FOUND,
        code: RESPONSE_CODE.BLOG_POST_NOT_FOUND,
      });
    }

    return post;
  }
}
