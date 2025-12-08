/**
 * Example: Elasticsearch Service Implementation
 *
 * File location: src/frameworks/data-services/elasticsearch/elasticsearch.service.ts
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client, ClientOptions } from "@elastic/elasticsearch";

@Injectable()
export class ElasticsearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client;

  constructor(private configService: ConfigService) {
    const options: ClientOptions = {
      node: this.configService.get<string>("ELASTICSEARCH_NODE"),
    };

    // Add authentication if provided
    const username = this.configService.get<string>("ELASTICSEARCH_USERNAME");
    const password = this.configService.get<string>("ELASTICSEARCH_PASSWORD");

    if (username && password) {
      options.auth = {
        username,
        password,
      };
    }

    // For development, you might want to disable SSL verification
    if (this.configService.get("NODE_ENV") === "local") {
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

  async getClient(): Promise<Client> {
    return this.client;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.cluster.health({
        wait_for_status: "yellow",
        timeout: "10s",
      });

      this.logger.log(`Elasticsearch cluster status: ${response.status}`);

      return response.status !== "red";
    } catch (error) {
      this.logger.error("Elasticsearch health check failed", error);
      return false;
    }
  }

  async createIndex(indexName: string, mapping: any): Promise<boolean> {
    try {
      const exists = await this.client.indices.exists({
        index: indexName,
      });

      if (exists) {
        this.logger.log(`Index ${indexName} already exists`);
        return true;
      }

      await this.client.indices.create({
        index: indexName,
        body: mapping,
      });

      this.logger.log(`Index ${indexName} created successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to create index ${indexName}`, error);
      return false;
    }
  }

  async deleteIndex(indexName: string): Promise<boolean> {
    try {
      const exists = await this.client.indices.exists({
        index: indexName,
      });

      if (!exists) {
        this.logger.log(`Index ${indexName} does not exist`);
        return true;
      }

      await this.client.indices.delete({
        index: indexName,
      });

      this.logger.log(`Index ${indexName} deleted successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete index ${indexName}`, error);
      return false;
    }
  }

  async indexDocument(
    indexName: string,
    id: string,
    document: any,
  ): Promise<boolean> {
    try {
      await this.client.index({
        index: indexName,
        id,
        body: document,
        refresh: true,
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to index document ${id} in ${indexName}`,
        error,
      );
      return false;
    }
  }

  async bulkIndex(
    indexName: string,
    documents: Array<{ id: string; document: any }>,
  ): Promise<{ success: number; failed: number }> {
    const body = documents.flatMap(({ id, document }) => [
      { index: { _index: indexName, _id: id } },
      document,
    ]);

    try {
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
    } catch (error) {
      this.logger.error(`Bulk index failed for ${indexName}`, error);
      throw error;
    }
  }

  async search(indexName: string, query: any): Promise<any> {
    try {
      const response = await this.client.search({
        index: indexName,
        body: query,
      });

      return response;
    } catch (error) {
      this.logger.error(`Search failed for ${indexName}`, error);
      throw error;
    }
  }

  async deleteDocument(indexName: string, id: string): Promise<boolean> {
    try {
      await this.client.delete({
        index: indexName,
        id,
        refresh: true,
      });

      return true;
    } catch (error) {
      // Document might not exist, which is fine
      if (error.meta?.statusCode === 404) {
        return true;
      }

      this.logger.error(
        `Failed to delete document ${id} from ${indexName}`,
        error,
      );
      return false;
    }
  }
}
