import { getSupabaseClient } from '../utils/supabase'
import { discoverSources } from '../utils/search'
import { fetchPages } from '../utils/crawler'
import { cleanHtmlToMarkdown } from '../utils/cleaner'
import { processDocument } from '../utils/embeddings'
import { z } from 'zod'

/**
 * POST /api/crawl
 * Crawl and process sources for an event
 */

const CrawlRequestSchema = z.object({
  event_id: z.string(),
  force: z.boolean().optional().default(false),
  max_sources: z.number().optional().default(10)
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { event_id, force, max_sources } = CrawlRequestSchema.parse(body)
    
    const supabase = getSupabaseClient()
    
    // Get event details
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single()
    
    if (eventError || !eventData) {
      throw createError({
        statusCode: 404,
        message: 'Event not found'
      })
    }
    
    // Check if already crawled (unless force)
    if (!force) {
      const { data: existingSources } = await supabase
        .from('sources')
        .select('id')
        .eq('event_id', event_id)
        .limit(1)
      
      if (existingSources && existingSources.length > 0) {
        return {
          success: false,
          message: 'Event already crawled. Use force=true to re-crawl.',
          event_id
        }
      }
    }
    
    // Transform event data to match TippmixEvent interface
    const tippmixEvent = {
      id: eventData.id,
      league: eventData.league,
      home: eventData.home,
      away: eventData.away,
      startTime: eventData.start_time,
      odds: {
        home: Number(eventData.odds_home),
        draw: Number(eventData.odds_draw),
        away: Number(eventData.odds_away)
      },
      status: eventData.status
    }
    
    // Phase 1: Discover sources
    console.log(`[Crawl] Discovering sources for event ${event_id}`)
    const searchResults = await discoverSources(tippmixEvent, {
      maxTotalResults: max_sources
    })
    
    if (searchResults.length === 0) {
      return {
        success: false,
        message: 'No sources found',
        event_id
      }
    }
    
    console.log(`[Crawl] Found ${searchResults.length} potential sources`)
    
    // Phase 2: Fetch pages
    console.log(`[Crawl] Fetching pages...`)
    const urls = searchResults.map(r => r.url)
    const crawlResults = await fetchPages(urls, {
      concurrency: 2,
      timeout: 30000,
      delay: 2000
    })
    
    const successfulCrawls = crawlResults.filter(r => !r.error && r.html.length > 0)
    console.log(`[Crawl] Successfully fetched ${successfulCrawls.length}/${crawlResults.length} pages`)
    
    // Phase 3: Clean and store sources
    const sourcesData: Array<{
      event_id: string
      url: string
      title: string
      published_date: string | null
      content: string
      raw_html: string
      language: string
    }> = []
    
    for (const crawl of successfulCrawls) {
      const cleaned = cleanHtmlToMarkdown(crawl.html, crawl.url)
      
      if (cleaned && cleaned.markdown.length > 100) {
        sourcesData.push({
          event_id,
          url: crawl.url,
          title: cleaned.title || crawl.title,
          published_date: crawl.publishedDate || null,
          content: cleaned.markdown,
          raw_html: crawl.html,
          language: cleaned.language
        })
      }
    }
    
    console.log(`[Crawl] Cleaned ${sourcesData.length} sources`)
    
    if (sourcesData.length === 0) {
      return {
        success: false,
        message: 'No valid content extracted',
        event_id
      }
    }
    
    // Store sources in database
    const { data: insertedSources, error: insertError } = await supabase
      .from('sources')
      .insert(sourcesData)
      .select('id, url, content')
    
    if (insertError) {
      console.error('[Crawl] Error inserting sources:', insertError)
      throw createError({
        statusCode: 500,
        message: 'Failed to save sources'
      })
    }
    
    console.log(`[Crawl] Stored ${insertedSources?.length || 0} sources in database`)
    
    // Phase 4: Generate embeddings for chunks
    let totalChunks = 0
    
    for (const source of insertedSources || []) {
      try {
        console.log(`[Crawl] Processing embeddings for source ${source.id}`)
        
        const chunksWithEmbeddings = await processDocument(source.content, {
          maxTokens: 512,
          overlapTokens: 128
        })
        
        // Prepare chunks for insertion
        const chunksData = chunksWithEmbeddings.map(chunk => ({
          source_id: source.id,
          content: chunk.content,
          embedding: JSON.stringify(chunk.embedding),
          metadata: {
            tokens: chunk.tokens,
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex
          }
        }))
        
        // Insert chunks
        const { error: chunksError } = await supabase
          .from('chunks')
          .insert(chunksData)
        
        if (chunksError) {
          console.error(`[Crawl] Error inserting chunks for source ${source.id}:`, chunksError)
        } else {
          totalChunks += chunksData.length
          console.log(`[Crawl] Stored ${chunksData.length} chunks for source ${source.id}`)
        }
      } catch (error) {
        console.error(`[Crawl] Error processing source ${source.id}:`, error)
      }
    }
    
    return {
      success: true,
      message: 'Crawl completed successfully',
      event_id,
      stats: {
        sources_found: searchResults.length,
        pages_fetched: successfulCrawls.length,
        sources_stored: insertedSources?.length || 0,
        chunks_created: totalChunks
      }
    }
  } catch (error: any) {
    console.error('[Crawl] Error:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Crawl failed'
    })
  }
})
