import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { NormalizeString } from "@/common/utils";
import { ISkillsSynonymsRepository, SkillSynonym } from "@/core";
import { ApiResponse, PaginatedResultDto } from "@/interfaces/dtos";
import {
  CreateSkillSynonymDto,
  GetSkillsSynonymsQueryDto,
  UpdateSkillSynonymDto,
} from "@/interfaces/dtos/skill-synonym/req/skill-synonym.dto";
import { SkillSynonymResponseDto } from "@/interfaces/dtos/skill-synonym/res/skill-synonym.dto";
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";

@Injectable()
export class SkillSynonymUseCases {
  private readonly logger = new Logger(SkillSynonymUseCases.name);
  constructor(
    @Inject(ISkillsSynonymsRepository)
    private readonly skillsSynonymsRepository: ISkillsSynonymsRepository,
  ) {}

  private normalizeAliases(aliasNames: string[]): string[] {
    return Array.from(
      new Set(
        aliasNames
          .map((name) => NormalizeString(name))
          .filter((name) => name.length > 0),
      ),
    );
  }

  private buildGroupedResponse(
    rows: Pick<SkillSynonym, "masterName" | "aliasName">[],
  ): SkillSynonymResponseDto[] {
    const grouped = new Map<string, Set<string>>();

    for (const row of rows) {
      if (!grouped.has(row.masterName)) {
        grouped.set(row.masterName, new Set());
      }
      grouped.get(row.masterName)!.add(row.aliasName);
    }

    return Array.from(grouped.entries())
      .map(([masterName, aliases]) => ({
        masterName,
        aliasNames: Array.from(aliases.values()).sort((a, b) =>
          a.localeCompare(b),
        ),
      }))
      .sort((a, b) => a.masterName.localeCompare(b.masterName));
  }

  async getSkillsSynonyms(
    query?: GetSkillsSynonymsQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<SkillSynonymResponseDto>>> {
    const page = Math.max(query?.page ?? 1, 1);
    const limit = Math.max(query?.limit ?? 10, 1);
    const keyword = query?.keyword?.trim().toLowerCase();

    const allRows = await this.skillsSynonymsRepository.getAll([
      "masterName",
      "aliasName",
    ]);

    const filteredRows = keyword
      ? allRows.filter(
          (row) =>
            row.masterName.toLowerCase().includes(keyword) ||
            row.aliasName.toLowerCase().includes(keyword),
        )
      : allRows;

    const grouped = this.buildGroupedResponse(filteredRows);
    const total = grouped.length;
    const offset = (page - 1) * limit;
    const data = grouped.slice(offset, offset + limit);
    const hasNextPage = offset + limit < total;

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        data,
        pagination: {
          total,
          hasNextPage,
        },
      },
    };
  }

  async createSkillSynonym(
    dto: CreateSkillSynonymDto,
  ): Promise<ApiResponse<SkillSynonymResponseDto>> {
    const masterName = NormalizeString(dto.masterName);
    const aliasNames = this.normalizeAliases(dto.aliasNames);

    if (!masterName) {
      throw new BadRequestException("masterName is required");
    }
    if (aliasNames.length === 0) {
      throw new BadRequestException("aliasNames is required");
    }

    const existingMaster = await this.skillsSynonymsRepository.getByField({
      masterName,
    });
    if (existingMaster.length > 0) {
      throw new BadRequestException("Master skill already exists");
    }

    const allRows = await this.skillsSynonymsRepository.getAll([
      "aliasName",
      "masterName",
    ]);
    const conflicts = aliasNames.filter((alias) =>
      allRows.some((row) => row.aliasName.toLowerCase() === alias),
    );
    if (conflicts.length > 0) {
      throw new BadRequestException(
        `Alias already exists: ${conflicts.join(", ")}`,
      );
    }

    await this.skillsSynonymsRepository.createMany(
      aliasNames.map((aliasName) => ({
        masterName,
        aliasName,
        source: dto.source ?? "manual",
      })),
    );

    this.logger.log(`Created skill synonyms for master: ${masterName}`);

    return {
      message: RESPONSE_MESSAGE.CREATED,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        masterName,
        aliasNames,
      },
    };
  }

  async updateSkillSynonym(
    currentMasterName: string,
    dto: UpdateSkillSynonymDto,
  ): Promise<ApiResponse<SkillSynonymResponseDto>> {
    const normalizedCurrentMaster = NormalizeString(currentMasterName);
    const targetMasterName = dto.masterName
      ? NormalizeString(dto.masterName)
      : normalizedCurrentMaster;
    const aliasNames = this.normalizeAliases(dto.aliasNames);

    if (!normalizedCurrentMaster) {
      throw new BadRequestException("masterName is required");
    }
    if (!targetMasterName) {
      throw new BadRequestException("masterName is required");
    }

    const existingRows = await this.skillsSynonymsRepository.getByField({
      masterName: normalizedCurrentMaster,
    });
    if (existingRows.length === 0) {
      throw new NotFoundException("Master skill not found");
    }

    const allRows = await this.skillsSynonymsRepository.getAll([
      "aliasName",
      "masterName",
    ]);
    const conflicts = aliasNames.filter((alias) =>
      allRows.some(
        (row) =>
          row.aliasName.toLowerCase() === alias &&
          row.masterName.toLowerCase() !== normalizedCurrentMaster,
      ),
    );

    if (conflicts.length > 0) {
      throw new BadRequestException(
        `Alias already exists: ${conflicts.join(", ")}`,
      );
    }

    await this.skillsSynonymsRepository.executeWithTransaction(async (tx) => {
      await this.skillsSynonymsRepository.deletePermanently(
        { masterName: normalizedCurrentMaster },
        tx,
      );

      if (aliasNames.length > 0) {
        await this.skillsSynonymsRepository.createMany(
          aliasNames.map((aliasName) => ({
            masterName: targetMasterName,
            aliasName,
            source: dto.source ?? "manual",
          })),
          tx,
        );
      }
    });

    this.logger.log(
      `Updated skill synonyms for master: ${normalizedCurrentMaster} -> ${targetMasterName}`,
    );

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        masterName: targetMasterName,
        aliasNames,
      },
    };
  }

  async deleteSkillSynonym(masterName: string): Promise<ApiResponse<void>> {
    const normalizedMasterName = NormalizeString(masterName);
    if (!normalizedMasterName) {
      throw new BadRequestException("masterName is required");
    }

    const existingRows = await this.skillsSynonymsRepository.getByField({
      masterName: normalizedMasterName,
    });
    if (existingRows.length === 0) {
      throw new NotFoundException("Master skill not found");
    }

    await this.skillsSynonymsRepository.deletePermanently({
      masterName: normalizedMasterName,
    });

    this.logger.log(
      `Deleted skill synonyms for master: ${normalizedMasterName}`,
    );

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
