import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseClient } from '../utils/supabase'
import { generateVariants, type EventSelection } from '../utils/variants'

/**
 * POST /api/variants
 * Generate ticket variants for selected events
 * 
 * Body:
 * {
 *   event_ids: string[]
 *   budget_huf: number
 *   strategy: 'single' | 'cover-2' | 'cover-uncertain' | 'budget-optimized'
 *   max_variants?: number
 *   save?: boolean
 * }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { 
    event_ids, 
    budget_huf, 
    strategy = 'budget-optimized', 
    max_variants = 10,
    save = false 
  } = body

  // Validation
  if (!event_ids || !Array.isArray(event_ids) || event_ids.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'event_ids must be a non-empty array'
    })
  }

  if (!budget_huf || budget_huf <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'budget_huf must be greater than 0'
    })
  }

  if (!['single', 'cover-2', 'cover-uncertain', 'budget-optimized'].includes(strategy)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid strategy'
    })
  }

  console.log(`[Variants] Generating variants for ${event_ids.length} events with strategy: ${strategy}`)

  const supabase = getSupabaseClient()

  try {
    // Fetch events with their predictions
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .in('id', event_ids)

    if (eventsError || !eventsData || eventsData.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No events found for provided IDs'
      })
    }

    // Fetch predictions for these events
    const { data: predictionsData, error: predictionsError } = await supabase
      .from('predictions')
      .select('*')
      .in('event_id', event_ids)

    if (predictionsError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch predictions'
      })
    }

    // Build event selections
    const eventSelections: EventSelection[] = []

    for (const eventData of eventsData) {
      // Find prediction for this event
      const prediction = predictionsData?.find(p => p.event_id === eventData.id)
      
      if (!prediction) {
        console.warn(`[Variants] No prediction found for event ${eventData.id}, skipping`)
        continue
      }

      // Check odds availability
      if (!eventData.odds_home || !eventData.odds_draw || !eventData.odds_away) {
        console.warn(`[Variants] Event ${eventData.id} missing odds, skipping`)
        continue
      }

      eventSelections.push({
        eventId: eventData.id,
        home: eventData.home,
        away: eventData.away,
        prediction: {
          outcome: prediction.outcome,
          probabilities: {
            home: parseFloat(prediction.prob_home),
            draw: parseFloat(prediction.prob_draw),
            away: parseFloat(prediction.prob_away)
          },
          confidence: parseFloat(prediction.confidence)
        },
        odds: {
          home: parseFloat(eventData.odds_home),
          draw: parseFloat(eventData.odds_draw),
          away: parseFloat(eventData.odds_away)
        }
      })
    }

    if (eventSelections.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No valid events with predictions found. Please generate predictions first.'
      })
    }

    console.log(`[Variants] Processing ${eventSelections.length} valid events`)

    // Generate variants
    const result = generateVariants(eventSelections, budget_huf, strategy, max_variants)

    console.log(`[Variants] Generated ${result.tickets.length} tickets, total cost: ${result.totalCost.toFixed(2)} HUF`)

    // Save to database if requested
    if (save && result.tickets.length > 0) {
      // Create main ticket entry
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          name: `${strategy} - ${new Date().toLocaleDateString('hu-HU')}`,
          budget: budget_huf,
          events: result.tickets[0].picks.map(p => ({
            eventId: p.eventId,
            outcome: p.outcome,
            odds: p.odds
          })),
          total_odds: result.tickets[0].totalOdds,
          expected_return: result.tickets[0].expectedReturn
        })
        .select()
        .single()

      if (ticketError) {
        console.error('[Variants] Error saving ticket:', ticketError)
      } else {
        console.log(`[Variants] Saved ticket with ID: ${ticketData.id}`)

        // Save variants
        const variantsToSave = result.tickets.map(ticket => ({
          ticket_id: ticketData.id,
          events: ticket.picks.map(p => ({
            eventId: p.eventId,
            home: p.home,
            away: p.away,
            outcome: p.outcome,
            odds: p.odds,
            confidence: p.confidence
          })),
          total_odds: ticket.totalOdds,
          stake: ticket.stake,
          expected_return: ticket.expectedReturn
        }))

        const { error: variantsError } = await supabase
          .from('ticket_variants')
          .insert(variantsToSave)

        if (variantsError) {
          console.error('[Variants] Error saving variants:', variantsError)
        } else {
          console.log(`[Variants] Saved ${variantsToSave.length} variants`)
        }
      }
    }

    // Format response
    return {
      tickets: result.tickets.map(ticket => ({
        id: ticket.id,
        picks: ticket.picks,
        totalOdds: parseFloat(ticket.totalOdds.toFixed(2)),
        stake: parseFloat(ticket.stake.toFixed(2)),
        expectedReturn: parseFloat(ticket.expectedReturn.toFixed(2)),
        expectedValue: parseFloat(ticket.expectedValue.toFixed(2))
      })),
      totalCost: parseFloat(result.totalCost.toFixed(2)),
      coverage: {
        totalCombinations: result.coverage.totalCombinations,
        coveredCombinations: result.coverage.coveredCombinations,
        coveragePercent: parseFloat(result.coverage.coveragePercent.toFixed(2))
      },
      strategy: result.strategy
    }
  } catch (error: any) {
    console.error('[Variants] Error:', error)
    
    // If it's already an H3 error, rethrow it
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to generate variants'
    })
  }
})
