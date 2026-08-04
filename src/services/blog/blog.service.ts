import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { BlogPost, BlogPostStatus, IBlogRepository } from "@/core";
import { BlogPostListItemDto } from "@/interfaces/dtos/blog/res/blog-post.dto";
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
        message: RESPONSE_MESSAGE.BLOG_POST_IS_DRAFT,
        code: RESPONSE_CODE.BLOG_POST_IS_DRAFT,
      });
    }

    return post;
  }

  async checkPublished(postId: string): Promise<BlogPost> {
    const post = await this.getValidPost(postId);

    if (post.status !== (BlogPostStatus.PUBLISHED as string)) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.BLOG_POST_NOT_PUBLISHED,
        code: RESPONSE_CODE.BLOG_POST_NOT_PUBLISHED,
      });
    }

    return post;
  }

  calculateTopBlogs(posts: BlogPostListItemDto[]): BlogPostListItemDto[] {
    const now = Date.now();
    const scoredPosts = posts.map((post) => {
      const createdAtTime = new Date(post.createdAt).getTime();
      const ageInHours = Math.max(0, (now - createdAtTime) / (1000 * 60 * 60));
      const score = post.likes / Math.pow(ageInHours + 2, 1.5);
      return { post, score };
    });

    scoredPosts.sort((a, b) => b.score - a.score);
    return scoredPosts.slice(0, 10).map((item) => item.post);
  }

  calculateRelatedPosts(
    currentPost: { categoryId: string; sourceType?: string },
    candidates: BlogPostListItemDto[],
    currentTags: { name: string }[],
    limit = 4,
  ): BlogPostListItemDto[] {
    const currentTagNames = new Set(currentTags.map((t) => t.name));

    const scored = candidates.map((post) => {
      let score = 0;

      if (post.categoryId === currentPost.categoryId) {
        score += 5;
      }

      if (post.tags) {
        for (const tag of post.tags) {
          if (currentTagNames.has(tag.name)) {
            score += 2;
          }
        }
      }

      if (post.sourceType === currentPost.sourceType) {
        score += 1;
      }

      return { post, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((item) => item.post);
  }
}
