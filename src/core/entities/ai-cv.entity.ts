import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { aiCvs } from "@/frameworks/data-services/postgres/models";

export type NewAiCv = InferInsertModel<typeof aiCvs>;
export type AiCv = InferSelectModel<typeof aiCvs>;
