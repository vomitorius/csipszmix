# Magyar Totó Refactor - Complete Implementation Guide

## 📋 Overview

This document describes the complete refactoring from **Tippmix API** to **Magyar Totó** weekly voucher system.

**Date**: January 2025  
**Status**: ✅ Complete - Ready for Testing  
**Migration Required**: Yes (database schema)

---

## 🎯 Goals Achieved

### Original Goals
- ✅ Shift from Tippmix events to Magyar Totó weekly vouchers
- ✅ Simplify UI to focus on 13+1 weekly matches
- ✅ Remove admin dashboard complexity
- ✅ Streamline user experience
- ✅ Maintain AI prediction capabilities
- ✅ Keep variant generation functionality

### Additional Improvements
- ✅ Better type safety with new data model
- ✅ Backwards compatibility support
- ✅ Clean, maintainable codebase
- ✅ Automated weekly processing

---

## 🏗️ Architecture Changes

### Old System (Tippmix)
```
Events → Tippmix API → Individual matches → Admin UI → Bulk operations
```

### New System (Magyar Totó)
```
Weekly Round → 13+1 Matches → Simple UI → Auto predictions → Variants
```

---

## 📊 Database Schema Changes

### New Tables

#### `toto_rounds`
Weekly Magyar Totó rounds.

```sql
CREATE TABLE toto_rounds (
  id TEXT PRIMARY KEY,              -- "2025-week-40"
  week_number INTEGER NOT NULL,
  week_label TEXT NOT NULL,         -- "40. hét"
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `matches`
Individual matches within a round.

```sql
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  round_id TEXT REFERENCES toto_rounds(id),
  match_order INTEGER NOT NULL,     -- 1-14
  league TEXT NOT NULL,
  home TEXT NOT NULL,
  away TEXT NOT NULL,
  kickoff TIMESTAMPTZ NOT NULL,
  odds_home DECIMAL(10, 2),         -- Optional
  odds_draw DECIMAL(10, 2),
  odds_away DECIMAL(10, 2),
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Updated Tables

#### `sources`, `facts`, `predictions`
Added `match_id` column to support new matches table:

```sql
ALTER TABLE sources ADD COLUMN match_id TEXT REFERENCES matches(id);
ALTER TABLE facts ADD COLUMN match_id TEXT REFERENCES matches(id);
ALTER TABLE predictions ADD COLUMN match_id TEXT REFERENCES matches(id);
```

### Migration
Run: `psql < sql/migration_toto.sql`

---

## 🔌 API Changes

### New Endpoints

#### `GET /api/rounds`
List all Totó rounds.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "2025-week-4",
      "weekNumber": 4,
      "weekLabel": "4. hét",
      "weekStart": "2025-01-20",
      "weekEnd": "2025-01-26",
      "year": 2025,
      "status": "active",
      "createdAt": "2025-01-20T10:00:00Z",
      "updatedAt": "2025-01-20T10:00:00Z"
    }
  ]
}
```

#### `GET /api/rounds/[id]`
Get round with matches and predictions.

**Response:**
```json
{
  "success": true,
  "data": {
    "round": {
      "id": "2025-week-4",
      "matches": [
        {
          "id": "match-2025-w4-1",
          "matchOrder": 1,
          "home": "Manchester United",
          "away": "Liverpool",
          "kickoff": "2025-01-22T20:00:00Z",
          "league": "Premier League"
        }
      ]
    },
    "predictions": {
      "match-2025-w4-1": {
        "outcome": "1",
        "confidence": 0.75,
        "probabilities": {
          "home": 0.50,
          "draw": 0.25,
          "away": 0.25
        }
      }
    }
  }
}
```

#### `GET /api/matches/[id]`
Get detailed match information.

**Response:**
```json
{
  "success": true,
  "data": {
    "match": { ... },
    "prediction": { ... },
    "sources": [ ... ],
    "facts": [ ... ],
    "factsByType": {
      "injuries": [],
      "suspensions": [],
      "form": [],
      "coachChanges": [],
      "other": []
    }
  }
}
```

### Deprecated (Legacy Support)

These still work but are deprecated:
- `GET /api/events` - Use `/api/rounds` instead
- Event-based endpoints - Migrate to match-based

---

## 🎨 UI Changes

### Pages

#### Homepage (`/`)
**Before**: Grid of event cards  
**After**: List of 13+1 weekly matches with predictions

**New Features:**
- Week label and date range
- Match order numbering
- Click to view details
- Recommended ticket display

#### Match Details (`/match/[id]`)
**New page** showing:
- AI prediction with confidence
- Detailed rationale
- Extracted facts by category
- Source links

#### Variants (`/variants`)
**Simplified** from complex ticket builder:
- Budget input only
- Auto-generates based on current week
- Shows all variants with strategies
- Coverage and cost summary

#### Removed
- `/admin/*` - All admin pages deleted
- `/tickets` - Replaced by `/variants`

### Components

#### New Components
- `MatchRow.vue` - Clean match display with prediction
- Updated: `DisclaimerBanner.vue` - Simplified message

#### Updated Components
- `app.vue` - New navigation and branding
- Footer with responsible gaming

### Composables

#### New: `useRounds.ts`
Replaces `useEvents.ts` for new data model.

**Methods:**
- `fetchRounds()` - Get all rounds
- `fetchRoundById(id)` - Get specific round
- `getCurrentWeekRound()` - Get current week

---

## 🤖 Automation

### GitHub Actions

#### `weekly-toto.yml`
Runs every Monday at 6:00 AM UTC.

**Steps:**
1. Fetch weekly Totó voucher
2. Crawl sources for all matches
3. Extract facts from sources
4. Generate AI predictions

**Manual Trigger:** Available via workflow_dispatch

### Scripts

#### `scripts/fetch-weekly-toto.ts`
Standalone script to fetch and display weekly data.

**Usage:**
```bash
npx tsx scripts/fetch-weekly-toto.ts
```

---

## 🔄 Migration Path

### For Existing Installations

#### 1. Database Migration
```bash
# Connect to your Supabase database
psql postgresql://...

# Run migration
\i sql/migration_toto.sql
```

#### 2. Update Code
```bash
git pull origin main
cd apps/web
npm install
```

#### 3. Test Locally
```bash
npm run dev
# Visit http://localhost:3000
```

#### 4. Deploy
Push to Vercel or your hosting platform.

### For New Installations

Follow the standard setup in README.md, making sure to:
1. Run `schema.sql` first
2. Then run `migration_toto.sql`
3. Then run `policies.sql`

---

## 📝 Type Definitions

### Core Types

```typescript
// Weekly round
interface TotoRound {
  id: string              // "2025-week-40"
  weekNumber: number
  weekLabel: string       // "40. hét"
  weekStart: string       // ISO date
  weekEnd: string
  year: number
  status: 'upcoming' | 'active' | 'finished'
  matches?: Match[]
  createdAt: string
  updatedAt: string
}

// Individual match
interface Match {
  id: string
  roundId: string
  matchOrder: number      // 1-14
  league: string
  home: string
  away: string
  kickoff: string
  oddsHome?: number
  oddsDraw?: number
  oddsAway?: number
  status: 'upcoming' | 'live' | 'finished'
  createdAt: string
  updatedAt: string
}

// Updated types with backwards compatibility
interface Source {
  id: string
  eventId?: string        // Legacy
  matchId?: string        // New
  url: string
  // ...
}

interface Fact {
  id: string
  eventId?: string        // Legacy
  matchId?: string        // New
  // ...
}

interface Prediction {
  id: string
  eventId?: string        // Legacy
  matchId?: string        // New
  // ...
}
```

---

## 🧪 Testing Checklist

### Local Testing

- [ ] Database migration runs successfully
- [ ] Homepage loads and shows weekly matches
- [ ] Click on match opens detail page
- [ ] Match detail shows prediction, facts, sources
- [ ] Variants page loads
- [ ] Variant generation works with budget input
- [ ] Navigation works (Főoldal, Variációk)
- [ ] No console errors

### Production Testing

- [ ] Database migration applied to production
- [ ] Environment variables configured
- [ ] GitHub Actions secrets set
- [ ] Weekly workflow tested (manual trigger)
- [ ] All pages load correctly
- [ ] AI predictions generate properly

---

## 🐛 Known Issues / Limitations

### Current Limitations

1. **Mock Data**: Currently using mock Totó matches
   - Need real Szerencsejáték Zrt. integration
   - Alternative: Manual weekly data entry

2. **No Historical Data**: Only current week supported
   - Future: Store historical rounds and results

3. **Limited Validation**: Assumes 13+1 matches
   - Should validate actual Totó format

### Backwards Compatibility

- Legacy `events` table still exists
- Old APIs still work (deprecated)
- `eventId` fields still supported
- Gradual migration recommended

---

## 📈 Future Enhancements

### Short Term (1-2 months)
- [ ] Real Szerencsejáték Zrt. API integration
- [ ] Results tracking and historical data
- [ ] Performance metrics

### Medium Term (3-6 months)
- [ ] User accounts and saved tickets
- [ ] Prediction accuracy tracking
- [ ] Alternative strategies

### Long Term (6+ months)
- [ ] Mobile app
- [ ] Social features
- [ ] Advanced analytics

---

## 🤝 Contributing

### Adding New Features

1. Check existing types in `server/utils/types.ts`
2. Update database schema if needed
3. Create API endpoints in `server/api/`
4. Add UI pages in `pages/`
5. Update documentation

### Reporting Issues

Include:
- Browser/environment
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)

---

## 📚 Additional Resources

- **Main README**: [README.md](./README.md)
- **Database Schema**: [sql/schema.sql](./sql/schema.sql)
- **Migration Script**: [sql/migration_toto.sql](./sql/migration_toto.sql)
- **API Documentation**: [API_DOCS.md](./API_DOCS.md)

---

## ✅ Summary

This refactor successfully transforms the application from a Tippmix-focused event system to a simplified Magyar Totó weekly voucher system. The changes maintain all AI capabilities while providing a cleaner, more focused user experience.

**Key Achievement**: Reduced complexity while maintaining functionality.

**Next Steps**: Deploy to production and implement real Totó API integration.

---

*Last Updated: January 2025*
*Version: 1.0.0*
