<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Crawl & Analyze Events</h1>
      <p class="text-gray-600">Automatically discover sources and extract facts from web content</p>
    </div>

    <!-- Event Selection -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Select Event</h2>
      
      <div v-if="eventsLoading" class="text-center py-4">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
      
      <div v-else-if="events.length > 0" class="space-y-2">
        <div
          v-for="event in events"
          :key="event.id"
          @click="selectEvent(event)"
          :class="[
            'p-4 border-2 rounded-lg cursor-pointer transition-colors',
            selectedEvent?.id === event.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          ]"
        >
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm text-gray-500">{{ event.league }}</p>
              <p class="font-semibold text-lg">{{ event.home }} vs {{ event.away }}</p>
              <p class="text-sm text-gray-600">{{ formatDate(event.startTime) }}</p>
            </div>
            <div class="text-right">
              <span
                v-if="sourceStats[event.id]"
                class="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
              >
                {{ sourceStats[event.id].sources }} sources
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-4 text-gray-500">
        No events available
      </div>
    </div>

    <!-- Actions -->
    <div v-if="selectedEvent" class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Actions</h2>
      
      <div class="flex gap-4">
        <button
          @click="startCrawl"
          :disabled="crawling"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {{ crawling ? 'Crawling...' : 'Start Crawl' }}
        </button>
        
        <button
          @click="startAnalyze"
          :disabled="analyzing || !hasSourcesForSelected"
          class="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {{ analyzing ? 'Analyzing...' : 'Analyze Facts' }}
        </button>
        
        <button
          @click="loadSourcesAndFacts"
          :disabled="loadingSources"
          class="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {{ loadingSources ? 'Loading...' : 'Refresh Data' }}
        </button>
      </div>
      
      <!-- Progress/Status -->
      <div v-if="statusMessage" class="mt-4 p-4 rounded-lg" :class="statusClass">
        <p class="font-medium">{{ statusMessage }}</p>
        <p v-if="statusDetails" class="text-sm mt-1">{{ statusDetails }}</p>
      </div>
    </div>

    <!-- Sources Display -->
    <div v-if="selectedEvent && sources.length > 0" class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Sources ({{ sources.length }})</h2>
      
      <div class="space-y-3">
        <div
          v-for="source in sources"
          :key="source.id"
          class="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <a
                :href="source.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:text-blue-800 font-medium"
              >
                {{ source.title || source.url }}
              </a>
              <p class="text-sm text-gray-500 mt-1">{{ source.url }}</p>
            </div>
            <div class="text-right ml-4">
              <span class="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                {{ source.language || 'unknown' }}
              </span>
              <p class="text-xs text-gray-500 mt-1">
                {{ formatDate(source.created_at) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Facts Display -->
    <div v-if="selectedEvent && hasFacts" class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold mb-4">Extracted Facts</h2>
      
      <!-- Injuries -->
      <div v-if="facts.injuries?.length > 0" class="mb-6">
        <h3 class="text-lg font-semibold mb-3 text-red-700">🤕 Injuries</h3>
        <div class="space-y-2">
          <div
            v-for="fact in facts.injuries"
            :key="fact.id"
            class="p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <div class="flex justify-between items-start">
              <div>
                <p class="font-medium text-red-900">{{ fact.entity }}</p>
                <p class="text-sm text-red-800 mt-1">{{ fact.description }}</p>
              </div>
              <span class="px-2 py-1 bg-red-200 text-red-800 text-xs rounded">
                {{ Math.round(fact.confidence * 100) }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Suspensions -->
      <div v-if="facts.suspensions?.length > 0" class="mb-6">
        <h3 class="text-lg font-semibold mb-3 text-orange-700">⛔ Suspensions</h3>
        <div class="space-y-2">
          <div
            v-for="fact in facts.suspensions"
            :key="fact.id"
            class="p-3 bg-orange-50 border border-orange-200 rounded-lg"
          >
            <div class="flex justify-between items-start">
              <div>
                <p class="font-medium text-orange-900">{{ fact.entity }}</p>
                <p class="text-sm text-orange-800 mt-1">{{ fact.description }}</p>
              </div>
              <span class="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded">
                {{ Math.round(fact.confidence * 100) }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <div v-if="facts.form?.length > 0" class="mb-6">
        <h3 class="text-lg font-semibold mb-3 text-blue-700">📊 Team Form</h3>
        <div class="space-y-2">
          <div
            v-for="fact in facts.form"
            :key="fact.id"
            class="p-3 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div class="flex justify-between items-start">
              <div>
                <p class="font-medium text-blue-900">{{ fact.entity }}</p>
                <p class="text-sm text-blue-800 mt-1">{{ fact.description }}</p>
              </div>
              <span class="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">
                {{ Math.round(fact.confidence * 100) }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tactical Changes -->
      <div v-if="facts.tactical?.length > 0" class="mb-6">
        <h3 class="text-lg font-semibold mb-3 text-gray-700">⚙️ Tactical Changes</h3>
        <div class="space-y-2">
          <div
            v-for="fact in facts.tactical"
            :key="fact.id"
            class="p-3 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <div class="flex justify-between items-start">
              <div>
                <p class="font-medium text-gray-900">{{ fact.entity }}</p>
                <p class="text-sm text-gray-800 mt-1">{{ fact.description }}</p>
              </div>
              <span class="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded">
                {{ Math.round(fact.confidence * 100) }}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="selectedEvent && sources.length === 0 && !crawling && !loadingSources"
      class="bg-white rounded-lg shadow-md p-12 text-center"
    >
      <p class="text-gray-500 text-lg mb-4">No sources found for this event</p>
      <button
        @click="startCrawl"
        class="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Start Crawl Now
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const events = ref<any[]>([])
const selectedEvent = ref<any>(null)
const sources = ref<any[]>([])
const facts = ref<any>({})
const sourceStats = ref<Record<string, any>>({})

const eventsLoading = ref(false)
const loadingSources = ref(false)
const crawling = ref(false)
const analyzing = ref(false)

const statusMessage = ref('')
const statusDetails = ref('')
const statusType = ref<'success' | 'error' | 'info'>('info')

const statusClass = computed(() => {
  const classes = {
    success: 'bg-green-50 border border-green-200 text-green-800',
    error: 'bg-red-50 border border-red-200 text-red-800',
    info: 'bg-blue-50 border border-blue-200 text-blue-800'
  }
  return classes[statusType.value]
})

const hasSourcesForSelected = computed(() => {
  return selectedEvent.value && sourceStats.value[selectedEvent.value.id]?.sources > 0
})

const hasFacts = computed(() => {
  return Object.values(facts.value).some((arr: any) => arr && arr.length > 0)
})

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function loadEvents() {
  eventsLoading.value = true
  try {
    const response = await $fetch('/api/events')
    events.value = response as any[]
    
    // Load source counts for all events
    for (const event of events.value) {
      try {
        const sourcesData = await $fetch(`/api/sources/${event.id}`)
        sourceStats.value[event.id] = sourcesData.stats
      } catch (error) {
        // Ignore errors for individual events
      }
    }
  } catch (error) {
    console.error('Error loading events:', error)
    showStatus('Failed to load events', 'error')
  } finally {
    eventsLoading.value = false
  }
}

function selectEvent(event: any) {
  selectedEvent.value = event
  loadSourcesAndFacts()
}

async function loadSourcesAndFacts() {
  if (!selectedEvent.value) return
  
  loadingSources.value = true
  try {
    const data = await $fetch(`/api/sources/${selectedEvent.value.id}`)
    sources.value = data.sources
    facts.value = data.facts
    sourceStats.value[selectedEvent.value.id] = data.stats
  } catch (error) {
    console.error('Error loading sources:', error)
    sources.value = []
    facts.value = {}
  } finally {
    loadingSources.value = false
  }
}

async function startCrawl() {
  if (!selectedEvent.value || crawling.value) return
  
  crawling.value = true
  showStatus('Starting crawl...', 'info')
  
  try {
    const response = await $fetch('/api/crawl', {
      method: 'POST',
      body: {
        event_id: selectedEvent.value.id,
        force: false
      }
    })
    
    if (response.success) {
      showStatus(
        `Crawl completed successfully!`,
        'success',
        `Found ${response.stats?.sources_stored || 0} sources with ${response.stats?.chunks_created || 0} chunks`
      )
      await loadSourcesAndFacts()
    } else {
      showStatus(response.message || 'Crawl failed', 'error')
    }
  } catch (error: any) {
    console.error('Crawl error:', error)
    showStatus(error.data?.message || 'Crawl failed', 'error')
  } finally {
    crawling.value = false
  }
}

async function startAnalyze() {
  if (!selectedEvent.value || analyzing.value) return
  
  analyzing.value = true
  showStatus('Analyzing sources...', 'info')
  
  try {
    const response = await $fetch('/api/analyze', {
      method: 'POST',
      body: {
        event_id: selectedEvent.value.id,
        force: false
      }
    })
    
    if (response.success) {
      showStatus(
        'Analysis completed successfully!',
        'success',
        `Extracted ${response.stats?.facts_extracted || 0} facts from ${response.stats?.sources_analyzed || 0} sources`
      )
      await loadSourcesAndFacts()
    } else {
      showStatus(response.message || 'Analysis failed', 'error')
    }
  } catch (error: any) {
    console.error('Analysis error:', error)
    showStatus(error.data?.message || 'Analysis failed', 'error')
  } finally {
    analyzing.value = false
  }
}

function showStatus(message: string, type: 'success' | 'error' | 'info', details?: string) {
  statusMessage.value = message
  statusDetails.value = details || ''
  statusType.value = type
  
  // Auto-clear success messages
  if (type === 'success') {
    setTimeout(() => {
      statusMessage.value = ''
      statusDetails.value = ''
    }, 5000)
  }
}

onMounted(() => {
  loadEvents()
})
</script>
