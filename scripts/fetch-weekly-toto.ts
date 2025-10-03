#!/usr/bin/env tsx

/**
 * Script to fetch and save the weekly Magyar Totó voucher
 * Run: npx tsx scripts/fetch-weekly-toto.ts
 */

import { fetchWeeklyToto } from '../apps/web/server/utils/toto'

async function main() {
  console.log('🎯 Fetching weekly Magyar Totó voucher...')
  
  try {
    const round = await fetchWeeklyToto()
    
    console.log(`\n✅ Successfully fetched round: ${round.week_label}`)
    console.log(`   Week: ${round.week_start} to ${round.week_end}`)
    console.log(`   Matches: ${round.matches.length}`)
    
    // Display matches
    console.log('\n📋 Matches:')
    round.matches.forEach(match => {
      const date = new Date(match.kickoff)
      const dateStr = date.toLocaleDateString('hu-HU', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      console.log(`   ${match.order}. ${match.home} - ${match.away} (${match.league}, ${dateStr})`)
    })
    
    // TODO: Save to database using saveTotoRoundToDatabase(round)
    console.log('\n⚠️  Note: Database save not yet implemented (requires schema migration)')
    console.log('   Run migration: psql < sql/migration_toto.sql')
    
  } catch (error) {
    console.error('❌ Error fetching weekly Totó:', error)
    process.exit(1)
  }
}

main()
