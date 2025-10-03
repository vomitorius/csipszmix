# API Documentation

Complete API reference for TipMix AI application.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.vercel.app`

## Authentication

Most endpoints are public. Future versions may add authentication.

---

## Events API

### GET /api/events
Fetch all upcoming football events from database.

**Response:**
```json
{
  "events": [
    {
      "id": "event123",
      "league": "Premier League",
      "home": "Manchester United",
      "away": "Liverpool",
      "startTime": "2025-01-15T15:00:00Z",
      "odds": {
        "home": 2.5,
        "draw": 3.2,
        "away": 2.8
      },
      "status": "upcoming"
    }
  ]
}
```

### GET /api/events/:id
Fetch details of a specific event.

**Parameters:**
- `id` (path): Event ID

**Response:**
```json
{
  "id": "event123",
  "league": "Premier League",
  "home": "Manchester United",
  "away": "Liverpool",
  "startTime": "2025-01-15T15:00:00Z",
  "odds": {
    "home": 2.5,
    "draw": 3.2,
    "away": 2.8
  },
  "status": "upcoming",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

---

## Sources API

### GET /api/sources/:event_id
Fetch crawled sources and extracted facts for an event.

**Parameters:**
- `event_id` (path): Event ID

**Response:**
```json
{
  "sources": [
    {
      "id": "source123",
      "url": "https://example.com/article",
      "title": "Pre-Match Analysis",
      "date": "2025-01-14T12:00:00Z",
      "language": "en",
      "createdAt": "2025-01-14T13:00:00Z"
    }
  ],
  "facts": {
    "injuries": [
      {
        "id": "fact123",
        "entity": "Player Name",
        "description": "Out with knee injury",
        "confidence": 0.85,
        "extractedAt": "2025-01-14T13:05:00Z"
      }
    ],
    "suspensions": [],
    "form": [],
    "tactical": []
  }
}
```

---

## Crawl API

### POST /api/crawl
Crawl sources for a specific event.

**Request Body:**
```json
{
  "event_id": "event123",
  "max_sources": 10,
  "force": false
}
```

**Parameters:**
- `event_id` (required): Event to crawl for
- `max_sources` (optional): Maximum sources to find (default: 10)
- `force` (optional): Force re-crawl even if sources exist (default: false)

**Response:**
```json
{
  "success": true,
  "sources_found": 8,
  "sources": [
    {
      "url": "https://example.com/article",
      "title": "Pre-Match Analysis",
      "date": "2025-01-14T12:00:00Z"
    }
  ],
  "message": "Crawling completed successfully"
}
```

**Errors:**
- `400`: Missing or invalid event_id
- `404`: Event not found
- `500`: Crawling failed

---

## Analyze API

### POST /api/analyze
Extract facts from sources for an event.

**Request Body:**
```json
{
  "event_id": "event123",
  "max_chunks": 5
}
```

**Parameters:**
- `event_id` (required): Event to analyze
- `max_chunks` (optional): Maximum chunks to process (default: 5)

**Response:**
```json
{
  "success": true,
  "facts_extracted": 12,
  "facts": {
    "injuries": 3,
    "suspensions": 1,
    "form": 2,
    "tactical": 1
  },
  "message": "Analysis completed successfully"
}
```

---

## Prediction API

### POST /api/predict
Generate AI prediction for an event.

**Request Body:**
```json
{
  "event_id": "event123",
  "strategy": "ensemble",
  "force_refresh": false
}
```

**Parameters:**
- `event_id` (required): Event to predict
- `strategy` (optional): Prediction strategy
  - `baseline`: Odds-based only
  - `facts`: Adjusted by facts
  - `llm`: AI analysis
  - `ensemble`: Combined (default)
- `force_refresh` (optional): Force regenerate (default: false)

**Response:**
```json
{
  "prediction": {
    "id": "pred123",
    "eventId": "event123",
    "outcome": "1",
    "probabilities": {
      "home": 0.45,
      "draw": 0.28,
      "away": 0.27
    },
    "confidence": 0.75,
    "rationale": "Manchester United shows strong home form with 4 wins in last 5 matches. Liverpool missing key defender due to injury. Home advantage and recent form favor United.",
    "keyFactors": [
      "Strong home form (4W-1D)",
      "Liverpool defender injured",
      "Home advantage applied"
    ],
    "topSources": [
      "https://example.com/article1",
      "https://example.com/article2"
    ],
    "method": "ensemble",
    "createdAt": "2025-01-15T10:00:00Z"
  },
  "cached": false
}
```

**Errors:**
- `400`: Missing event_id or invalid strategy
- `404`: Event not found
- `500`: Prediction generation failed

---

## Variants API

### POST /api/variants
Generate ticket variants with budget optimization.

**Request Body:**
```json
{
  "event_ids": ["event123", "event456", "event789"],
  "budget_huf": 5000,
  "strategy": "budget-optimized",
  "max_variants": 10,
  "save": false
}
```

**Parameters:**
- `event_ids` (required): Array of event IDs
- `budget_huf` (required): Budget in HUF
- `strategy` (optional): Generation strategy (default: "budget-optimized")
  - `single`: 1 ticket with top picks
  - `cover-2`: Cover top 2 outcomes on most certain match
  - `cover-uncertain`: Cover uncertain matches
  - `budget-optimized`: Maximize expected value
- `max_variants` (optional): Maximum variants to generate (default: 10)
- `save` (optional): Save to database (default: false)

**Response:**
```json
{
  "tickets": [
    {
      "id": "variant1",
      "picks": [
        {
          "eventId": "event123",
          "home": "Man Utd",
          "away": "Liverpool",
          "outcome": "1",
          "odds": 2.5,
          "confidence": 0.75
        },
        {
          "eventId": "event456",
          "home": "Arsenal",
          "away": "Chelsea",
          "outcome": "1",
          "odds": 2.0,
          "confidence": 0.80
        }
      ],
      "totalOdds": 5.0,
      "stake": 2500,
      "expectedReturn": 12500,
      "expectedValue": -250
    }
  ],
  "totalCost": 5000,
  "coverage": {
    "totalCombinations": 27,
    "coveredCombinations": 4,
    "coveragePercent": 14.81
  },
  "strategy": "budget-optimized"
}
```

**Errors:**
- `400`: Invalid input (missing event_ids, invalid budget, etc.)
- `404`: No events found or no predictions available
- `500`: Variant generation failed

---

## Export API

### GET /api/export/csv
Export predictions or tickets to CSV format.

**Query Parameters:**
- `type` (required): "predictions" or "tickets"
- `event_ids` (optional): Comma-separated event IDs (for predictions)
- `ticket_id` (optional): Ticket UUID (for tickets)

**Examples:**
```
GET /api/export/csv?type=predictions
GET /api/export/csv?type=predictions&event_ids=event123,event456
GET /api/export/csv?type=tickets&ticket_id=abc-123-def
```

**Response:**
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="predictions_2025-01-15.csv"`
- Body: CSV file content

**CSV Format (Predictions):**
```csv
Event ID,League,Home Team,Away Team,Kickoff,Prediction,Home Win %,Draw %,Away Win %,Confidence %,Odds Home,Odds Draw,Odds Away,Rationale,Created At
event123,Premier League,Man Utd,Liverpool,2025-01-15T15:00:00Z,1,45.0,28.0,27.0,75.0,2.5,3.2,2.8,Strong home form...,2025-01-15T10:00:00Z
```

### GET /api/export/json
Export predictions or tickets to JSON format.

**Query Parameters:**
Same as CSV export.

**Response:**
- Content-Type: `application/json; charset=utf-8`
- Content-Disposition: `attachment; filename="predictions_2025-01-15.json"`
- Body: Structured JSON

**JSON Format (Predictions):**
```json
{
  "export_date": "2025-01-15T12:00:00Z",
  "export_type": "predictions",
  "total_predictions": 5,
  "predictions": [
    {
      "prediction_id": "pred123",
      "event": {
        "id": "event123",
        "league": "Premier League",
        "home_team": "Man Utd",
        "away_team": "Liverpool",
        "kickoff": "2025-01-15T15:00:00Z",
        "status": "upcoming",
        "odds": {
          "home": 2.5,
          "draw": 3.2,
          "away": 2.8
        }
      },
      "prediction": {
        "outcome": "1",
        "probabilities": {
          "home": 0.45,
          "draw": 0.28,
          "away": 0.27
        },
        "confidence": 0.75,
        "rationale": "Strong home form...",
        "top_sources": ["https://..."]
      },
      "facts": [],
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

**Errors:**
- `400`: Invalid type or missing required parameters
- `404`: No data found
- `500`: Export failed

---

## Rate Limits

Currently no rate limits enforced. Future versions may add:
- 100 requests/minute per IP
- 1000 requests/hour per IP

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "statusMessage": "event_id is required"
}
```

**Common Status Codes:**
- `400`: Bad Request (invalid input)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error (server-side error)

## Webhooks

Not currently implemented. Future feature for:
- Event updates
- Prediction completions
- Crawl status

## SDK / Client Libraries

Not currently available. API is REST-based and can be called with:
- `fetch()` in JavaScript
- `axios` or `got` in Node.js
- `requests` in Python
- `curl` in shell

## Examples

### Fetch Events and Generate Predictions

```javascript
// 1. Get events
const events = await fetch('/api/events').then(r => r.json())

// 2. Generate predictions for each
for (const event of events.events) {
  const prediction = await fetch('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: event.id,
      strategy: 'ensemble'
    })
  }).then(r => r.json())
  
  console.log(`${event.home} vs ${event.away}: ${prediction.prediction.outcome}`)
}
```

### Generate and Export Ticket Variants

```javascript
// 1. Generate variants
const variants = await fetch('/api/variants', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_ids: ['event1', 'event2', 'event3'],
    budget_huf: 10000,
    strategy: 'budget-optimized'
  })
}).then(r => r.json())

console.log(`Generated ${variants.tickets.length} tickets`)

// 2. Export to CSV
window.open(`/api/export/csv?type=predictions&event_ids=event1,event2,event3`)
```

### Crawl and Analyze Event

```javascript
// 1. Crawl sources
const crawl = await fetch('/api/crawl', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_id: 'event123',
    max_sources: 10
  })
}).then(r => r.json())

console.log(`Found ${crawl.sources_found} sources`)

// 2. Analyze facts
const analysis = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_id: 'event123'
  })
}).then(r => r.json())

console.log(`Extracted ${analysis.facts_extracted} facts`)

// 3. Generate prediction
const prediction = await fetch('/api/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_id: 'event123',
    strategy: 'ensemble'
  })
}).then(r => r.json())

console.log(`Prediction: ${prediction.prediction.outcome} (${prediction.prediction.confidence * 100}% confidence)`)
```

## Support

For API issues or questions:
- Open an issue on GitHub
- Check the [M3_COMPLETE.md](./M3_COMPLETE.md) documentation
- Review the source code in `apps/web/server/api/`

---

**Last Updated**: 2025-01-06  
**API Version**: M3  
**Status**: Stable
