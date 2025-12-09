import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client, ClientOptions } from "@elastic/elasticsearch";
import { Environment } from "@/common/config/env.config";

@Injectable()
export class ElasticsearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client;

  constructor(private configService: ConfigService) {
    const options: ClientOptions = {
      node: this.configService.get<string>("ELASTICSEARCH_NODE"),
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
    await this.healthCheck();
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
  ): Promise<void> {
    await this.client.index({
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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

  async search(indexName: string, query: any): Promise<any> {
    const response = await this.client.search({
      index: indexName,
      body: query,
    });

    return response;
  }

  async deleteDocument(indexName: string, id: string): Promise<void> {
    await this.client.delete({
      index: indexName,
      id,
      refresh: true,
    });
  }
}
