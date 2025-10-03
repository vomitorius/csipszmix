import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseClient } from '../utils/supabase'
import { generatePrediction } from '../utils/predictor'
import type { TippmixEvent } from '../utils/types'

/**
 * POST /api/predict
 * Generate AI prediction for a specific event
 * 
 * Body:
 * {
 *   event_id: string
 *   strategy?: 'baseline' | 'facts' | 'llm' | 'ensemble'
 *   force_refresh?: boolean
 * }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { event_id, strategy = 'ensemble', force_refresh = false } = body

  if (!event_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'event_id is required'
    })
  }

  console.log(`[Predict] Starting prediction for event ${event_id} with strategy: ${strategy}`)

  const supabase = getSupabaseClient()

  try {
    // Check if prediction already exists
    if (!force_refresh) {
      const { data: existingPrediction, error: checkError } = await supabase
        .from('predictions')
        .select('*')
        .eq('event_id', event_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existingPrediction && !checkError) {
        console.log(`[Predict] Using existing prediction for ${event_id}`)
        return {
          prediction: {
            id: existingPrediction.id,
            eventId: existingPrediction.event_id,
            outcome: existingPrediction.outcome,
            probabilities: {
              home: parseFloat(existingPrediction.prob_home),
              draw: parseFloat(existingPrediction.prob_draw),
              away: parseFloat(existingPrediction.prob_away)
            },
            confidence: parseFloat(existingPrediction.confidence),
            rationale: existingPrediction.rationale,
            topSources: existingPrediction.top_sources || [],
            createdAt: existingPrediction.created_at
          },
          cached: true
        }
      }
    }

    // Fetch event details
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single()

    if (eventError || !eventData) {
      throw createError({
        statusCode: 404,
        statusMessage: `Event not found: ${event_id}`
      })
    }

    // Check if odds are available
    if (!eventData.odds_home || !eventData.odds_draw || !eventData.odds_away) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Event does not have complete odds data'
      })
    }

    // Transform to TippmixEvent format
    const tippmixEvent: TippmixEvent = {
      id: eventData.id,
      league: eventData.league,
      home: eventData.home,
      away: eventData.away,
      startTime: eventData.start_time,
      odds: {
        home: parseFloat(eventData.odds_home),
        draw: parseFloat(eventData.odds_draw),
        away: parseFloat(eventData.odds_away)
      },
      status: eventData.status
    }

    // Fetch facts for this event
    const { data: factsData, error: factsError } = await supabase
      .from('facts')
      .select('*')
      .eq('event_id', event_id)

    const facts = factsData || []

    if (facts.length === 0) {
      console.warn(`[Predict] No facts found for ${event_id}, prediction may be less accurate`)
    } else {
      console.log(`[Predict] Found ${facts.length} facts for ${event_id}`)
    }

    // Fetch top sources for context
    const { data: sourcesData } = await supabase
      .from('sources')
      .select('url, title')
      .eq('event_id', event_id)
      .limit(5)

    const topSources = (sourcesData || []).map(s => s.url)

    // Generate prediction
    console.log(`[Predict] Generating ${strategy} prediction...`)
    const prediction = await generatePrediction(tippmixEvent, facts, { strategy })

    // Store prediction in database
    const { data: savedPrediction, error: saveError } = await supabase
      .from('predictions')
      .insert({
        event_id: event_id,
        outcome: prediction.outcome,
        prob_home: prediction.probabilities.home,
        prob_draw: prediction.probabilities.draw,
        prob_away: prediction.probabilities.away,
        rationale: prediction.rationale,
        confidence: prediction.confidence,
        top_sources: topSources
      })
      .select()
      .single()

    if (saveError) {
      console.error('[Predict] Error saving prediction:', saveError)
      // Continue anyway, we still return the prediction
    } else {
      console.log(`[Predict] Prediction saved with ID: ${savedPrediction.id}`)
    }

    return {
      prediction: {
        id: savedPrediction?.id,
        eventId: event_id,
        outcome: prediction.outcome,
        probabilities: prediction.probabilities,
        confidence: prediction.confidence,
        rationale: prediction.rationale,
        keyFactors: prediction.keyFactors,
        topSources: topSources,
        method: prediction.method
      },
      cached: false
    }
  } catch (error: any) {
    console.error('[Predict] Error:', error)
    
    // If it's already an H3 error, rethrow it
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to generate prediction'
    })
  }
})
