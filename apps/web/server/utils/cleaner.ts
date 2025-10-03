import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import TurndownService from 'turndown'
import { franc } from 'franc'

/**
 * Content cleaning and conversion utilities
 * HTML → Markdown conversion with content extraction
 */

interface CleanedContent {
  markdown: string
  title: string
  excerpt?: string
  language: string
  wordCount: number
  readingTime: number
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*'
})

// Configure Turndown to remove unwanted elements
turndownService.remove(['script', 'style', 'nav', 'footer', 'aside', 'iframe', 'noscript'])

/**
 * Clean HTML and convert to Markdown using Readability and Turndown
 */
export function cleanHtmlToMarkdown(html: string, url?: string): CleanedContent | null {
  try {
    // Parse HTML with JSDOM
    const dom = new JSDOM(html, { url })
    const doc = dom.window.document
    
    // Use Readability to extract main content
    const reader = new Readability(doc, {
      debug: false,
      maxElemsToParse: 0, // No limit
      nbTopCandidates: 5,
      charThreshold: 500
    })
    
    const article = reader.parse()
    
    if (!article || !article.content) {
      console.warn('Readability failed to extract article content')
      return null
    }
    
    // Convert HTML to Markdown
    const markdown = turndownService.turndown(article.content)
    
    // Detect language
    const language = detectLanguage(markdown)
    
    // Calculate word count and reading time
    const wordCount = countWords(markdown)
    const readingTime = Math.ceil(wordCount / 200) // ~200 words per minute
    
    return {
      markdown: markdown.trim(),
      title: article.title || '',
      excerpt: article.excerpt,
      language,
      wordCount,
      readingTime
    }
  } catch (error) {
    console.error('Error cleaning HTML:', error)
    return null
  }
}

/**
 * Detect language of text using franc
 */
export function detectLanguage(text: string): string {
  try {
    // franc returns ISO 639-3 codes
    const langCode = franc(text, { minLength: 10 })
    
    // Map to more common ISO 639-1 codes
    const langMap: Record<string, string> = {
      'hun': 'hu',
      'eng': 'en',
      'deu': 'de',
      'fra': 'fr',
      'spa': 'es',
      'ita': 'it',
      'por': 'pt',
      'rus': 'ru',
      'und': 'unknown' // undetermined
    }
    
    return langMap[langCode] || langCode
  } catch (error) {
    console.error('Error detecting language:', error)
    return 'unknown'
  }
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  // Remove extra whitespace and count words
  const words = text.trim().split(/\s+/).filter(w => w.length > 0)
  return words.length
}

/**
 * Extract text from HTML (simple version without Readability)
 */
export function extractTextFromHtml(html: string): string {
  try {
    const dom = new JSDOM(html)
    const doc = dom.window.document
    
    // Remove unwanted elements
    const unwanted = doc.querySelectorAll('script, style, nav, footer, aside, iframe, noscript')
    unwanted.forEach(el => el.remove())
    
    // Get text content
    return doc.body.textContent || ''
  } catch (error) {
    console.error('Error extracting text from HTML:', error)
    return ''
  }
}

/**
 * Clean and normalize Markdown content
 */
export function normalizeMarkdown(markdown: string): string {
  // Remove excessive newlines (more than 2)
  let normalized = markdown.replace(/\n{3,}/g, '\n\n')
  
  // Remove leading/trailing whitespace from lines
  normalized = normalized.split('\n').map(line => line.trim()).join('\n')
  
  // Remove empty list items
  normalized = normalized.replace(/^[-*]\s*$/gm, '')
  
  // Normalize heading spacing
  normalized = normalized.replace(/^(#{1,6})\s+/gm, '$1 ')
  
  return normalized.trim()
}

/**
 * Split text into sentences
 */
export function splitIntoSentences(text: string): string[] {
  // Simple sentence splitting (can be improved with NLP library)
  const sentences = text
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)
  
  return sentences
}

/**
 * Remove URLs from text
 */
export function removeUrls(text: string): string {
  return text.replace(/https?:\/\/[^\s]+/g, '')
}

/**
 * Truncate text to max length while preserving word boundaries
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...'
  }
  
  return truncated + '...'
}

/**
 * Extract metadata from HTML
 */
export function extractMetadata(html: string): {
  title?: string
  description?: string
  author?: string
  publishedDate?: string
  language?: string
} {
  try {
    const dom = new JSDOM(html)
    const doc = dom.window.document
    
    const getMetaContent = (names: string[]): string | undefined => {
      for (const name of names) {
        const meta = doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
        if (meta) {
          return meta.getAttribute('content') || undefined
        }
      }
      return undefined
    }
    
    return {
      title: doc.title || getMetaContent(['og:title', 'twitter:title']),
      description: getMetaContent(['description', 'og:description', 'twitter:description']),
      author: getMetaContent(['author', 'article:author']),
      publishedDate: getMetaContent(['article:published_time', 'publish-date', 'date']),
      language: doc.documentElement.lang || getMetaContent(['content-language'])
    }
  } catch (error) {
    console.error('Error extracting metadata:', error)
    return {}
  }
}
