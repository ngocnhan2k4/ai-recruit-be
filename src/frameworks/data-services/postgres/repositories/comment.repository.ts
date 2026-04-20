import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { comments } from "../models";
import { ICommentRepository } from "@/core/abstracts/repositories/comment-repository.abstract";
import { NewComment } from "@/core/entities";

@Injectable()
export class CommentRepository implements ICommentRepository {
  constructor(@Inject("DRIZZLE") private readonly db: DBDrizzle) {}

  async createComment(data: NewComment): Promise<void> {
    await this.db.insert(comments).values(data);
  }
}
