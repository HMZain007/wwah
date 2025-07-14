
// utils/meta-index.ts
import { OpenAIEmbeddings } from "@langchain/openai";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import clientPromise from "../mongodb";

// Collection configuration with enhanced metadata support
const COLLECTION_CONFIG = {
  countries: {
    name: "country_embeddings",
    indexName: "country_vector_index",
    priority: 0.3,
    searchableFields: ["country", "capital", "language", "currency"],
  },
  universities: {
    name: "university_embeddings",
    indexName: "university_vector_index",
    priority: 0.4,
    searchableFields: [
      "title",
      "country",
      "location",
      "ranking.qs",
      "ranking.the",
    ],
  },
  courses: {
    name: "course_embeddings",
    indexName: "course_vector_index",
    priority: 0.3,
    searchableFields: ["title", "country", "degree", "subject", "university"],
  },
  scholarships: {
    name: "scholarship_embeddings",
    indexName: "scholarship_vector_index",
    priority: 0.2,
    searchableFields: ["title", "country", "type", "duration"],
  },
  expenses: {
    name: "expense_embeddings",
    indexName: "expense_vector_index",
    priority: 0.1,
    searchableFields: ["country", "university"],
  },
};

// Enhanced search options interface
interface SearchOptions {
  filter?: Record<string, unknown>;
  limit?: number;
  includeMetadata?: boolean;
  similarityThreshold?: number;
}

// Enhanced search result interface
interface SearchResult {
  pageContent: string;
  metadata: Record<string, unknown>;
  score?: number;
  domain: string;
}

// Vector store instances cache
const vectorStoreCache = new Map<string, MongoDBAtlasVectorSearch>();
const userVectorStoreCache = new Map<string, MongoDBAtlasVectorSearch>();

// Initialize embeddings instance
const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
});

// Enhanced vector store creation with metadata support
export async function getDomainVectorStore(
  domain: keyof typeof COLLECTION_CONFIG
) {
  const cacheKey = `domain_${domain}`;
  if (vectorStoreCache.has(cacheKey)) {
    return vectorStoreCache.get(cacheKey)!;
  }

  const client = await clientPromise;
  const db = client.db("wwah");
  const config = COLLECTION_CONFIG[domain];
  const collection = db.collection(config.name);

  const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
    collection,
    indexName: config.indexName,
    textKey: "text",
    embeddingKey: "embedding",
    // Note: metadataKey might not be supported in your version of @langchain/mongodb
    // If you need metadata support, you may need to handle it differently
  });

  vectorStoreCache.set(cacheKey, vectorStore);
  return vectorStore;
}

// Enhanced user vector store with caching
export async function getUserVectorStore(userId: string) {
  if (!userId) return null;

  const cacheKey = `user_${userId}`;
  if (userVectorStoreCache.has(cacheKey)) {
    return userVectorStoreCache.get(cacheKey)!;
  }

  const client = await clientPromise; // Fixed: was PromiseSend
  const db = client.db("wwah");
  const collection = db.collection("user_embeddings");

  const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
    collection,
    indexName: "user_vector_index",
    textKey: "text",
    embeddingKey: "embedding",
    // Note: metadataKey might not be supported in your version of @langchain/mongodb
  });

  userVectorStoreCache.set(cacheKey, vectorStore);
  return vectorStore;
}

// NEW: Enhanced search with metadata filtering
export async function searchWithMetadata(
  query: string,
  domain: keyof typeof COLLECTION_CONFIG,
  options: SearchOptions = {}
) {
  const vectorStore = await getDomainVectorStore(domain);
  const {
    filter = {},
    limit = 10,
    similarityThreshold = 0.7,
  } = options;

  try {
    // Perform similarity search with metadata filter
    const results = await vectorStore.similaritySearchWithScore(
      query,
      limit,
      filter
    );

    // Filter by similarity threshold and format results
    const filteredResults: SearchResult[] = results
      .filter(([, score]) => score >= similarityThreshold) // Fixed: removed unused parameter
      .map(([document, score]) => ({
        pageContent: document.pageContent,
        metadata: document.metadata,
        score,
        domain,
      }));

    return filteredResults;
  } catch (error) {
    console.error(`Error searching in ${domain}:`, error);
    return [];
  }
}

// NEW: Multi-domain search with metadata filtering
export async function searchMultipleDomains(
  query: string,
  domains: (keyof typeof COLLECTION_CONFIG)[],
  options: SearchOptions = {}
) {
  const searchPromises = domains.map(async (domain) => {
    const results = await searchWithMetadata(query, domain, options);
    return results.map((result) => ({ ...result, domain }));
  });

  const allResults = await Promise.all(searchPromises);
  return allResults.flat();
}

// NEW: Search courses with specific filters (example of enhanced functionality)
export async function searchCourses(
  query: string,
  filters: {
    country?: string;
    degree?: string;
    subject?: string;
    university?: string;
  } = {},
  options: SearchOptions = {}
) {
  const mongoFilter: Record<string, unknown> = {};

  // Build MongoDB filter from the enhanced metadata fields
  if (filters.country) mongoFilter.country = filters.country;
  if (filters.degree) mongoFilter.degree = filters.degree;
  if (filters.subject)
    mongoFilter.subject = { $regex: filters.subject, $options: "i" };
  if (filters.university)
    mongoFilter.university = { $regex: filters.university, $options: "i" };

  return await searchWithMetadata(query, "courses", {
    ...options,
    filter: mongoFilter,
  });
}

// NEW: Search universities with specific filters
export async function searchUniversities(
  query: string,
  filters: {
    country?: string;
    location?: string;
    ranking?: { qs?: number; the?: number };
  } = {},
  options: SearchOptions = {}
) {
  const mongoFilter: Record<string, unknown> = {};

  if (filters.country) mongoFilter.country = filters.country;
  if (filters.location)
    mongoFilter.location = { $regex: filters.location, $options: "i" };
  if (filters.ranking?.qs)
    mongoFilter["ranking.qs"] = { $lte: filters.ranking.qs };
  if (filters.ranking?.the)
    mongoFilter["ranking.the"] = { $lte: filters.ranking.the };

  return await searchWithMetadata(query, "universities", {
    ...options,
    filter: mongoFilter,
  });
}

// NEW: Search scholarships with specific filters
export async function searchScholarships(
  query: string,
  filters: {
    country?: string;
    type?: string;
    deadline?: string;
  } = {},
  options: SearchOptions = {}
) {
  const mongoFilter: Record<string, unknown> = {};

  if (filters.country) mongoFilter.country = filters.country;
  if (filters.type) mongoFilter.type = filters.type;
  if (filters.deadline) {
    // Example: search for scholarships with deadlines after a certain date
    mongoFilter.deadline = { $gte: filters.deadline };
  }

  return await searchWithMetadata(query, "scholarships", {
    ...options,
    filter: mongoFilter,
  });
}

// Enhanced get all domain vector stores
export async function getAllDomainVectorStores() {
  const stores = await Promise.all(
    Object.keys(COLLECTION_CONFIG).map(async (domain) => ({
      domain,
      store: await getDomainVectorStore(
        domain as keyof typeof COLLECTION_CONFIG
      ),
      config: COLLECTION_CONFIG[domain as keyof typeof COLLECTION_CONFIG],
    }))
  );
  return stores;
}

// NEW: Get search statistics for a domain
export async function getDomainStats(domain: keyof typeof COLLECTION_CONFIG) {
  const client = await clientPromise;
  const db = client.db("wwah");
  const collection = db.collection(COLLECTION_CONFIG[domain].name);

  const stats = {
    totalDocuments: await collection.countDocuments(),
    domain,
    collectionName: COLLECTION_CONFIG[domain].name,
    searchableFields: COLLECTION_CONFIG[domain].searchableFields,
  };

  return stats;
}

// NEW: Get aggregated search statistics
export async function getAllDomainStats() {
  const domains = Object.keys(
    COLLECTION_CONFIG
  ) as (keyof typeof COLLECTION_CONFIG)[];
  const statsPromises = domains.map(getDomainStats);
  const stats = await Promise.all(statsPromises);

  return {
    totalDocuments: stats.reduce((sum, stat) => sum + stat.totalDocuments, 0),
    domainStats: stats,
    lastUpdated: new Date().toISOString(),
  };
}

// Enhanced cache clearing functions
export function clearDomainCache(domain?: keyof typeof COLLECTION_CONFIG) {
  if (domain) {
    vectorStoreCache.delete(`domain_${domain}`);
  } else {
    // Clear all domain caches
    Object.keys(COLLECTION_CONFIG).forEach((d) => {
      vectorStoreCache.delete(`domain_${d}`);
    });
  }
}

export function clearUserCache(userId?: string) {
  if (userId) {
    userVectorStoreCache.delete(`user_${userId}`);
  } else {
    userVectorStoreCache.clear();
  }
}

// NEW: Clear all caches
export function clearAllCaches() {
  vectorStoreCache.clear();
  userVectorStoreCache.clear();
}

// Export configuration for external use
export { COLLECTION_CONFIG };
export type { SearchOptions, SearchResult };