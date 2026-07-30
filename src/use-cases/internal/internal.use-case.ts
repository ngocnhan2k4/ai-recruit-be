import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ISearchService } from "@/core";
import { RESPONSE_CODE } from "@/common/constants";
import { ApiResponse } from "@/interfaces/dtos";
import {
  InternalEsDeleteDto,
  InternalEsIndexAlias,
  InternalEsSearchDto,
} from "@/interfaces/dtos/internal";

@Injectable()
export class InternalUseCase {
  private readonly logger = new Logger(InternalUseCase.name);

  constructor(
    private readonly searchService: ISearchService,
    private readonly configService: ConfigService,
  ) {}

  async search(dto: InternalEsSearchDto): Promise<
    ApiResponse<{
      index: string;
      total: number;
      hits: Array<{
        id: string;
        score: number | null;
        source: Record<string, unknown>;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
      };
    }>
  > {
    const resolvedIndex = this.resolveIndex(dto.index);
    const limit = dto.limit ?? 10;
    const page = dto.page ?? 1;
    const from = (page - 1) * limit;
    const query = this.buildQueryFromParams(dto.param);
    const sort = this.buildSort(dto);

    this.logger.log(
      `Internal ES search index=${resolvedIndex} (alias=${dto.index}) page=${page} limit=${limit}`,
    );

    const body: Record<string, unknown> = {
      query,
      size: limit,
      from,
      _source: { excludes: ["embedding"] },
    };
    if (sort) {
      body.sort = sort;
    }

    const response = await this.searchService.search(resolvedIndex, body);

    const hits = (response?.hits?.hits ?? []).map((hit: any) => ({
      id: hit._id as string,
      score: (hit._score as number | null) ?? null,
      source: (hit._source ?? {}) as Record<string, unknown>,
    }));

    const total =
      typeof response?.hits?.total === "number"
        ? response.hits.total
        : (response?.hits?.total?.value ?? hits.length);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Elasticsearch search completed",
      data: {
        index: resolvedIndex,
        total,
        hits,
        pagination: { page, limit, total },
      },
    };
  }

  async deleteByIds(dto: InternalEsDeleteDto): Promise<
    ApiResponse<{
      index: string;
      requested: number;
      deleted: number;
      took: number;
    }>
  > {
    const resolvedIndex = this.resolveIndex(dto.index);
    const ids = [...new Set(dto.ids.filter((id) => id?.trim()))];

    if (ids.length === 0) {
      throw new BadRequestException({
        message: "ids must contain at least one non-empty id",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    this.logger.log(
      `Internal ES delete index=${resolvedIndex} (alias=${dto.index}) count=${ids.length}`,
    );

    const result = await this.searchService.deleteByQuery(resolvedIndex, {
      terms: { _id: ids },
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Elasticsearch documents deleted",
      data: {
        index: resolvedIndex,
        requested: ids.length,
        deleted: result.deleted,
        took: result.took,
      },
    };
  }

  private resolveIndex(alias: InternalEsIndexAlias): string {
    const map: Record<InternalEsIndexAlias, string | undefined> = {
      jobs: this.configService.get<string>("ELASTICSEARCH_INDEX_JOBS"),
      cvs: this.configService.get<string>("ELASTICSEARCH_INDEX_CVS"),
      "event-tracking": this.configService.get<string>(
        "ELASTICSEARCH_INDEX_EVENT_TRACKING",
      ),
    };

    const indexName = map[alias];
    if (!indexName) {
      throw new BadRequestException({
        message: `Elasticsearch index is not configured for alias "${alias}"`,
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }
    return indexName;
  }

  private buildQueryFromParams(
    param: InternalEsSearchDto["param"],
  ): Record<string, unknown> {
    const entries = Object.entries(param ?? {}).filter(
      ([, value]) => value !== undefined,
    );

    if (entries.length === 0) {
      return { match_all: {} };
    }

    const must = entries.map(([field, value]) => {
      if (value === null || value === "") {
        return this.buildMissingOrEmptyClause(field);
      }
      if (Array.isArray(value)) {
        return { terms: { [field]: value } };
      }
      return { term: { [field]: value } };
    });

    return { bool: { must } };
  }

  /** Match docs where field is missing (ES null) or empty string */
  private buildMissingOrEmptyClause(field: string): Record<string, unknown> {
    return {
      bool: {
        should: [
          { bool: { must_not: { exists: { field } } } },
          { term: { [field]: "" } },
        ],
        minimum_should_match: 1,
      },
    };
  }

  private buildSort(
    dto: InternalEsSearchDto,
  ): Array<Record<string, { order: "asc" | "desc" }>> | undefined {
    if (!dto.sortBy) return undefined;
    return [{ [dto.sortBy]: { order: dto.sortDirection ?? "asc" } }];
  }
}
