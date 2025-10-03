import OpenAI from 'openai'

/**
 * LLM API utilities with multi-provider support
 * Supports OpenAI, Groq, Together.ai, and Ollama
 */

interface LLMConfig {
  provider: 'openai' | 'groq' | 'together' | 'ollama'
  apiKey?: string
  baseURL?: string
  chatModel: string
  embeddingModel: string
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

interface EmbeddingResponse {
  embeddings: number[][]
  usage?: {
    totalTokens: number
  }
}

let llmConfig: LLMConfig | null = null
let openaiClient: OpenAI | null = null

/**
 * Initialize LLM configuration from environment
 */
function initLLMConfig(): LLMConfig {
  if (llmConfig) {
    return llmConfig
  }

  const config = useRuntimeConfig()
  const provider = (config.llmProvider || 'openai') as LLMConfig['provider']
  
  let apiKey: string | undefined
  let baseURL: string | undefined

  switch (provider) {
    case 'openai':
      apiKey = config.openaiApiKey
      break
    case 'groq':
      apiKey = config.groqApiKey
      baseURL = 'https://api.groq.com/openai/v1'
      break
    case 'together':
      apiKey = config.togetherApiKey
      baseURL = 'https://api.together.xyz/v1'
      break
    case 'ollama':
      baseURL = config.ollamaUrl || 'http://localhost:11434/v1'
      apiKey = 'ollama' // Ollama doesn't need real API key
      break
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`)
  }

  llmConfig = {
    provider,
    apiKey,
    baseURL,
    chatModel: config.chatModel || 'gpt-4o-mini',
    embeddingModel: config.embeddingModel || 'text-embedding-3-small'
  }

  return llmConfig
}

/**
 * Get or create OpenAI client
 */
function getOpenAIClient(): OpenAI {
  if (openaiClient) {
    return openaiClient
  }

  const config = initLLMConfig()
  
  if (!config.apiKey && config.provider !== 'ollama') {
    throw new Error(`API key not configured for provider: ${config.provider}`)
  }

  openaiClient = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL
  })

  return openaiClient
}

/**
 * Chat completion with retry logic and error handling
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
    jsonMode?: boolean
    retries?: number
  } = {}
): Promise<ChatCompletionResponse> {
  const config = initLLMConfig()
  const client = getOpenAIClient()
  
  const model = options.model || config.chatModel
  const retries = options.retries || 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined
      })

      const content = completion.choices[0]?.message?.content || ''
      
      return {
        content,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        } : undefined
      }
    } catch (error: any) {
      lastError = error
      console.error(`Chat completion attempt ${attempt + 1} failed:`, error.message)
      
      // Don't retry on certain errors
      if (error.status === 401 || error.status === 400) {
        throw error
      }
      
      // Exponential backoff
      if (attempt < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Chat completion failed after retries')
}

/**
 * Generate embeddings for texts
 */
export async function generateEmbeddings(
  texts: string[],
  options: {
    model?: string
    batchSize?: number
    retries?: number
  } = {}
): Promise<EmbeddingResponse> {
  const config = initLLMConfig()
  const client = getOpenAIClient()
  
  const model = options.model || config.embeddingModel
  const batchSize = options.batchSize || 100
  const retries = options.retries || 3
  
  const allEmbeddings: number[][] = []
  let totalTokens = 0

  // Process in batches to avoid rate limits
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    let lastError: Error | null = null

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await client.embeddings.create({
          model,
          input: batch
        })

        const embeddings = response.data.map(d => d.embedding)
        allEmbeddings.push(...embeddings)
        
        if (response.usage) {
          totalTokens += response.usage.total_tokens
        }
        
        break // Success, exit retry loop
      } catch (error: any) {
        lastError = error
        console.error(`Embedding generation attempt ${attempt + 1} failed:`, error.message)
        
        // Don't retry on certain errors
        if (error.status === 401 || error.status === 400) {
          throw error
        }
        
        // Exponential backoff
        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    if (allEmbeddings.length !== i + batch.length) {
      throw lastError || new Error('Embedding generation failed after retries')
    }

    // Rate limiting delay between batches
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return {
    embeddings: allEmbeddings,
    usage: { totalTokens }
  }
}

/**
 * Token counting utility (rough estimation)
 * For accurate counting, use tiktoken package
 */
export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4)
}

/**
 * Check if LLM provider is configured and available
 */
export async function checkLLMAvailability(): Promise<boolean> {
  try {
    const config = initLLMConfig()
    
    if (!config.apiKey && config.provider !== 'ollama') {
      return false
    }

    // Try a simple completion to verify connectivity
    const response = await chatCompletion(
      [{ role: 'user', content: 'Hello' }],
      { maxTokens: 5, retries: 1 }
    )
    
    return response.content.length > 0
  } catch (error) {
    console.error('LLM availability check failed:', error)
    return false
  }
}

/**
 * Log token usage for cost tracking
 */
export function logTokenUsage(
  operation: string,
  usage: { promptTokens?: number; completionTokens?: number; totalTokens: number }
) {
  const config = initLLMConfig()
  
  // Cost estimates (as of 2024)
  const costs = {
    'gpt-4o-mini': { input: 0.15, output: 0.60 }, // per 1M tokens
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    'text-embedding-3-small': { input: 0.02, output: 0 },
    'text-embedding-3-large': { input: 0.13, output: 0 }
  }

  const modelCost = costs[config.chatModel as keyof typeof costs] || costs['gpt-4o-mini']
  
  const inputCost = (usage.promptTokens || 0) * modelCost.input / 1_000_000
  const outputCost = (usage.completionTokens || 0) * modelCost.output / 1_000_000
  const totalCost = inputCost + outputCost

  console.log(`[LLM Usage] ${operation}:`, {
    provider: config.provider,
    model: config.chatModel,
    tokens: usage,
    estimatedCost: `$${totalCost.toFixed(6)}`
  })
}
