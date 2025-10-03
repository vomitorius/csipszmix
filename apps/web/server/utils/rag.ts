import { chatCompletion, generateEmbeddings, logTokenUsage } from './llm'
import { getSupabaseClient } from './supabase'

/**
 * RAG (Retrieval-Augmented Generation) utilities
 * Question-answering system for football match analysis
 */

interface RetrievedChunk {
  id: string
  content: string
  sourceId: string
  sourceUrl?: string
  similarity: number
}

interface RAGResponse {
  answer: string
  sources: Array<{
    chunkId: string
    sourceId: string
    url?: string
    relevance: number
  }>
  confidence: number
}

/**
 * Retrieve relevant chunks from database using vector similarity
 */
export async function retrieveRelevantChunks(
  query: string,
  eventId: string,
  options: {
    limit?: number
    similarityThreshold?: number
  } = {}
): Promise<RetrievedChunk[]> {
  const limit = options.limit || 5
  const threshold = options.similarityThreshold || 0.7
  
  try {
    // Generate embedding for query
    const embeddingResult = await generateEmbeddings([query])
    const queryEmbedding = embeddingResult.embeddings[0]
    
    const supabase = getSupabaseClient()
    
    // Vector similarity search
    // Note: pgvector uses <=> operator for cosine distance (1 - cosine similarity)
    const { data, error } = await supabase.rpc('search_chunks', {
      query_embedding: queryEmbedding,
      event_id_filter: eventId,
      match_threshold: 1 - threshold, // Convert similarity to distance
      match_count: limit
    })
    
    if (error) {
      console.error('Error retrieving chunks:', error)
      return []
    }
    
    return (data || []).map((row: any) => ({
      id: row.id,
      content: row.content,
      sourceId: row.source_id,
      sourceUrl: row.source_url,
      similarity: 1 - row.distance // Convert distance back to similarity
    }))
  } catch (error) {
    console.error('Error in retrieveRelevantChunks:', error)
    return []
  }
}

/**
 * Generate answer using RAG
 */
export async function generateRAGAnswer(
  question: string,
  chunks: RetrievedChunk[],
  options: {
    maxContextLength?: number
    temperature?: number
  } = {}
): Promise<RAGResponse> {
  const maxContextLength = options.maxContextLength || 4000
  
  // Build context from chunks
  let context = ''
  const usedSources: Array<{ chunkId: string; sourceId: string; url?: string; relevance: number }> = []
  
  for (const chunk of chunks) {
    if (context.length + chunk.content.length > maxContextLength) {
      break
    }
    
    context += `\n\n[Source ${usedSources.length + 1}]:\n${chunk.content}`
    usedSources.push({
      chunkId: chunk.id,
      sourceId: chunk.sourceId,
      url: chunk.sourceUrl,
      relevance: chunk.similarity
    })
  }
  
  const prompt = `Based on the following information about a football match, please answer the question.

CONTEXT:
${context}

QUESTION: ${question}

Please provide a clear, concise answer based ONLY on the information provided above. If the context doesn't contain enough information to answer the question, say so. Include references to the source numbers when citing specific information.`
  
  try {
    const response = await chatCompletion(
      [
        {
          role: 'system',
          content: 'You are a knowledgeable football analyst. Provide accurate answers based on the given context. Be specific and cite sources.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        temperature: options.temperature || 0.3,
        maxTokens: 500
      }
    )
    
    if (response.usage) {
      logTokenUsage('rag_answer', response.usage)
    }
    
    // Calculate confidence based on source relevance
    const avgRelevance = usedSources.reduce((sum, s) => sum + s.relevance, 0) / usedSources.length
    const confidence = Math.min(avgRelevance * 1.2, 1.0)
    
    return {
      answer: response.content,
      sources: usedSources,
      confidence
    }
  } catch (error) {
    console.error('Error generating RAG answer:', error)
    
    return {
      answer: 'Sorry, I encountered an error while generating the answer.',
      sources: [],
      confidence: 0
    }
  }
}

/**
 * Ask a question about an event using RAG
 */
export async function askQuestion(
  question: string,
  eventId: string,
  options: {
    retrievalLimit?: number
    contextLength?: number
  } = {}
): Promise<RAGResponse> {
  // Retrieve relevant chunks
  const chunks = await retrieveRelevantChunks(question, eventId, {
    limit: options.retrievalLimit || 5
  })
  
  if (chunks.length === 0) {
    return {
      answer: 'No relevant information found for this question.',
      sources: [],
      confidence: 0
    }
  }
  
  // Generate answer
  return generateRAGAnswer(question, chunks, {
    maxContextLength: options.contextLength
  })
}

/**
 * Predefined questions for match analysis
 */
export const PREDEFINED_QUESTIONS = [
  'Who is injured or unavailable?',
  'Ki hiányzik sérülés miatt?',
  'What is the team form in the last 5 matches?',
  'Milyen a csapat formája az utolsó 5 meccsen?',
  'Are there any suspended players?',
  'Van eltiltott játékos?',
  'Have there been any coaching or tactical changes?',
  'Voltak edzőváltások vagy taktikai változások?',
  'What are the key factors that could affect the match?',
  'Mik a mérkőzést befolyásoló kulcstényezők?'
]

/**
 * Answer all predefined questions for an event
 */
export async function analyzeEvent(eventId: string): Promise<{
  questions: Array<{
    question: string
    answer: RAGResponse
  }>
}> {
  const results = await Promise.all(
    PREDEFINED_QUESTIONS.map(async question => ({
      question,
      answer: await askQuestion(question, eventId)
    }))
  )
  
  return { questions: results }
}

/**
 * Create database function for vector search (SQL)
 * This should be run in Supabase to create the function
 */
export const VECTOR_SEARCH_FUNCTION_SQL = `
-- Function for vector similarity search
CREATE OR REPLACE FUNCTION search_chunks(
  query_embedding vector(384),
  event_id_filter text,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  source_id uuid,
  source_url text,
  distance float
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    c.id,
    c.content,
    c.source_id,
    s.url as source_url,
    (c.embedding <=> query_embedding) as distance
  FROM chunks c
  JOIN sources s ON c.source_id = s.id
  WHERE s.event_id = event_id_filter
    AND (c.embedding <=> query_embedding) < match_threshold
  ORDER BY distance
  LIMIT match_count;
$$;

-- Alternative for text-embedding-3-small (384 dimensions)
-- If using different model, adjust vector size accordingly

-- For text-embedding-3-large (1536 dimensions):
-- CREATE OR REPLACE FUNCTION search_chunks_large(
--   query_embedding vector(1536),
--   ...
`
