import { chatCompletion, logTokenUsage } from './llm'
import { z } from 'zod'

/**
 * Fact extraction utilities using LLM
 * Extracts structured facts from text about football matches
 */

// Zod schemas for validation
const InjurySchema = z.object({
  player: z.string(),
  position: z.string().optional(),
  severity: z.enum(['minor', 'major', 'unknown']),
  expected_return: z.string().nullable(),
  description: z.string().optional()
})

const SuspensionSchema = z.object({
  player: z.string(),
  reason: z.string(),
  matches: z.number().optional(),
  description: z.string().optional()
})

const FormSchema = z.object({
  team: z.string(),
  last_5: z.array(z.enum(['W', 'L', 'D'])),
  summary: z.string()
})

const TacticalChangeSchema = z.object({
  type: z.enum(['coach_change', 'formation', 'tactical', 'other']),
  description: z.string(),
  impact: z.string().optional()
})

const FactsSchema = z.object({
  injuries: z.array(InjurySchema),
  suspensions: z.array(SuspensionSchema),
  form: z.array(FormSchema),
  tactical: z.array(TacticalChangeSchema)
})

export type ExtractedFacts = z.infer<typeof FactsSchema>
export type Injury = z.infer<typeof InjurySchema>
export type Suspension = z.infer<typeof SuspensionSchema>
export type Form = z.infer<typeof FormSchema>
export type TacticalChange = z.infer<typeof TacticalChangeSchema>

/**
 * Create fact extraction prompt
 */
function createFactExtractionPrompt(content: string, teamHome: string, teamAway: string): string {
  return `You are a football match analyst. Analyze the following text about a football match between ${teamHome} and ${teamAway}.

Extract KEY FACTS in the following categories:
1. **Injuries**: Players who are injured, their position, severity, and expected return date
2. **Suspensions**: Players who are suspended and the reason
3. **Form**: Recent match results (last 5 matches) as W (win), L (loss), or D (draw)
4. **Tactical Changes**: Coach changes, formation changes, or significant tactical adjustments

IMPORTANT RULES:
- Only include facts that are explicitly mentioned or strongly implied in the text
- If no facts are found in a category, return an empty array
- Be specific and accurate
- For injuries, severity should be "minor" (weeks), "major" (months), or "unknown"
- For form, provide exactly 5 results in order from oldest to newest
- Expected return dates should be in ISO format (YYYY-MM-DD) or null if unknown

TEXT TO ANALYZE:
${content}

Respond ONLY with valid JSON in this exact format:
{
  "injuries": [
    {
      "player": "Player Name",
      "position": "Forward",
      "severity": "major",
      "expected_return": "2024-03-15",
      "description": "Brief description"
    }
  ],
  "suspensions": [
    {
      "player": "Player Name",
      "reason": "Red card in previous match",
      "matches": 1,
      "description": "Additional context"
    }
  ],
  "form": [
    {
      "team": "${teamHome}",
      "last_5": ["W", "L", "D", "W", "L"],
      "summary": "Brief summary of recent form"
    }
  ],
  "tactical": [
    {
      "type": "coach_change",
      "description": "Description of the change",
      "impact": "Expected impact on performance"
    }
  ]
}`
}

/**
 * Extract facts from text using LLM
 */
export async function extractFacts(
  content: string,
  teamHome: string,
  teamAway: string,
  options: {
    maxLength?: number
  } = {}
): Promise<ExtractedFacts> {
  // Truncate content if too long (to save tokens)
  const maxLength = options.maxLength || 8000
  const truncated = content.length > maxLength 
    ? content.substring(0, maxLength) + '...'
    : content
  
  const prompt = createFactExtractionPrompt(truncated, teamHome, teamAway)
  
  try {
    const response = await chatCompletion(
      [
        {
          role: 'system',
          content: 'You are a football analyst expert at extracting factual information from text. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        temperature: 0.1, // Low temperature for factual extraction
        maxTokens: 2000,
        jsonMode: true
      }
    )
    
    // Log token usage
    if (response.usage) {
      logTokenUsage('fact_extraction', response.usage)
    }
    
    // Parse and validate JSON
    const parsed = JSON.parse(response.content)
    const validated = FactsSchema.parse(parsed)
    
    return validated
  } catch (error) {
    console.error('Error extracting facts:', error)
    
    // Return empty structure on error
    return {
      injuries: [],
      suspensions: [],
      form: [],
      tactical: []
    }
  }
}

/**
 * Extract facts from multiple text chunks and merge results
 */
export async function extractFactsFromChunks(
  chunks: Array<{ content: string; id: string }>,
  teamHome: string,
  teamAway: string,
  options: {
    maxChunks?: number
  } = {}
): Promise<ExtractedFacts> {
  const maxChunks = options.maxChunks || 5
  const chunksToProcess = chunks.slice(0, maxChunks)
  
  const allFacts = await Promise.all(
    chunksToProcess.map(chunk => extractFacts(chunk.content, teamHome, teamAway))
  )
  
  // Merge all facts and deduplicate
  const merged: ExtractedFacts = {
    injuries: [],
    suspensions: [],
    form: [],
    tactical: []
  }
  
  for (const facts of allFacts) {
    // Add injuries (deduplicate by player name)
    for (const injury of facts.injuries) {
      if (!merged.injuries.some(i => i.player.toLowerCase() === injury.player.toLowerCase())) {
        merged.injuries.push(injury)
      }
    }
    
    // Add suspensions (deduplicate by player name)
    for (const suspension of facts.suspensions) {
      if (!merged.suspensions.some(s => s.player.toLowerCase() === suspension.player.toLowerCase())) {
        merged.suspensions.push(suspension)
      }
    }
    
    // Add form (deduplicate by team name, prefer more recent)
    for (const form of facts.form) {
      const existingIndex = merged.form.findIndex(
        f => f.team.toLowerCase() === form.team.toLowerCase()
      )
      if (existingIndex === -1) {
        merged.form.push(form)
      } else {
        // Replace if this one seems more complete
        if (form.last_5.length === 5 && merged.form[existingIndex].last_5.length < 5) {
          merged.form[existingIndex] = form
        }
      }
    }
    
    // Add tactical changes (deduplicate by description similarity)
    for (const tactical of facts.tactical) {
      if (!merged.tactical.some(t => 
        t.description.toLowerCase().includes(tactical.description.toLowerCase().substring(0, 20))
      )) {
        merged.tactical.push(tactical)
      }
    }
  }
  
  return merged
}

/**
 * Calculate confidence score for extracted facts
 */
export function calculateFactConfidence(fact: any, sourceCount: number = 1): number {
  let confidence = 0.5 // Base confidence
  
  // Increase confidence based on detail level
  if (fact.description && fact.description.length > 20) {
    confidence += 0.1
  }
  
  // Increase confidence based on specific dates/numbers
  if (fact.expected_return || fact.matches) {
    confidence += 0.1
  }
  
  // Increase confidence based on multiple sources
  confidence += Math.min(sourceCount * 0.1, 0.3)
  
  return Math.min(confidence, 1.0)
}

/**
 * Convert extracted facts to database format
 */
export function convertFactsToDbFormat(
  facts: ExtractedFacts,
  eventId: string,
  sourceId: string
): Array<{
  event_id: string
  source_id: string
  fact_type: string
  entity: string
  description: string
  confidence: number
}> {
  const dbFacts: Array<any> = []
  
  // Injuries
  for (const injury of facts.injuries) {
    dbFacts.push({
      event_id: eventId,
      source_id: sourceId,
      fact_type: 'injury',
      entity: injury.player,
      description: `${injury.player} (${injury.position || 'unknown position'}) - ${injury.severity} injury${injury.expected_return ? `, expected return: ${injury.expected_return}` : ''}. ${injury.description || ''}`,
      confidence: calculateFactConfidence(injury)
    })
  }
  
  // Suspensions
  for (const suspension of facts.suspensions) {
    dbFacts.push({
      event_id: eventId,
      source_id: sourceId,
      fact_type: 'suspension',
      entity: suspension.player,
      description: `${suspension.player} suspended: ${suspension.reason}${suspension.matches ? ` (${suspension.matches} match${suspension.matches > 1 ? 'es' : ''})` : ''}. ${suspension.description || ''}`,
      confidence: calculateFactConfidence(suspension)
    })
  }
  
  // Form
  for (const form of facts.form) {
    dbFacts.push({
      event_id: eventId,
      source_id: sourceId,
      fact_type: 'form',
      entity: form.team,
      description: `${form.team} recent form (last 5): ${form.last_5.join('-')}. ${form.summary}`,
      confidence: calculateFactConfidence(form)
    })
  }
  
  // Tactical changes
  for (const tactical of facts.tactical) {
    dbFacts.push({
      event_id: eventId,
      source_id: sourceId,
      fact_type: 'coach_change',
      entity: 'Team',
      description: `${tactical.type}: ${tactical.description}${tactical.impact ? `. Impact: ${tactical.impact}` : ''}`,
      confidence: calculateFactConfidence(tactical)
    })
  }
  
  return dbFacts
}
