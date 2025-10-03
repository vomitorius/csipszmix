import { generateEmbeddings, estimateTokens } from './llm'
import { splitIntoSentences } from './cleaner'

/**
 * Text chunking and embedding generation utilities
 */

interface TextChunk {
  content: string
  tokens: number
  startIndex: number
  endIndex: number
}

interface ChunkWithEmbedding extends TextChunk {
  embedding: number[]
}

/**
 * Split text into chunks by token count with overlap
 */
export function chunkText(
  text: string,
  options: {
    maxTokens?: number
    overlapTokens?: number
    preserveSentences?: boolean
  } = {}
): TextChunk[] {
  const maxTokens = options.maxTokens || 512
  const overlapTokens = options.overlapTokens || 128
  const preserveSentences = options.preserveSentences !== false
  
  const chunks: TextChunk[] = []
  
  if (preserveSentences) {
    // Split by sentences and group into chunks
    const sentences = splitIntoSentences(text)
    let currentChunk: string[] = []
    let currentTokens = 0
    let startIndex = 0
    
    for (const sentence of sentences) {
      const sentenceTokens = estimateTokens(sentence)
      
      if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
        // Save current chunk
        const content = currentChunk.join(' ')
        chunks.push({
          content,
          tokens: currentTokens,
          startIndex,
          endIndex: startIndex + content.length
        })
        
        // Start new chunk with overlap
        const overlapSentences = []
        let overlapTokenCount = 0
        
        for (let i = currentChunk.length - 1; i >= 0 && overlapTokenCount < overlapTokens; i--) {
          overlapSentences.unshift(currentChunk[i])
          overlapTokenCount += estimateTokens(currentChunk[i])
        }
        
        startIndex += content.length - overlapSentences.join(' ').length
        currentChunk = overlapSentences
        currentTokens = overlapTokenCount
      }
      
      currentChunk.push(sentence)
      currentTokens += sentenceTokens
    }
    
    // Add last chunk
    if (currentChunk.length > 0) {
      const content = currentChunk.join(' ')
      chunks.push({
        content,
        tokens: currentTokens,
        startIndex,
        endIndex: startIndex + content.length
      })
    }
  } else {
    // Simple character-based chunking
    const chunkSize = maxTokens * 4 // ~4 chars per token
    const overlapSize = overlapTokens * 4
    
    for (let i = 0; i < text.length; i += chunkSize - overlapSize) {
      const chunk = text.substring(i, i + chunkSize)
      chunks.push({
        content: chunk,
        tokens: estimateTokens(chunk),
        startIndex: i,
        endIndex: i + chunk.length
      })
    }
  }
  
  return chunks
}

/**
 * Generate embeddings for text chunks
 */
export async function generateChunkEmbeddings(
  chunks: TextChunk[],
  options: {
    batchSize?: number
  } = {}
): Promise<ChunkWithEmbedding[]> {
  const texts = chunks.map(c => c.content)
  
  try {
    const result = await generateEmbeddings(texts, {
      batchSize: options.batchSize || 50
    })
    
    return chunks.map((chunk, i) => ({
      ...chunk,
      embedding: result.embeddings[i]
    }))
  } catch (error) {
    console.error('Error generating chunk embeddings:', error)
    throw error
  }
}

/**
 * Process document: chunk and generate embeddings
 */
export async function processDocument(
  text: string,
  options: {
    maxTokens?: number
    overlapTokens?: number
    batchSize?: number
  } = {}
): Promise<ChunkWithEmbedding[]> {
  // Split into chunks
  const chunks = chunkText(text, {
    maxTokens: options.maxTokens,
    overlapTokens: options.overlapTokens,
    preserveSentences: true
  })
  
  console.log(`Split document into ${chunks.length} chunks`)
  
  // Generate embeddings
  const chunksWithEmbeddings = await generateChunkEmbeddings(chunks, {
    batchSize: options.batchSize
  })
  
  return chunksWithEmbeddings
}

/**
 * Batch process multiple documents
 */
export async function processDocuments(
  documents: Array<{ id: string; text: string }>,
  options: {
    maxTokens?: number
    overlapTokens?: number
    batchSize?: number
    concurrency?: number
  } = {}
): Promise<Array<{ documentId: string; chunks: ChunkWithEmbedding[] }>> {
  const concurrency = options.concurrency || 3
  const results: Array<{ documentId: string; chunks: ChunkWithEmbedding[] }> = []
  
  // Process documents in batches for rate limiting
  for (let i = 0; i < documents.length; i += concurrency) {
    const batch = documents.slice(i, i + concurrency)
    
    const batchResults = await Promise.all(
      batch.map(async (doc) => {
        try {
          const chunks = await processDocument(doc.text, options)
          return { documentId: doc.id, chunks }
        } catch (error) {
          console.error(`Error processing document ${doc.id}:`, error)
          return { documentId: doc.id, chunks: [] }
        }
      })
    )
    
    results.push(...batchResults)
    
    // Rate limiting delay between batches
    if (i + concurrency < documents.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return results
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  if (normA === 0 || normB === 0) {
    return 0
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Find most similar chunks to a query embedding
 */
export function findSimilarChunks(
  queryEmbedding: number[],
  chunks: ChunkWithEmbedding[],
  topK: number = 5
): Array<ChunkWithEmbedding & { similarity: number }> {
  const chunksWithSimilarity = chunks.map(chunk => ({
    ...chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
  }))
  
  return chunksWithSimilarity
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
}
