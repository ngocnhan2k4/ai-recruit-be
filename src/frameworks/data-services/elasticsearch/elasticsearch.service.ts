import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client, ClientOptions, estypes } from "@elastic/elasticsearch";
import { Environment } from "@/common/config";
import { ILoggerServices } from "@/core/abstracts/logger-services.abstract";
import { ISearchService } from "@/core/abstracts/search-service.abstract";

@Injectable()
export class ElasticsearchService
  implements ISearchService, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client;

  constructor(
    private configService: ConfigService,
    private loggerService: ILoggerServices,
  ) {
    const options: ClientOptions = {
      node: this.configService.get<string>("ELASTICSEARCH_NODE"),

      requestTimeout: 10000,
      pingTimeout: 3000,
      maxRetries: 1,
    };

    const username = this.configService.get<string>("ELASTICSEARCH_USERNAME");
    const password = this.configService.get<string>("ELASTICSEARCH_PASSWORD");

    if (username && password) {
      options.auth = {
        username,
        password,
      };
    }

    if (this.configService.get("NODE_ENV") === Environment.Local) {
      options.tls = {
        rejectUnauthorized: false,
      };
    }

    this.client = new Client(options);
  }

  async onModuleInit() {
    try {
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        throw new Error("Elasticsearch cluster is not healthy");
      }
    } catch (err) {
      this.logger.error("Elasticsearch health check failed", err);
      await this.loggerService.logError({
        type: "Elasticsearch health check failed",
        content: JSON.stringify(err),
        note: "Elasticsearch health check failed",
      });
      // I don't want to throw error here because it will cause the application to crash
      // throw err;
    }
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  getClient(): Client {
    return this.client;
  }

  async healthCheck(): Promise<boolean> {
    const response = await this.client.cluster.health({
      wait_for_status: "yellow",
      timeout: "10s",
    });

    this.logger.log(`Elasticsearch cluster status: ${response.status}`);

    return response.status !== "red";
  }

  async createIndex(indexName: string, mapping: any): Promise<void> {
    const exists = await this.client.indices.exists({
      index: indexName,
    });

    if (exists) {
      this.logger.log(`Index ${indexName} already exists`);
      return;
    }

    await this.client.indices.create({
      index: indexName,
      body: mapping,
    });

    this.logger.log(`Index ${indexName} created successfully`);
  }

  async deleteIndex(indexName: string): Promise<void> {
    const exists = await this.client.indices.exists({
      index: indexName,
    });

    if (!exists) {
      this.logger.log(`Index ${indexName} does not exist`);
      return;
    }

    await this.client.indices.delete({
      index: indexName,
    });

    this.logger.log(`Index ${indexName} deleted successfully`);
  }

  async indexDocument(
    indexName: string,
    id: string,
    document: any,
  ): Promise<any> {
    return this.client.index({
      index: indexName,
      id,
      body: document,
      refresh: true,
    });
  }

  async bulkIndex(
    indexName: string,
    documents: Array<{ id: string; document: any }>,
  ): Promise<{ success: number; failed: number }> {
    const body = documents.flatMap(({ id, document }) => [
      { index: { _index: indexName, _id: id } },
      document,
    ]);

    const response = await this.client.bulk({
      body,
      refresh: true,
    });

    const success = response.items.filter(
      (item: any) => item.index?.status === 200 || item.index?.status === 201,
    ).length;
    const failed = response.items.length - success;

    if (failed > 0) {
      this.logger.warn(
        `Bulk index completed with ${failed} failures out of ${documents.length} documents`,
      );
    }

    return { success, failed };
  }

  async search(
    indexName: string,
    query: estypes.QueryDslQueryContainer,
  ): Promise<any> {
    const response = await this.client.search({
      index: indexName,
      body: query,
    });

    return response;
  }

  async deleteByQuery(
    indexName: string,
    query: estypes.QueryDslQueryContainer,
  ): Promise<{ deleted: number; took: number }> {
    const response = await this.client.deleteByQuery({
      index: indexName,
      query,
      conflicts: "proceed",
      refresh: false,
    });

    this.logger?.log?.(
      `deleteByQuery completed: deleted=${response.deleted}, took=${response.took}ms`,
    );

    return {
      deleted: response.deleted ?? 0,
      took: response.took ?? 0,
    };
  }

  /**
   * Reindex from remote Elasticsearch using Reindex API
   * This is the recommended method as it's faster and more efficient
   */
  async reindexFromRemote(
    sourceNode: string,
    sourceIndex: string,
    targetIndex: string,
    sourceAuth?: { username: string; password: string },
    query?: estypes.QueryDslQueryContainer,
  ): Promise<{ total: number; took: number }> {
    const remote = {
      host: sourceNode,
      ...(sourceAuth && {
        auth: {
          username: sourceAuth.username,
          password: sourceAuth.password,
        },
      }),
    };

    const source: any = {
      remote,
      index: sourceIndex,
    };

    if (query) {
      source.query = query;
    }

    const response = await this.client.reindex({
      source,
      dest: {
        index: targetIndex,
      },
      refresh: true,
      wait_for_completion: true,
    });

    return {
      total: response.total || 0,
      took: response.took || 0,
    };
  }

  async updateByQuery(
    indexName: string,
    query: estypes.QueryDslQueryContainer,
    script: estypes.Script,
  ): Promise<void> {
    const response = await this.client.updateByQuery({
      index: indexName,
      body: {
        query,
        script,
      },
      refresh: true, // đảm bảo search thấy dữ liệu mới ngay
      conflicts: "proceed", // bỏ qua conflict version
    });

    this.logger.log(
      `updateByQuery completed: updated=${response.updated}, took=${response.took}ms`,
    );
  }
}
