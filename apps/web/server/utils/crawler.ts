import { chromium, type Browser, type Page } from 'playwright'

/**
 * Web crawler utilities using Playwright
 * Handles dynamic page rendering, cookie banners, and content extraction
 */

interface CrawlResult {
  url: string
  html: string
  title: string
  language?: string
  publishedDate?: string
  error?: string
}

let browser: Browser | null = null

/**
 * Get or create browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) {
    return browser
  }

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    })
    return browser
  } catch (error) {
    console.error('Failed to launch browser:', error)
    throw new Error('Browser initialization failed. Make sure Playwright browsers are installed.')
  }
}

/**
 * Close browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
  }
}

/**
 * Check if URL is allowed by robots.txt
 */
export async function checkRobotsTxt(url: string, userAgent: string = 'TippAI-Bot'): Promise<boolean> {
  try {
    const urlObj = new URL(url)
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`
    
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': userAgent }
    })
    
    if (!response.ok) {
      // If no robots.txt, assume allowed
      return true
    }
    
    const robotsTxt = await response.text()
    const lines = robotsTxt.split('\n')
    
    let relevantAgent = false
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase()
      
      if (trimmed.startsWith('user-agent:')) {
        const agent = trimmed.substring(11).trim()
        relevantAgent = agent === '*' || agent === userAgent.toLowerCase()
      }
      
      if (relevantAgent && trimmed.startsWith('disallow:')) {
        const path = trimmed.substring(9).trim()
        if (path === '/' || (path && urlObj.pathname.startsWith(path))) {
          return false
        }
      }
    }
    
    return true
  } catch (error) {
    console.error('Error checking robots.txt:', error)
    // On error, assume allowed
    return true
  }
}

/**
 * Fetch and render a web page
 */
export async function fetchPage(url: string, options: {
  timeout?: number
  waitForSelector?: string
  userAgent?: string
} = {}): Promise<CrawlResult> {
  const timeout = options.timeout || 30000
  const userAgent = options.userAgent || 'Mozilla/5.0 (compatible; TippAI-Bot/1.0)'
  
  let page: Page | null = null
  
  try {
    // Check robots.txt
    const allowed = await checkRobotsTxt(url)
    if (!allowed) {
      return {
        url,
        html: '',
        title: '',
        error: 'Blocked by robots.txt'
      }
    }

    const browserInstance = await getBrowser()
    page = await browserInstance.newPage({
      userAgent,
      viewport: { width: 1920, height: 1080 }
    })
    
    // Set timeout
    page.setDefaultTimeout(timeout)
    
    // Navigate to page
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout
    })
    
    // Wait for specific selector if provided
    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 5000 }).catch(() => {
        console.warn(`Selector ${options.waitForSelector} not found, continuing anyway`)
      })
    }
    
    // Try to dismiss cookie banners (common patterns)
    const cookieSelectors = [
      'button:has-text("Accept")',
      'button:has-text("Elfogad")',
      'button:has-text("Agree")',
      '[id*="cookie"] button',
      '[class*="cookie"] button',
      '.gdpr-accept',
      '#cookie-accept'
    ]
    
    for (const selector of cookieSelectors) {
      try {
        const button = await page.$(selector)
        if (button) {
          await button.click({ timeout: 1000 })
          await page.waitForTimeout(500)
          break
        }
      } catch {
        // Ignore errors, cookie banner might not exist
      }
    }
    
    // Wait a bit for any dynamic content
    await page.waitForTimeout(1000)
    
    // Extract content
    const html = await page.content()
    const title = await page.title()
    
    // Try to detect language
    const language = await page.evaluate(() => {
      return document.documentElement.lang || 
             document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') ||
             'unknown'
    })
    
    // Try to extract published date
    const publishedDate = await page.evaluate(() => {
      const selectors = [
        'meta[property="article:published_time"]',
        'meta[name="publish-date"]',
        'meta[name="date"]',
        'time[datetime]'
      ]
      
      for (const selector of selectors) {
        const element = document.querySelector(selector)
        if (element) {
          return element.getAttribute('content') || element.getAttribute('datetime') || null
        }
      }
      return null
    })
    
    await page.close()
    
    return {
      url,
      html,
      title,
      language: language || undefined,
      publishedDate: publishedDate || undefined
    }
  } catch (error: any) {
    console.error(`Error fetching page ${url}:`, error.message)
    
    if (page) {
      await page.close().catch(() => {})
    }
    
    return {
      url,
      html: '',
      title: '',
      error: error.message
    }
  }
}

/**
 * Fetch multiple pages concurrently with rate limiting
 */
export async function fetchPages(
  urls: string[],
  options: {
    concurrency?: number
    timeout?: number
    delay?: number
  } = {}
): Promise<CrawlResult[]> {
  const concurrency = options.concurrency || 3
  const delay = options.delay || 1000
  
  const results: CrawlResult[] = []
  const queue = [...urls]
  
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const url = queue.shift()
      if (!url) break
      
      const result = await fetchPage(url, options)
      results.push(result)
      
      // Rate limiting delay
      if (queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  })
  
  await Promise.all(workers)
  
  return results
}

/**
 * Extract main content from HTML using simple heuristics
 * This is a fallback if @mozilla/readability is not available
 */
export function extractMainContent(html: string): string {
  // Remove script and style tags
  let content = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  
  // Remove navigation and footer
  content = content.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
  content = content.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
  
  // Remove HTML tags
  content = content.replace(/<[^>]+>/g, ' ')
  
  // Clean up whitespace
  content = content.replace(/\s+/g, ' ').trim()
  
  return content
}
