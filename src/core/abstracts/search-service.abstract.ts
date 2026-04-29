import { estypes } from "@elastic/elasticsearch";

/**
 * Abstract interface for search services
 * This allows swapping Elasticsearch with other search engines (Algolia, MeiliSearch, etc.)
 */
export abstract class ISearchService {
  abstract healthCheck(): Promise<boolean>;

  /**
   * Create a new search index with mapping/schema
   * @param indexName - Name of the index to create
   * @param mapping - Index mapping/schema configuration
   */
  abstract createIndex(indexName: string, mapping: any): Promise<void>;

  /**
   * Delete an existing search index
   * @param indexName - Name of the index to delete
   */
  abstract deleteIndex(indexName: string): Promise<void>;

  /**
   * Index a single document
   * @param indexName - Name of the index
   * @param id - Document ID
   * @param document - Document data to index
   */
  abstract indexDocument(
    indexName: string,
    id: string,
    document: any,
  ): Promise<any>;

  /**
   * Bulk index multiple documents
   * @param indexName - Name of the index
   * @param documents - Array of documents with IDs to index
   * @returns Statistics about the bulk operation
   */
  abstract bulkIndex(
    indexName: string,
    documents: Array<{ id: string; document: any }>,
  ): Promise<{ success: number; failed: number }>;

  /**
   * Search for documents
   * @param indexName - Name of the index to search
   * @param query - Search query (implementation-specific format)
   * @returns Search results (implementation-specific format)
   */
  abstract search(indexName: string, query: any): Promise<any>;

  /**
   * Delete a document from the index
   * @param indexName - Name of the index
   * @param query - Query to delete document
   */
  abstract deleteByQuery(
    indexName: string,
    query: estypes.QueryDslQueryContainer,
  ): Promise<{ deleted: number; took: number }>;

  /**
   * Reindex from remote Elasticsearch using Reindex API
   * @param sourceNode - Source Elasticsearch node URL
   * @param sourceIndex - Source index name
   * @param targetIndex - Target index name
   * @param sourceAuth - Source authentication credentials
   * @param query - Search query (implementation-specific format)
   */
  abstract reindexFromRemote(
    sourceNode: string,
    sourceIndex: string,
    targetIndex: string,
    sourceAuth?: { username: string; password: string },
    query?: any,
  ): Promise<{ total: number; took: number }>;

  abstract updateByQuery(
    indexName: string,
    query: estypes.QueryDslQueryContainer,
    script: estypes.Script,
  ): Promise<void>;

  abstract countDocuments(indexName: string): Promise<number>;

  abstract existsIndex(indexName: string): Promise<boolean>;

  abstract existsDocument(indexName: string, id: string): Promise<boolean>;
}
