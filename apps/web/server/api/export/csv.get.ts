import { defineEventHandler, getQuery, createError, setHeader } from 'h3'
import { getSupabaseClient } from '../../utils/supabase'
import Papa from 'papaparse'

/**
 * GET /api/export/csv
 * Export predictions or tickets to CSV format
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
      // Export predictions
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
            odds_away
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

      // Transform to CSV format
      const csvData = data.map(pred => ({
        'Event ID': pred.event_id,
        'League': (pred.events as any)?.league || '',
        'Home Team': (pred.events as any)?.home || '',
        'Away Team': (pred.events as any)?.away || '',
        'Kickoff': (pred.events as any)?.start_time || '',
        'Prediction': pred.outcome,
        'Home Win %': (parseFloat(pred.prob_home) * 100).toFixed(1),
        'Draw %': (parseFloat(pred.prob_draw) * 100).toFixed(1),
        'Away Win %': (parseFloat(pred.prob_away) * 100).toFixed(1),
        'Confidence %': (parseFloat(pred.confidence) * 100).toFixed(1),
        'Odds Home': (pred.events as any)?.odds_home || '',
        'Odds Draw': (pred.events as any)?.odds_draw || '',
        'Odds Away': (pred.events as any)?.odds_away || '',
        'Rationale': pred.rationale || '',
        'Created At': pred.created_at
      }))

      const csv = Papa.unparse(csvData)

      // Set headers for file download
      setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
      setHeader(event, 'Content-Disposition', `attachment; filename="predictions_${new Date().toISOString().split('T')[0]}.csv"`)

      return csv
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

      const variants = variantsData || []

      // Transform to CSV format
      const csvData: any[] = []

      variants.forEach((variant, idx) => {
        const events = variant.events as any[]
        events.forEach(evt => {
          csvData.push({
            'Variant #': idx + 1,
            'Event': `${evt.home} vs ${evt.away}`,
            'Pick': evt.outcome,
            'Odds': evt.odds,
            'Confidence %': evt.confidence ? (evt.confidence * 100).toFixed(1) : '',
            'Total Odds': variant.total_odds,
            'Stake': variant.stake,
            'Expected Return': variant.expected_return
          })
        })
      })

      if (csvData.length === 0) {
        throw createError({
          statusCode: 404,
          statusMessage: 'No variants found for this ticket'
        })
      }

      const csv = Papa.unparse(csvData)

      // Set headers for file download
      setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
      setHeader(event, 'Content-Disposition', `attachment; filename="ticket_${ticket_id}_${new Date().toISOString().split('T')[0]}.csv"`)

      return csv
    }
  } catch (error: any) {
    console.error('[Export CSV] Error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Export failed'
    })
  }
})
