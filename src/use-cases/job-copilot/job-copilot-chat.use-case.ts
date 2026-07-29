import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  IAIService,
  ICategoryRepository,
  IJobCopilotConversationRepository,
  IJobCopilotDraftRepository,
  IProvinceRepository,
} from "@/core/abstracts";
import type {
  JobCopilotChatBrief,
  JobCopilotChatExtractResponse,
  JobCopilotChatResult,
  JobCopilotConversationRecord,
  JobCopilotConversationView,
  SendJobCopilotMessage,
} from "@/core/entities";
import type { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { JobCopilotUseCase } from "./job-copilot.use-case";
import { mergeJobCopilotBriefPatch } from "./job-copilot-brief-patch";
import { findMatchingProvince } from "./job-copilot-location";

const EXPERIENCE_RANGES = {
  intern: { min: 0, max: 0 },
  fresher: { min: 0, max: 1 },
  junior: { min: 1, max: 2 },
  middle: { min: 2, max: 4 },
  senior: { min: 4, max: 7 },
  lead: { min: 7, max: 12 },
} as const;

const GENERIC_CATEGORY_TOKENS = new Set([
  "administrator",
  "analyst",
  "architect",
  "developer",
  "engineer",
  "manager",
  "specialist",
]);

const CONFIRMATION_MESSAGES = new Set([
  "ok",
  "okay",
  "okroi",
  "okroia",
  "roi",
  "roia",
  "duocroi",
  "tieptuc",
  "xong",
  "xongroi",
  "done",
  "continue",
  "looksgood",
]);

@Injectable()
export class JobCopilotChatUseCase {
  constructor(
    private readonly repository: IJobCopilotConversationRepository,
    private readonly draftRepository: IJobCopilotDraftRepository,
    private readonly aiService: IAIService,
    private readonly categoryRepository: ICategoryRepository,
    private readonly provinceRepository: IProvinceRepository,
    private readonly jobCopilot: JobCopilotUseCase,
  ) {}

  async get(
    organizationId: string,
    userId: string,
    conversationId?: string,
  ): Promise<ApiResponse<JobCopilotConversationView | null>> {
    const conversation = conversationId
      ? await this.repository.findOwned(conversationId, organizationId, userId)
      : await this.repository.findLatest(organizationId, userId);
    if (!conversation) return this.success(null);
    return this.success({
      conversation,
      messages: await this.repository.listMessages(conversation.id),
    });
  }

  async send(
    organizationId: string,
    userId: string,
    input: SendJobCopilotMessage,
  ): Promise<ApiResponse<JobCopilotChatResult>> {
    let conversation: JobCopilotConversationRecord;
    if (input.conversationId) {
      const owned = await this.repository.findOwned(
        input.conversationId,
        organizationId,
        userId,
      );
      if (!owned)
        throw new NotFoundException("Job Copilot conversation not found");
      conversation = owned;
    } else {
      conversation = await this.repository.create(organizationId, userId);
    }

    const userMessage = await this.repository.addMessage({
      conversationId: conversation.id,
      role: "user",
      messageType: "text",
      content: input.content.trim(),
      clientMessageId: input.clientMessageId,
    });
    if (!userMessage.created) {
      const current =
        (await this.repository.findOwned(
          conversation.id,
          organizationId,
          userId,
        )) ?? conversation;
      return this.success({
        outcome: current.status === "completed" ? "completed" : "needs_input",
        conversation: current,
        messages: await this.repository.listMessages(current.id),
        workspace: null,
      });
    }

    const hadWorkspace = conversation.status === "completed";
    const requestId = randomUUID();
    conversation = await this.repository.beginProcessing(
      conversation.id,
      requestId,
    );

    try {
      const currentBrief = input.currentBrief
        ? {
            ...conversation.briefData,
            ...input.currentBrief,
          }
        : conversation.briefData;
      const extracted: JobCopilotChatExtractResponse =
        this.isConfirmationMessage(input.content) &&
        this.isBriefReady(currentBrief)
          ? {
              briefPatch: {},
              intent: "update_brief",
            }
          : await this.aiService.extractJobCopilotChat({
              message: input.content.trim(),
              currentBrief,
              locale: input.locale,
              hasWorkspace: hadWorkspace,
            });
      const mergedBrief = mergeJobCopilotBriefPatch(
        currentBrief,
        extracted.briefPatch,
      );
      const normalized = await this.normalizeBrief(mergedBrief);
      const missing = new Set<string>();
      if (!normalized.title) missing.add("title");
      if (!normalized.level) missing.add("level");
      if (!normalized.categoryId) missing.add("category");
      if (!normalized.workType) missing.add("workType");
      if (normalized.locations.length === 0) missing.add("locations");
      if (normalized.locationIds.length !== normalized.locations.length) {
        missing.add("locations");
      }

      if (missing.size > 0) {
        const content = this.buildClarification(
          Array.from(missing),
          input.locale,
        );
        const saved = await this.repository.finishCollecting({
          conversationId: conversation.id,
          requestId,
          brief: normalized,
        });
        if (!saved) {
          throw new ConflictException(
            "A newer Job Copilot request has already updated this workspace",
          );
        }
        await this.repository.addMessage({
          conversationId: conversation.id,
          role: "assistant",
          messageType: "clarification",
          content,
          metadata: {
            updatedFields: normalized,
            missingFields: Array.from(missing),
          },
        });
        const current = await this.requireConversation(
          conversation.id,
          organizationId,
          userId,
        );
        return this.success({
          outcome: "needs_input",
          conversation: current,
          messages: await this.repository.listMessages(current.id),
          workspace: null,
        });
      }

      const range = EXPERIENCE_RANGES[normalized.level!];
      if (hadWorkspace && extracted.intent === "revise_jd") {
        normalized.skills = currentBrief.skills ?? [];
        const [viDraft, enDraft] = await Promise.all([
          this.draftRepository.findActive(
            organizationId,
            userId,
            "vi",
            conversation.id,
          ),
          this.draftRepository.findActive(
            organizationId,
            userId,
            "en",
            conversation.id,
          ),
        ]);
        if (!viDraft || !enDraft) {
          throw new Error(
            "The current bilingual Job Copilot draft is incomplete",
          );
        }
        const viContent = this.draftContent(viDraft.formData);
        const enContent = this.draftContent(enDraft.formData);
        const sourceContent = input.locale === "vi" ? viContent : enContent;
        const revised = await this.jobCopilot.run({
          mode: "revise",
          locale: input.locale,
          instruction: input.content.trim(),
          localizedDrafts: {
            vi: viContent,
            en: enContent,
          },
          draft: {
            title: normalized.title!,
            category: normalized.category!,
            roleContext: normalized.roleContext,
            experienceMin: range.min,
            experienceMax: range.max,
            workType: normalized.workType!,
            locations: normalized.locations,
            skills: normalized.skills.map((skill) => skill.name),
            salaryMin: normalized.salaryNegotiable
              ? undefined
              : normalized.salaryMin,
            salaryMax: normalized.salaryNegotiable
              ? undefined
              : normalized.salaryMax,
            salaryCurrency: "VND",
            salaryUnit: "million",
            ...sourceContent,
          },
        });
        const workspace = revised.data!;
        normalized.skills = workspace.suggestedSkills;
        const saved = await this.repository.finishCompleted({
          conversation,
          requestId,
          brief: normalized,
          workspace,
        });
        if (!saved) {
          throw new ConflictException(
            "A newer Job Copilot request has already updated this workspace",
          );
        }
        await this.repository.addMessage({
          conversationId: conversation.id,
          role: "assistant",
          messageType: "revision_result",
          content:
            input.locale === "vi"
              ? "Mình đã cập nhật JD theo yêu cầu của bạn."
              : "I updated the JD based on your request.",
          metadata: {
            intent: extracted.intent,
            canUndo: true,
            analysisId: workspace.analysisId,
          },
        });
        const current = await this.requireConversation(
          conversation.id,
          organizationId,
          userId,
        );
        return this.success({
          outcome: "completed",
          conversation: current,
          messages: await this.repository.listMessages(current.id),
          workspace,
        });
      }

      const generated = await this.jobCopilot.run({
        mode: "generate",
        locale: input.locale,
        draft: {
          title: normalized.title!,
          category: normalized.category!,
          roleContext: normalized.roleContext,
          experienceMin: range.min,
          experienceMax: range.max,
          workType: normalized.workType!,
          locations: normalized.locations,
          skills: [],
          salaryMin: normalized.salaryNegotiable
            ? undefined
            : normalized.salaryMin,
          salaryMax: normalized.salaryNegotiable
            ? undefined
            : normalized.salaryMax,
          salaryCurrency: "VND",
          salaryUnit: "million",
        },
      });
      const workspace = generated.data!;
      normalized.skills = workspace.suggestedSkills;
      const saved = await this.repository.finishCompleted({
        conversation,
        requestId,
        brief: normalized,
        workspace,
      });
      if (!saved) {
        throw new ConflictException(
          "A newer Job Copilot request has already updated this workspace",
        );
      }
      await this.repository.addMessage({
        conversationId: conversation.id,
        role: "assistant",
        messageType: "generation_result",
        content:
          input.locale === "vi" ? "Mình đã tạo xong JD." : "Your JD is ready.",
        metadata: {
          updatedFields: normalized,
          generatedLocales: ["vi", "en"],
          analysisId: workspace.analysisId,
        },
      });
      const current = await this.requireConversation(
        conversation.id,
        organizationId,
        userId,
      );
      return this.success({
        outcome: "completed",
        conversation: current,
        messages: await this.repository.listMessages(current.id),
        workspace,
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      await this.repository.markFailed(conversation.id, requestId);
      await this.repository.addMessage({
        conversationId: conversation.id,
        role: "assistant",
        messageType: "error",
        content:
          input.locale === "vi"
            ? "Không thể xử lý yêu cầu lúc này. Vui lòng thử lại."
            : "I could not process that request. Please try again.",
        metadata: {},
      });
      throw error;
    }
  }

  async remove(
    organizationId: string,
    userId: string,
    conversationId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.success({
      deleted: await this.repository.softDelete(
        conversationId,
        organizationId,
        userId,
      ),
    });
  }

  async undo(
    organizationId: string,
    userId: string,
    conversationId: string,
    locale: "vi" | "en",
  ): Promise<ApiResponse<{ undone: boolean }>> {
    const undone = await this.repository.undoLastRevision(
      conversationId,
      organizationId,
      userId,
    );
    if (undone) {
      await this.repository.addMessage({
        conversationId,
        role: "assistant",
        messageType: "undo_result",
        content:
          locale === "vi"
            ? "Đã hoàn tác lần chỉnh sửa JD gần nhất."
            : "The latest JD revision was undone.",
        metadata: { canUndo: false },
      });
    }
    return this.success({ undone });
  }

  private async normalizeBrief(
    extracted: Omit<
      JobCopilotChatBrief,
      "categoryId" | "locationIds" | "skills"
    >,
  ): Promise<JobCopilotChatBrief> {
    const [categories, provinces] = await Promise.all([
      this.categoryRepository.getAll(["id", "name"]),
      this.provinceRepository.getAll(["id", "name"]),
    ]);
    const category = this.resolveCategory(extracted.category, categories);
    const locationIds: string[] = [];
    const locationNames: string[] = [];
    for (const name of extracted.locations ?? []) {
      const province = findMatchingProvince(name, provinces);
      if (province) {
        if (!locationIds.includes(province.id)) {
          locationIds.push(province.id);
          locationNames.push(province.name);
        }
      } else {
        locationNames.push(name);
      }
    }
    return {
      ...extracted,
      category: category?.name ?? extracted.category,
      categoryId: category?.id,
      locations: locationNames,
      locationIds,
      salaryNegotiable: extracted.salaryNegotiable ?? true,
      skills: [],
    };
  }

  private buildClarification(fields: string[], locale: "vi" | "en") {
    const vi: Record<string, string> = {
      title: "chức danh",
      level: "cấp bậc",
      category: "danh mục công việc",
      workType: "hình thức làm việc",
      locations: "địa điểm",
    };
    if (locale !== "vi") {
      return `Please provide the ${fields.join(", ")}.`;
    }

    const labels = fields.map((field) => vi[field] ?? field);
    const fieldList =
      labels.length > 1
        ? `${labels.slice(0, -1).join(", ")} và ${labels.at(-1)}`
        : labels[0];
    return `Vui lòng cung cấp ${fieldList}.`;
  }

  private normalize(value: string) {
    return this.normalizeSearchText(value).replace(/[^a-z0-9]/g, "");
  }

  private isConfirmationMessage(value: string) {
    return CONFIRMATION_MESSAGES.has(this.normalize(value));
  }

  private isBriefReady(brief: JobCopilotChatBrief) {
    return Boolean(
      brief.title &&
        brief.level &&
        brief.category &&
        brief.workType &&
        brief.locations.length > 0,
    );
  }

  private normalizeSearchText(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toLowerCase();
  }

  private resolveCategory<T extends { name: string }>(
    requestedName: string | null | undefined,
    categories: T[],
  ): T | undefined {
    if (!requestedName) return undefined;

    const exact = categories.find(
      (item) => this.normalize(item.name) === this.normalize(requestedName),
    );
    if (exact) return exact;

    const requestedTokens = this.categoryTokens(requestedName).filter(
      (token) => !GENERIC_CATEGORY_TOKENS.has(token),
    );
    if (requestedTokens.length === 0) return undefined;

    const ranked = categories
      .map((item) => {
        const candidateTokens = new Set(
          this.categoryTokens(item.name).filter(
            (token) => !GENERIC_CATEGORY_TOKENS.has(token),
          ),
        );
        const score = requestedTokens.filter((token) =>
          candidateTokens.has(token),
        ).length;
        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score);

    if (ranked.length === 0 || ranked[0].score === ranked[1]?.score) {
      return undefined;
    }
    return ranked[0].item;
  }

  private categoryTokens(value: string) {
    return this.normalizeSearchText(value).match(/[a-z0-9]+/g) ?? [];
  }

  private draftContent(formData: Record<string, unknown>) {
    const read = (key: string) =>
      typeof formData[key] === "string" ? formData[key] : "";
    return {
      description: read("description"),
      requirements: read("requirements"),
      benefits: read("benefits"),
    };
  }

  private async requireConversation(
    id: string,
    organizationId: string,
    userId: string,
  ) {
    const conversation = await this.repository.findOwned(
      id,
      organizationId,
      userId,
    );
    if (!conversation) throw new NotFoundException();
    return conversation;
  }

  private success<T>(data: T): ApiResponse<T> {
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data,
    };
  }
}
