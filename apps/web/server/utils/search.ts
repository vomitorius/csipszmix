import type { TippmixEvent } from './types'

/**
 * Source discovery utilities
 * Search for relevant news articles and sources for events
 */

interface SearchResult {
  url: string
  title: string
  snippet?: string
  source?: string
}

/**
 * Generate search keywords from event
 */
export function generateSearchKeywords(event: TippmixEvent): string[] {
  const keywords: string[] = []
  
  // Team names
  keywords.push(event.home)
  keywords.push(event.away)
  keywords.push(`${event.home} vs ${event.away}`)
  keywords.push(`${event.home} ${event.away}`)
  
  // League
  keywords.push(event.league)
  
  // Injury and suspension terms (multilingual)
  const injuryTerms = [
    'sérülés', 'sérült', 'injury', 'injured', 'verletzung', 'blessure'
  ]
  
  const suspensionTerms = [
    'eltiltás', 'eltiltott', 'suspension', 'suspended', 'ban', 'banned'
  ]
  
  const formTerms = [
    'forma', 'form', 'formkurve', 'eredmény', 'result', 'performance'
  ]
  
  // Combine team names with context terms
  for (const team of [event.home, event.away]) {
    injuryTerms.forEach(term => keywords.push(`${team} ${term}`))
    suspensionTerms.forEach(term => keywords.push(`${team} ${term}`))
    formTerms.forEach(term => keywords.push(`${team} ${term}`))
  }
  
  return keywords
}

/**
 * Generate search queries for an event
 */
export function generateSearchQueries(event: TippmixEvent): string[] {
  const queries: string[] = []
  
  // Match preview
  queries.push(`${event.home} vs ${event.away} preview`)
  queries.push(`${event.home} vs ${event.away} előzetes`)
  
  // Injury news
  queries.push(`${event.home} injury news`)
  queries.push(`${event.away} injury news`)
  queries.push(`${event.home} sérülések`)
  queries.push(`${event.away} sérülések`)
  
  // Team form
  queries.push(`${event.home} recent form`)
  queries.push(`${event.away} recent form`)
  queries.push(`${event.home} legutóbbi meccsek`)
  queries.push(`${event.away} legutóbbi meccsek`)
  
  // Suspensions
  queries.push(`${event.home} suspensions`)
  queries.push(`${event.away} suspensions`)
  queries.push(`${event.home} eltiltások`)
  queries.push(`${event.away} eltiltások`)
  
  // League context
  queries.push(`${event.league} ${event.home}`)
  queries.push(`${event.league} ${event.away}`)
  
  return queries
}

/**
 * Search using DuckDuckGo (free, no API key required)
 * Note: This uses HTML scraping as DuckDuckGo doesn't have an official API
 */
export async function searchDuckDuckGo(query: string, limit: number = 10): Promise<SearchResult[]> {
  try {
    const url = new URL('https://html.duckduckgo.com/html/')
    url.searchParams.set('q', query)
    
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TippAI-Bot/1.0)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`)
    }
    
    const html = await response.text()
    
    // Simple HTML parsing to extract results
    const results: SearchResult[] = []
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]+)<\/a>/g
    
    let match
    while ((match = resultRegex.exec(html)) !== null && results.length < limit) {
      results.push({
        url: decodeURIComponent(match[1]),
        title: match[2].trim()
      })
    }
    
    // Extract snippets (basic approach)
    let snippetMatch
    let snippetIndex = 0
    while ((snippetMatch = snippetRegex.exec(html)) !== null && snippetIndex < results.length) {
      if (results[snippetIndex]) {
        results[snippetIndex].snippet = snippetMatch[1].trim()
      }
      snippetIndex++
    }
    
    return results
  } catch (error) {
    console.error('DuckDuckGo search error:', error)
    return []
  }
}

/**
 * Filter and deduplicate search results
 */
export function filterSearchResults(results: SearchResult[]): SearchResult[] {
  // Remove duplicates by URL
  const seen = new Set<string>()
  const filtered: SearchResult[] = []
  
  for (const result of results) {
    try {
      const url = new URL(result.url)
      const normalizedUrl = `${url.protocol}//${url.host}${url.pathname}`
      
      if (!seen.has(normalizedUrl)) {
        seen.add(normalizedUrl)
        filtered.push(result)
      }
    } catch {
      // Skip invalid URLs
    }
  }
  
  return filtered
}

/**
 * Score and rank search results by relevance
 */
export function rankSearchResults(
  results: SearchResult[],
  keywords: string[]
): SearchResult[] {
  const scored = results.map(result => {
    let score = 0
    const text = `${result.title} ${result.snippet || ''}`.toLowerCase()
    
    // Score based on keyword matches
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 1
      }
    }
    
    // Prefer certain domains (sport news sites)
    const sportsDomains = [
      'espn.com', 'bbc.com/sport', 'goal.com', 'transfermarkt',
      'nbcsports', 'skysports', 'futballpilota', 'origo.hu/sport',
      'index.hu/sport', 'nlc.hu', '444.hu/sport'
    ]
    
    for (const domain of sportsDomains) {
      if (result.url.includes(domain)) {
        score += 5
      }
    }
    
    return { ...result, score }
  })
  
  return scored.sort((a, b) => b.score - a.score)
}

/**
 * Discover sources for an event
 */
export async function discoverSources(
  event: TippmixEvent,
  options: {
    maxQueries?: number
    resultsPerQuery?: number
    maxTotalResults?: number
  } = {}
): Promise<SearchResult[]> {
  const maxQueries = options.maxQueries || 5
  const resultsPerQuery = options.resultsPerQuery || 5
  const maxTotalResults = options.maxTotalResults || 20
  
  const queries = generateSearchQueries(event).slice(0, maxQueries)
  const keywords = generateSearchKeywords(event)
  
  const allResults: SearchResult[] = []
  
  for (const query of queries) {
    console.log(`Searching for: ${query}`)
    
    try {
      const results = await searchDuckDuckGo(query, resultsPerQuery)
      allResults.push(...results)
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`Error searching for "${query}":`, error)
    }
  }
  
  // Filter, rank, and limit results
  const filtered = filterSearchResults(allResults)
  const ranked = rankSearchResults(filtered, keywords)
  
  return ranked.slice(0, maxTotalResults)
}

/**
 * Get sports news domains (for filtering/prioritization)
 */
export function getSportsNewsDomains(): string[] {
  return [
    // International
    'espn.com',
    'bbc.com/sport',
    'goal.com',
    'transfermarkt.com',
    'skysports.com',
    'nbcsports.com',
    'theguardian.com/football',
    'football365.com',
    'fourfourtwo.com',
    '90min.com',
    
    // Hungarian
    'nemzetisport.hu',
    'futballpilota.hu',
    'origo.hu/sport',
    'index.hu/sport',
    'nlc.hu',
    '444.hu/sport',
    'sportgeza.hu',
    'focivilag.hu'
  ]
}
