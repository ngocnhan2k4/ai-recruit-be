import { NewComment } from "@/core/entities";

export abstract class ICommentRepository {
  abstract createComment(data: NewComment): Promise<void>;
}
