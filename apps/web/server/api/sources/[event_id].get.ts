import { getSupabaseClient } from '../../utils/supabase'

/**
 * GET /api/sources/:event_id
 * Get sources and facts for an event
 */

export default defineEventHandler(async (event) => {
  try {
    const event_id = getRouterParam(event, 'event_id')
    
    if (!event_id) {
      throw createError({
        statusCode: 400,
        message: 'Event ID is required'
      })
    }
    
    const supabase = getSupabaseClient()
    
    // Check if event exists
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, home, away, league')
      .eq('id', event_id)
      .single()
    
    if (eventError || !eventData) {
      throw createError({
        statusCode: 404,
        message: 'Event not found'
      })
    }
    
    // Get sources
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('id, url, title, published_date, language, created_at')
      .eq('event_id', event_id)
      .order('created_at', { ascending: false })
    
    if (sourcesError) {
      console.error('Error fetching sources:', sourcesError)
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch sources'
      })
    }
    
    // Get facts
    const { data: facts, error: factsError } = await supabase
      .from('facts')
      .select('id, fact_type, entity, description, confidence, source_id, extracted_at')
      .eq('event_id', event_id)
      .order('confidence', { ascending: false })
    
    if (factsError) {
      console.error('Error fetching facts:', factsError)
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch facts'
      })
    }
    
    // Group facts by type
    const factsByType = {
      injuries: facts?.filter(f => f.fact_type === 'injury') || [],
      suspensions: facts?.filter(f => f.fact_type === 'suspension') || [],
      form: facts?.filter(f => f.fact_type === 'form') || [],
      tactical: facts?.filter(f => f.fact_type === 'coach_change') || [],
      other: facts?.filter(f => f.fact_type === 'other') || []
    }
    
    return {
      event: {
        id: eventData.id,
        home: eventData.home,
        away: eventData.away,
        league: eventData.league
      },
      sources: sources || [],
      facts: factsByType,
      stats: {
        total_sources: sources?.length || 0,
        total_facts: facts?.length || 0,
        facts_by_type: {
          injuries: factsByType.injuries.length,
          suspensions: factsByType.suspensions.length,
          form: factsByType.form.length,
          tactical: factsByType.tactical.length,
          other: factsByType.other.length
        }
      }
    }
  } catch (error: any) {
    console.error('[Sources] Error:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch sources'
    })
  }
})
