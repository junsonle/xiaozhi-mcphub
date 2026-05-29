import { VectorEmbedding } from '../entities/index.js';
import BaseRepository from './BaseRepository.js';

const toVector = (embedding: number[] | string | undefined): number[] => {
  if (!embedding) return [];
  if (Array.isArray(embedding)) return embedding;
  if (typeof embedding === 'string') {
    try {
      const parsed = JSON.parse(embedding);
      return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch {
      return embedding
        .replace(/^\[/, '')
        .replace(/\]$/, '')
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value));
    }
  }
  return [];
};

const cosineSimilarity = (a: number[], b: number[]): number => {
  if (!a.length || !b.length || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

export class VectorEmbeddingRepository extends BaseRepository<VectorEmbedding> {
  constructor() {
    super('vectorEmbeddings');
  }

  async findByContentIdentity(
    contentType: string,
    contentId: string,
  ): Promise<VectorEmbedding | null> {
    return (
      this.getCollection().find(
        (embedding) =>
          embedding.content_type === contentType && embedding.content_id === contentId,
      ) || null
    );
  }

  async saveEmbedding(
    contentType: string,
    contentId: string,
    textContent: string,
    embedding: number[],
    metadata: Record<string, any> = {},
    model = 'default',
  ): Promise<VectorEmbedding> {
    const existing = await this.findByContentIdentity(contentType, contentId);

    const entity: Partial<VectorEmbedding> = {
      ...(existing || {}),
      content_type: contentType,
      content_id: contentId,
      text_content: textContent,
      embedding,
      dimensions: embedding.length,
      metadata,
      model,
    };

    return await this.save(entity);
  }

  async searchSimilar(
    embedding: number[],
    limit = 10,
    threshold = 0.7,
    contentTypes?: string[],
  ): Promise<Array<{ embedding: VectorEmbedding; similarity: number }>> {
    const shouldReturnAll = !embedding.length || threshold < 0;

    const results = this.getCollection()
      .filter((item) => !contentTypes?.length || contentTypes.includes(item.content_type))
      .map((item) => ({
        embedding: item,
        similarity: shouldReturnAll ? 1 : cosineSimilarity(embedding, toVector(item.embedding as any)),
      }))
      .filter((item) => shouldReturnAll || item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return results;
  }

  async searchByText(
    text: string,
    getEmbeddingFunc: (text: string) => Promise<number[]>,
    limit = 10,
    threshold = 0.7,
    contentTypes?: string[],
  ): Promise<Array<{ embedding: VectorEmbedding; similarity: number }>> {
    try {
      const embedding = await getEmbeddingFunc(text);
      return this.searchSimilar(embedding, limit, threshold, contentTypes);
    } catch (error) {
      console.error('Error searching by text:', error);
      return [];
    }
  }
}



export default VectorEmbeddingRepository;
