import { defineEventHandler, getQuery, createError, setHeader } from 'h3'
import { getSupabaseClient } from '../../utils/supabase'

/**
 * GET /api/export/json
 * Export predictions or tickets to JSON format
 * 
 * Query params:
 * - type: 'predictions' | 'tickets'
 * - event_ids?: string (comma-separated) - for predictions
 * - ticket_id?: string - for tickets
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { type, event_ids, ticket_id } = query

  if (!type || (type !== 'predictions' && type !== 'tickets')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'type must be either "predictions" or "tickets"'
    })
  }

  const supabase = getSupabaseClient()

  try {
    if (type === 'predictions') {
      // Export predictions with full context
      let queryBuilder = supabase
        .from('predictions')
        .select(`
          *,
          events (
            id,
            league,
            home,
            away,
            start_time,
            odds_home,
            odds_draw,
            odds_away,
            status
          )
        `)
        .order('created_at', { ascending: false })

      // Filter by event IDs if provided
      if (event_ids && typeof event_ids === 'string') {
        const ids = event_ids.split(',').map(id => id.trim())
        queryBuilder = queryBuilder.in('event_id', ids)
      }

      const { data, error } = await queryBuilder

      if (error) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch predictions'
        })
      }

      if (!data || data.length === 0) {
        throw createError({
          statusCode: 404,
          statusMessage: 'No predictions found'
        })
      }

      // Fetch facts for these predictions
      const eventIds = data.map(p => p.event_id)
      const { data: factsData } = await supabase
        .from('facts')
        .select('*')
        .in('event_id', eventIds)

      const factsByEvent: Record<string, any[]> = {}
      factsData?.forEach(fact => {
        if (!factsByEvent[fact.event_id]) {
          factsByEvent[fact.event_id] = []
        }
        factsByEvent[fact.event_id].push(fact)
      })

      // Transform to structured JSON
      const jsonData = {
        export_date: new Date().toISOString(),
        export_type: 'predictions',
        total_predictions: data.length,
        predictions: data.map(pred => ({
          prediction_id: pred.id,
          event: {
            id: pred.event_id,
            league: (pred.events as any)?.league,
            home_team: (pred.events as any)?.home,
            away_team: (pred.events as any)?.away,
            kickoff: (pred.events as any)?.start_time,
            status: (pred.events as any)?.status,
            odds: {
              home: parseFloat((pred.events as any)?.odds_home),
              draw: parseFloat((pred.events as any)?.odds_draw),
              away: parseFloat((pred.events as any)?.odds_away)
            }
          },
          prediction: {
            outcome: pred.outcome,
            probabilities: {
              home: parseFloat(pred.prob_home),
              draw: parseFloat(pred.prob_draw),
              away: parseFloat(pred.prob_away)
            },
            confidence: parseFloat(pred.confidence),
            rationale: pred.rationale,
            top_sources: pred.top_sources
          },
          facts: factsByEvent[pred.event_id] || [],
          created_at: pred.created_at,
          updated_at: pred.updated_at
        }))
      }

      const json = JSON.stringify(jsonData, null, 2)

      // Set headers for file download
      setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
      setHeader(event, 'Content-Disposition', `attachment; filename="predictions_${new Date().toISOString().split('T')[0]}.json"`)

      return json
    } else {
      // Export tickets
      if (!ticket_id) {
        throw createError({
          statusCode: 400,
          statusMessage: 'ticket_id is required for tickets export'
        })
      }

      // Fetch ticket and variants
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticket_id)
        .single()

      if (ticketError || !ticketData) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Ticket not found'
        })
      }

      const { data: variantsData, error: variantsError } = await supabase
        .from('ticket_variants')
        .select('*')
        .eq('ticket_id', ticket_id)

      if (variantsError) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch variants'
        })
      }

      // Transform to structured JSON
      const jsonData = {
        export_date: new Date().toISOString(),
        export_type: 'ticket',
        ticket: {
          id: ticketData.id,
          name: ticketData.name,
          budget: parseFloat(ticketData.budget),
          total_odds: parseFloat(ticketData.total_odds),
          expected_return: parseFloat(ticketData.expected_return),
          created_at: ticketData.created_at
        },
        variants: variantsData?.map(variant => ({
          id: variant.id,
          events: variant.events,
          total_odds: parseFloat(variant.total_odds),
          stake: parseFloat(variant.stake),
          expected_return: parseFloat(variant.expected_return),
          created_at: variant.created_at
        })) || []
      }

      const json = JSON.stringify(jsonData, null, 2)

      // Set headers for file download
      setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
      setHeader(event, 'Content-Disposition', `attachment; filename="ticket_${ticket_id}_${new Date().toISOString().split('T')[0]}.json"`)

      return json
    }
  } catch (error: any) {
    console.error('[Export JSON] Error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Export failed'
    })
  }
})
