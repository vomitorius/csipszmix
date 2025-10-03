# M2: Scraping, NLP Pipeline & Fact Extraction - Implementation Guide

## Overview

This document describes the M2 milestone implementation: automated web source discovery, content analysis, and fact extraction using remote LLM APIs.

## Architecture

```
Event → Source Discovery → Web Scraping → Content Cleaning → 
→ Text Chunking → Embeddings → Storage (pgvector) → 
→ Fact Extraction (LLM) → Structured Facts → Database
```

## Core Components

### 1. LLM Provider (`server/utils/llm.ts`)

Multi-provider LLM client supporting:
- **OpenAI**: GPT-4o-mini, text-embedding-3-small
- **Groq**: llama-3.1-70b (fast, free tier)
- **Together.ai**: Various open-source models
- **Ollama**: Local inference (free)

**Key Functions:**
- `chatCompletion(messages, options)` - Chat completions with retry logic
- `generateEmbeddings(texts, options)` - Batch embedding generation
- `estimateTokens(text)` - Token estimation
- `logTokenUsage(operation, usage)` - Cost tracking

**Configuration:**
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
CHAT_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
```

### 2. Search & Discovery (`server/utils/search.ts`)

Discovers relevant sources for events using search engines.

**Key Functions:**
- `generateSearchKeywords(event)` - Generate search terms
- `generateSearchQueries(event)` - Create search queries
- `searchDuckDuckGo(query, limit)` - Execute search
- `discoverSources(event, options)` - Full discovery pipeline

**Example:**
```typescript
const sources = await discoverSources(event, {
  maxQueries: 5,
  resultsPerQuery: 5,
  maxTotalResults: 20
})
```

### 3. Web Crawler (`server/utils/crawler.ts`)

Playwright-based web scraping with robots.txt compliance.

**Key Functions:**
- `fetchPage(url, options)` - Fetch single page
- `fetchPages(urls, options)` - Batch fetching
- `checkRobotsTxt(url)` - Check crawling permission
- `closeBrowser()` - Cleanup

**Features:**
- Cookie banner dismissal
- Dynamic content rendering
- Timeout and error handling
- User-agent rotation

### 4. Content Cleaner (`server/utils/cleaner.ts`)

HTML to Markdown conversion with content extraction.

**Key Functions:**
- `cleanHtmlToMarkdown(html, url)` - Main cleaning function
- `detectLanguage(text)` - Language detection (franc)
- `extractMetadata(html)` - Extract metadata
- `normalizeMarkdown(markdown)` - Clean up markdown

**Uses:**
- @mozilla/readability - Main content extraction
- turndown - HTML→Markdown conversion
- jsdom - DOM manipulation

### 5. Text Chunking & Embeddings (`server/utils/embeddings.ts`)

Splits documents into chunks and generates embeddings.

**Key Functions:**
- `chunkText(text, options)` - Split into chunks
- `generateChunkEmbeddings(chunks)` - Generate embeddings
- `processDocument(text, options)` - Full pipeline
- `cosineSimilarity(a, b)` - Similarity calculation

**Configuration:**
```typescript
const chunks = await processDocument(text, {
  maxTokens: 512,
  overlapTokens: 128,
  batchSize: 50
})
```

### 6. Fact Extraction (`server/utils/facts.ts`)

Extracts structured facts using LLM prompts.

**Fact Types:**
- **Injuries**: Player, position, severity, expected return
- **Suspensions**: Player, reason, number of matches
- **Form**: Last 5 match results (W/L/D)
- **Tactical**: Coach changes, formation changes

**Key Functions:**
- `extractFacts(content, teamHome, teamAway)` - Extract from text
- `extractFactsFromChunks(chunks, ...)` - Extract from multiple chunks
- `convertFactsToDbFormat(facts, eventId, sourceId)` - Convert to DB format

**Output Schema (Zod validated):**
```typescript
{
  injuries: [{ player, position, severity, expected_return, description }],
  suspensions: [{ player, reason, matches, description }],
  form: [{ team, last_5, summary }],
  tactical: [{ type, description, impact }]
}
```

### 7. RAG System (`server/utils/rag.ts`)

Retrieval-Augmented Generation for question answering.

**Key Functions:**
- `retrieveRelevantChunks(query, eventId)` - Vector search
- `generateRAGAnswer(question, chunks)` - Generate answer
- `askQuestion(question, eventId)` - Full Q&A pipeline
- `analyzeEvent(eventId)` - Answer predefined questions

**Predefined Questions:**
- "Who is injured or unavailable?"
- "What is the team form in the last 5 matches?"
- "Are there any suspended players?"
- "Have there been any coaching or tactical changes?"

## API Endpoints

### POST /api/crawl

Crawl and process sources for an event.

**Request:**
```json
{
  "event_id": "evt_001",
  "force": false,
  "max_sources": 10
}
```

**Response:**
```json
{
  "success": true,
  "message": "Crawl completed successfully",
  "event_id": "evt_001",
  "stats": {
    "sources_found": 20,
    "pages_fetched": 18,
    "sources_stored": 15,
    "chunks_created": 87
  }
}
```

**Process:**
1. Discover sources via search
2. Fetch pages with Playwright
3. Clean HTML to Markdown
4. Chunk text
5. Generate embeddings
6. Store in database

### POST /api/analyze

Extract facts from crawled sources.

**Request:**
```json
{
  "event_id": "evt_001",
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Analysis completed successfully",
  "event_id": "evt_001",
  "facts": [...],
  "stats": {
    "sources_analyzed": 15,
    "chunks_processed": 87,
    "facts_extracted": 23
  }
}
```

**Process:**
1. Retrieve chunks from database
2. Extract facts using LLM
3. Deduplicate and validate
4. Store in facts table

### GET /api/sources/:event_id

Get sources and facts for an event.

**Response:**
```json
{
  "event": { "id", "home", "away", "league" },
  "sources": [...],
  "facts": {
    "injuries": [...],
    "suspensions": [...],
    "form": [...],
    "tactical": [...]
  },
  "stats": { "total_sources", "total_facts", "facts_by_type" }
}
```

## Database Schema

### sources table
```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY,
  event_id TEXT REFERENCES events(id),
  url TEXT NOT NULL,
  title TEXT,
  published_date TIMESTAMPTZ,
  content TEXT,
  raw_html TEXT,
  language TEXT DEFAULT 'hu',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### chunks table
```sql
CREATE TABLE chunks (
  id UUID PRIMARY KEY,
  source_id UUID REFERENCES sources(id),
  content TEXT NOT NULL,
  embedding vector(384),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### facts table
```sql
CREATE TABLE facts (
  id UUID PRIMARY KEY,
  event_id TEXT REFERENCES events(id),
  source_id UUID REFERENCES sources(id),
  fact_type TEXT CHECK (fact_type IN ('injury', 'suspension', 'form', 'coach_change', 'other')),
  entity TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence DECIMAL(3, 2),
  extracted_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Vector Search Function
```sql
CREATE FUNCTION search_chunks(
  query_embedding vector(384),
  event_id_filter text,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
)
RETURNS TABLE (id uuid, content text, source_id uuid, source_url text, distance float)
```

## UI Components

### Admin Crawl Page (`/admin/crawl`)

Features:
- Event selection list
- Crawl and analyze buttons
- Progress indicators
- Sources display with metadata
- Facts display grouped by type (color-coded)
- Confidence scores
- Loading states and error handling

### Event Details Enhancement

Added sections:
- Sources list (top 5 shown)
- Facts display by category:
  - 🤕 Injuries (red)
  - ⛔ Suspensions (orange)
  - 📊 Form (blue)
  - ⚙️ Tactical (gray)
- Link to admin panel
- Empty state with call-to-action

## Cost Management

### Token Usage Tracking

All LLM operations log token usage:
```typescript
logTokenUsage('fact_extraction', {
  promptTokens: 1500,
  completionTokens: 300,
  totalTokens: 1800
})
```

### Cost Estimates (OpenAI)

Per event (10 sources):
- Embeddings: 20,000 tokens × $0.02/1M = **$0.0004**
- Fact extraction: 5,000 tokens × $0.15/1M = **$0.00075**
- **Total: ~$0.001 - $0.08** (varies by content length)

### Cost Optimization

1. **Use free providers**:
   - Groq: Free tier with rate limits
   - Together.ai: Free tier available
   - Ollama: Completely free (local)

2. **Implement caching**:
   - Don't use `force=true` unnecessarily
   - Results are cached in database

3. **Limit processing**:
   - Reduce `max_sources`
   - Limit `maxChunks` in fact extraction

4. **Rate limiting**:
   - Built-in exponential backoff
   - Automatic retry logic

## Error Handling

### Retry Logic

All LLM operations have built-in retry:
```typescript
{
  retries: 3,
  exponentialBackoff: true,
  maxDelay: 10000
}
```

### Error Types

1. **API Errors** (401, 400): Don't retry
2. **Rate Limits** (429): Retry with backoff
3. **Network Errors**: Retry with backoff
4. **Timeout Errors**: Retry with longer timeout

### Graceful Degradation

- Empty results returned on failure
- Partial results stored if some succeed
- Clear error messages to user
- Logs for debugging

## Testing

### Manual Testing

1. Start dev server: `npm run dev`
2. Navigate to `/admin/crawl`
3. Select an event
4. Click "Start Crawl"
5. Wait for completion
6. Click "Analyze Facts"
7. Check event detail page for results

### API Testing

```bash
# Crawl
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"event_id":"evt_001","max_sources":5}'

# Analyze
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"event_id":"evt_001"}'

# Get sources
curl http://localhost:3000/api/sources/evt_001
```

## Production Deployment

### Prerequisites

1. **LLM API Key** (one of):
   - OpenAI API key
   - Groq API key
   - Together.ai API key
   - Ollama instance

2. **Playwright Browsers**:
```bash
npx playwright install chromium
```

3. **Environment Variables**:
```env
OPENAI_API_KEY=sk-...
LLM_PROVIDER=openai
CHAT_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
```

4. **Database Migration**:
```bash
# Run sql/schema.sql in Supabase SQL editor
# Includes vector search function
```

### Performance Considerations

- **Crawling**: ~2-5 minutes per event (10 sources)
- **Analysis**: ~30-60 seconds per event
- **Concurrent requests**: Limit to 2-3 simultaneous crawls
- **Rate limits**: Respect provider limits

## Troubleshooting

### Playwright Installation Issues

If browser installation fails:
```bash
# Set environment variable
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Or install manually in production
npx playwright install chromium
```

### Vector Search Not Working

1. Check pgvector extension is enabled
2. Verify `search_chunks` function exists
3. Check embedding dimensions match (384 for text-embedding-3-small)

### No Sources Found

1. Check robots.txt isn't blocking
2. Verify search queries are relevant
3. Try different search terms
4. Check network connectivity

### Fact Extraction Returns Empty

1. Verify LLM API key is valid
2. Check token limits aren't exceeded
3. Ensure content is relevant to football
4. Check LLM response format

## Future Improvements

- [ ] Add caching layer for search results
- [ ] Implement incremental crawling
- [ ] Add more search engines
- [ ] RSS feed integration
- [ ] WebSocket progress updates
- [ ] Batch processing UI
- [ ] Advanced filtering and sorting
- [ ] Export functionality (CSV/JSON)
- [ ] Scheduled crawling (cron jobs)
- [ ] Multi-language support improvements

## References

- Spec: `csipszmix_spec.md` - Sections 3, 5, 6
- OpenAI API: https://platform.openai.com/docs
- Groq: https://groq.com/
- Playwright: https://playwright.dev/
- Supabase pgvector: https://supabase.com/docs/guides/ai/vector-columns
