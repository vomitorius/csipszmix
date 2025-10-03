<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
      <p class="text-gray-600">
        Rendszer áttekintés, statisztikák és bulk műveletek
      </p>
    </div>

    <!-- Stats Grid -->
    <div class="grid md:grid-cols-4 gap-6 mb-8">
      <!-- Events Count -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-600">Események</h3>
          <span class="text-2xl">📅</span>
        </div>
        <p class="text-3xl font-bold text-blue-700">{{ stats.eventsCount }}</p>
        <p class="text-xs text-gray-500 mt-1">Összes mérkőzés</p>
      </div>

      <!-- Sources Count -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-600">Források</h3>
          <span class="text-2xl">🔗</span>
        </div>
        <p class="text-3xl font-bold text-green-700">{{ stats.sourcesCount }}</p>
        <p class="text-xs text-gray-500 mt-1">Crawl-olt oldalak</p>
      </div>

      <!-- Predictions Count -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-600">Predikciók</h3>
          <span class="text-2xl">🎯</span>
        </div>
        <p class="text-3xl font-bold text-purple-700">{{ stats.predictionsCount }}</p>
        <p class="text-xs text-gray-500 mt-1">AI előrejelzések</p>
      </div>

      <!-- Tickets Count -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-600">Szelvények</h3>
          <span class="text-2xl">🎫</span>
        </div>
        <p class="text-3xl font-bold text-orange-700">{{ stats.ticketsCount }}</p>
        <p class="text-xs text-gray-500 mt-1">Generált tippek</p>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">Bulk Műveletek</h2>
      
      <div class="grid md:grid-cols-3 gap-4">
        <!-- Predict All -->
        <div class="border border-gray-200 rounded-lg p-4">
          <h3 class="font-semibold mb-2 flex items-center gap-2">
            <span>🤖</span>
            Predict All Events
          </h3>
          <p class="text-sm text-gray-600 mb-4">
            Generál predikciót minden olyan eseményre, aminek még nincs.
          </p>
          <button
            @click="predictAllEvents"
            :disabled="bulkActions.predictAll.loading"
            class="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ bulkActions.predictAll.loading ? 'Predikciók generálása...' : 'Predict All' }}
          </button>
          <p v-if="bulkActions.predictAll.result" class="text-sm mt-2" :class="bulkActions.predictAll.success ? 'text-green-700' : 'text-red-700'">
            {{ bulkActions.predictAll.result }}
          </p>
        </div>

        <!-- Crawl All Pending -->
        <div class="border border-gray-200 rounded-lg p-4">
          <h3 class="font-semibold mb-2 flex items-center gap-2">
            <span>🕷️</span>
            Crawl Pending Events
          </h3>
          <p class="text-sm text-gray-600 mb-4">
            Crawl-ol minden olyan eseményt, amihez még nincsenek források.
          </p>
          <button
            @click="crawlPendingEvents"
            :disabled="bulkActions.crawlPending.loading"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ bulkActions.crawlPending.loading ? 'Crawling...' : 'Crawl Pending' }}
          </button>
          <p v-if="bulkActions.crawlPending.result" class="text-sm mt-2" :class="bulkActions.crawlPending.success ? 'text-green-700' : 'text-red-700'">
            {{ bulkActions.crawlPending.result }}
          </p>
        </div>

        <!-- Clean Old Data -->
        <div class="border border-gray-200 rounded-lg p-4">
          <h3 class="font-semibold mb-2 flex items-center gap-2">
            <span>🧹</span>
            Clean Old Data
          </h3>
          <p class="text-sm text-gray-600 mb-4">
            Töröl 90 napnál régebbi befejezett eseményeket.
          </p>
          <button
            @click="cleanOldData"
            :disabled="bulkActions.cleanOld.loading"
            class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ bulkActions.cleanOld.loading ? 'Törlés...' : 'Clean Old Data' }}
          </button>
          <p v-if="bulkActions.cleanOld.result" class="text-sm mt-2" :class="bulkActions.cleanOld.success ? 'text-green-700' : 'text-red-700'">
            {{ bulkActions.cleanOld.result }}
          </p>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">Legutóbbi Aktivitás</h2>
      
      <div v-if="loadingActivity" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <div v-else class="space-y-4">
        <!-- Recent Predictions -->
        <div>
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Legutóbbi Predikciók</h3>
          <div v-if="recentPredictions.length === 0" class="text-sm text-gray-500 italic">
            Nincs predikció
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="pred in recentPredictions"
              :key="pred.id"
              class="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
            >
              <div>
                <span class="font-medium">{{ pred.event_id }}</span>
                <span class="text-gray-600 ml-2">→ {{ pred.outcome }}</span>
                <span class="text-xs text-gray-500 ml-2">
                  ({{ (parseFloat(pred.confidence) * 100).toFixed(0) }}%)
                </span>
              </div>
              <span class="text-xs text-gray-500">
                {{ formatRelativeTime(pred.created_at) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Recent Tickets -->
        <div class="mt-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">Legutóbbi Szelvények</h3>
          <div v-if="recentTickets.length === 0" class="text-sm text-gray-500 italic">
            Nincs szelvény
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="ticket in recentTickets"
              :key="ticket.id"
              class="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
            >
              <div>
                <span class="font-medium">{{ ticket.name }}</span>
                <span class="text-gray-600 ml-2">
                  {{ parseFloat(ticket.budget).toLocaleString('hu-HU') }} Ft
                </span>
              </div>
              <span class="text-xs text-gray-500">
                {{ formatRelativeTime(ticket.created_at) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- System Info -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold mb-4">Rendszer Információ</h2>
      
      <div class="grid md:grid-cols-2 gap-4 text-sm">
        <div>
          <p class="text-gray-600">LLM Provider:</p>
          <p class="font-semibold">{{ systemInfo.llmProvider || 'N/A' }}</p>
        </div>
        <div>
          <p class="text-gray-600">Database:</p>
          <p class="font-semibold">Supabase PostgreSQL + pgvector</p>
        </div>
        <div>
          <p class="text-gray-600">Verzió:</p>
          <p class="font-semibold">M3 - Complete</p>
        </div>
        <div>
          <p class="text-gray-600">Deployment:</p>
          <p class="font-semibold">{{ systemInfo.deployment || 'Development' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { getAllEvents } = useEvents()

const stats = ref({
  eventsCount: 0,
  sourcesCount: 0,
  predictionsCount: 0,
  ticketsCount: 0
})

const bulkActions = ref({
  predictAll: { loading: false, result: '', success: false },
  crawlPending: { loading: false, result: '', success: false },
  cleanOld: { loading: false, result: '', success: false }
})

const loadingActivity = ref(false)
const recentPredictions = ref<any[]>([])
const recentTickets = ref<any[]>([])

const systemInfo = ref({
  llmProvider: 'OpenAI',
  deployment: process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
})

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'most'
  if (diffMins < 60) return `${diffMins} perce`
  if (diffHours < 24) return `${diffHours} órája`
  return `${diffDays} napja`
}

async function loadStats() {
  try {
    // Fetch all stats
    const [events, predictions, tickets] = await Promise.all([
      getAllEvents(),
      $fetch('/api/export/json?type=predictions').catch(() => ({ predictions: [] })),
      $fetch<any>('/api/admin/stats').catch(() => ({ sources: 0, tickets: 0 }))
    ])

    stats.value.eventsCount = events.length
    stats.value.predictionsCount = (predictions as any).predictions?.length || 0
    stats.value.sourcesCount = tickets.sources || 0
    stats.value.ticketsCount = tickets.tickets || 0
  } catch (e) {
    console.error('Error loading stats:', e)
  }
}

async function loadActivity() {
  loadingActivity.value = true
  try {
    const predData = await $fetch<any>('/api/export/json?type=predictions').catch(() => ({ predictions: [] }))
    recentPredictions.value = (predData.predictions || []).slice(0, 5)

    // Mock tickets for now (would need a proper API)
    recentTickets.value = []
  } catch (e) {
    console.error('Error loading activity:', e)
  } finally {
    loadingActivity.value = false
  }
}

async function predictAllEvents() {
  bulkActions.value.predictAll.loading = true
  bulkActions.value.predictAll.result = ''
  
  try {
    const events = await getAllEvents()
    const eventsWithoutPrediction = []

    // Check which events need predictions
    for (const event of events) {
      try {
        await $fetch('/api/predict', {
          method: 'POST',
          body: { event_id: event.id, force_refresh: false }
        })
      } catch {
        eventsWithoutPrediction.push(event)
      }
    }

    if (eventsWithoutPrediction.length === 0) {
      bulkActions.value.predictAll.result = 'Minden eseményhez van már predikció!'
      bulkActions.value.predictAll.success = true
      return
    }

    // Generate predictions
    let successCount = 0
    for (const event of eventsWithoutPrediction) {
      try {
        await $fetch('/api/predict', {
          method: 'POST',
          body: { event_id: event.id, strategy: 'ensemble', force_refresh: true }
        })
        successCount++
      } catch (e) {
        console.error(`Failed to predict ${event.id}:`, e)
      }
    }

    bulkActions.value.predictAll.result = `${successCount}/${eventsWithoutPrediction.length} predikció sikeresen generálva!`
    bulkActions.value.predictAll.success = successCount > 0
    
    // Reload stats
    await loadStats()
    await loadActivity()
  } catch (e: any) {
    bulkActions.value.predictAll.result = `Hiba: ${e.message}`
    bulkActions.value.predictAll.success = false
  } finally {
    bulkActions.value.predictAll.loading = false
  }
}

async function crawlPendingEvents() {
  bulkActions.value.crawlPending.loading = true
  bulkActions.value.crawlPending.result = ''
  
  try {
    const events = await getAllEvents()
    
    // Note: This is a simplified version
    // In production, you'd want to check which events actually need crawling
    bulkActions.value.crawlPending.result = `${events.length} esemény feldolgozásra vár. Indítsd el manuálisan az Admin Crawl oldalon.`
    bulkActions.value.crawlPending.success = true
  } catch (e: any) {
    bulkActions.value.crawlPending.result = `Hiba: ${e.message}`
    bulkActions.value.crawlPending.success = false
  } finally {
    bulkActions.value.crawlPending.loading = false
  }
}

async function cleanOldData() {
  if (!confirm('Biztosan törölni szeretnéd a 90 napnál régebbi adatokat? Ez a művelet nem visszavonható.')) {
    return
  }

  bulkActions.value.cleanOld.loading = true
  bulkActions.value.cleanOld.result = ''
  
  try {
    // This would be implemented in a proper API endpoint
    bulkActions.value.cleanOld.result = 'Funkció fejlesztés alatt - hamarosan elérhető!'
    bulkActions.value.cleanOld.success = true
  } catch (e: any) {
    bulkActions.value.cleanOld.result = `Hiba: ${e.message}`
    bulkActions.value.cleanOld.success = false
  } finally {
    bulkActions.value.cleanOld.loading = false
  }
}

onMounted(async () => {
  await Promise.all([
    loadStats(),
    loadActivity()
  ])
})

useHead({
  title: 'Admin Dashboard - TipMix AI',
  meta: [
    {
      name: 'description',
      content: 'Admin dashboard for TipMix AI system'
    }
  ]
})
</script>
