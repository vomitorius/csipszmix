import { getSupabaseClient } from '../utils/supabase'
import { extractFactsFromChunks, convertFactsToDbFormat } from '../utils/facts'
import { analyzeEvent } from '../utils/rag'
import { z } from 'zod'

/**
 * POST /api/analyze
 * Analyze event and extract facts using LLM
 */

const AnalyzeRequestSchema = z.object({
  event_id: z.string(),
  force: z.boolean().optional().default(false)
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { event_id, force } = AnalyzeRequestSchema.parse(body)
    
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
    
    // Check if already analyzed (unless force)
    if (!force) {
      const { data: existingFacts } = await supabase
        .from('facts')
        .select('id')
        .eq('event_id', event_id)
        .limit(1)
      
      if (existingFacts && existingFacts.length > 0) {
        // Return existing analysis
        const { data: facts } = await supabase
          .from('facts')
          .select('*')
          .eq('event_id', event_id)
          .order('confidence', { ascending: false })
        
        return {
          success: true,
          message: 'Using cached analysis. Use force=true to re-analyze.',
          event_id,
          facts: facts || []
        }
      }
    }
    
    // Get sources and chunks for this event
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('id, url, content')
      .eq('event_id', event_id)
    
    if (sourcesError || !sources || sources.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'No sources found for this event. Run /api/crawl first.'
      })
    }
    
    console.log(`[Analyze] Found ${sources.length} sources for event ${event_id}`)
    
    // Get chunks from sources
    const { data: chunks, error: chunksError } = await supabase
      .from('chunks')
      .select('id, content, source_id')
      .in('source_id', sources.map(s => s.id))
      .limit(20) // Limit to top 20 chunks to save costs
    
    if (chunksError || !chunks || chunks.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'No chunks found. Embeddings may not have been generated.'
      })
    }
    
    console.log(`[Analyze] Processing ${chunks.length} chunks`)
    
    // Extract facts from chunks
    const extractedFacts = await extractFactsFromChunks(
      chunks.map(c => ({ id: c.id, content: c.content })),
      eventData.home,
      eventData.away,
      { maxChunks: 10 } // Process only top 10 chunks to save costs
    )
    
    console.log('[Analyze] Extracted facts:', {
      injuries: extractedFacts.injuries.length,
      suspensions: extractedFacts.suspensions.length,
      form: extractedFacts.form.length,
      tactical: extractedFacts.tactical.length
    })
    
    // Convert to database format and store
    const allDbFacts: Array<any> = []
    
    // Group facts by source to properly attribute them
    for (const source of sources) {
      const sourceChunks = chunks.filter(c => c.source_id === source.id)
      
      if (sourceChunks.length > 0) {
        // Extract facts from this source's chunks
        const sourceFacts = await extractFactsFromChunks(
          sourceChunks.slice(0, 3).map(c => ({ id: c.id, content: c.content })),
          eventData.home,
          eventData.away,
          { maxChunks: 3 }
        )
        
        const dbFacts = convertFactsToDbFormat(sourceFacts, event_id, source.id)
        allDbFacts.push(...dbFacts)
      }
    }
    
    console.log(`[Analyze] Storing ${allDbFacts.length} facts in database`)
    
    // Delete existing facts if force re-analyze
    if (force) {
      await supabase
        .from('facts')
        .delete()
        .eq('event_id', event_id)
    }
    
    // Insert facts
    if (allDbFacts.length > 0) {
      const { data: insertedFacts, error: insertError } = await supabase
        .from('facts')
        .insert(allDbFacts)
        .select()
      
      if (insertError) {
        console.error('[Analyze] Error inserting facts:', insertError)
        throw createError({
          statusCode: 500,
          message: 'Failed to save facts'
        })
      }
      
      console.log(`[Analyze] Stored ${insertedFacts?.length || 0} facts`)
      
      return {
        success: true,
        message: 'Analysis completed successfully',
        event_id,
        facts: insertedFacts || [],
        stats: {
          sources_analyzed: sources.length,
          chunks_processed: chunks.length,
          facts_extracted: insertedFacts?.length || 0
        }
      }
    } else {
      return {
        success: true,
        message: 'Analysis completed but no facts extracted',
        event_id,
        facts: [],
        stats: {
          sources_analyzed: sources.length,
          chunks_processed: chunks.length,
          facts_extracted: 0
        }
      }
    }
  } catch (error: any) {
    console.error('[Analyze] Error:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Analysis failed'
    })
  }
})
