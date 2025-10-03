<template>
  <div v-if="prediction" class="space-y-6">
    <!-- Main Prediction Card -->
    <div class="flex items-center justify-between p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
      <div>
        <p class="text-sm text-gray-600 mb-1">Javasolt kimenetel</p>
        <p class="text-3xl font-bold text-purple-700">{{ outcomeText }}</p>
        <p v-if="prediction.method" class="text-xs text-gray-500 mt-1">
          Módszer: {{ methodText }}
        </p>
      </div>
      <div class="text-right">
        <p class="text-sm text-gray-600 mb-1">Megbízhatóság</p>
        <p class="text-3xl font-bold text-blue-700">{{ (prediction.confidence * 100).toFixed(0) }}%</p>
        <div class="mt-2 w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
            :style="{ width: `${prediction.confidence * 100}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Probability Distribution -->
    <div class="space-y-3">
      <p class="font-semibold text-gray-800">Valószínűségi eloszlás:</p>
      
      <!-- Home Win -->
      <div class="space-y-1">
        <div class="flex justify-between items-center text-sm">
          <span class="text-gray-700">Hazai győzelem (1)</span>
          <span class="font-bold text-green-700">{{ (prediction.probabilities.home * 100).toFixed(1) }}%</span>
        </div>
        <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            class="h-full bg-green-500 transition-all duration-500"
            :style="{ width: `${prediction.probabilities.home * 100}%` }"
          ></div>
        </div>
      </div>

      <!-- Draw -->
      <div class="space-y-1">
        <div class="flex justify-between items-center text-sm">
          <span class="text-gray-700">Döntetlen (X)</span>
          <span class="font-bold text-yellow-700">{{ (prediction.probabilities.draw * 100).toFixed(1) }}%</span>
        </div>
        <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            class="h-full bg-yellow-500 transition-all duration-500"
            :style="{ width: `${prediction.probabilities.draw * 100}%` }"
          ></div>
        </div>
      </div>

      <!-- Away Win -->
      <div class="space-y-1">
        <div class="flex justify-between items-center text-sm">
          <span class="text-gray-700">Vendég győzelem (2)</span>
          <span class="font-bold text-red-700">{{ (prediction.probabilities.away * 100).toFixed(1) }}%</span>
        </div>
        <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            class="h-full bg-red-500 transition-all duration-500"
            :style="{ width: `${prediction.probabilities.away * 100}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Rationale -->
    <div v-if="prediction.rationale" class="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
      <p class="text-sm font-semibold mb-2 text-gray-800 flex items-center">
        <span class="mr-2">💡</span>
        Indoklás:
      </p>
      <p class="text-sm text-gray-700 leading-relaxed">{{ prediction.rationale }}</p>
    </div>

    <!-- Key Factors -->
    <div v-if="prediction.keyFactors && prediction.keyFactors.length > 0" class="space-y-2">
      <p class="text-sm font-semibold text-gray-800 flex items-center">
        <span class="mr-2">🎯</span>
        Kulcs tényezők:
      </p>
      <ul class="space-y-1 pl-4">
        <li 
          v-for="(factor, idx) in prediction.keyFactors" 
          :key="idx" 
          class="text-sm text-gray-700 flex items-start"
        >
          <span class="text-purple-500 mr-2">•</span>
          <span>{{ factor }}</span>
        </li>
      </ul>
    </div>

    <!-- Top Sources -->
    <div v-if="prediction.topSources && prediction.topSources.length > 0" class="space-y-2">
      <p class="text-sm font-semibold text-gray-800 flex items-center">
        <span class="mr-2">📚</span>
        Források:
      </p>
      <ul class="space-y-1 pl-4">
        <li v-for="(source, idx) in prediction.topSources" :key="idx" class="text-sm">
          <a 
            :href="source" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
          >
            <span class="mr-1">🔗</span>
            {{ formatSourceUrl(source) }}
          </a>
        </li>
      </ul>
    </div>
  </div>

  <div v-else class="text-center py-12 text-gray-500">
    <div class="mb-4">
      <span class="text-4xl">🎯</span>
    </div>
    <p class="text-lg font-medium mb-2">Még nincs elérhető predikció</p>
    <p class="text-sm">Kattints a "Predikció Generálása" gombra a kezdéshez</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  prediction?: any
}>()

const outcomeText = computed(() => {
  if (!props.prediction) return ''
  
  switch (props.prediction.outcome) {
    case '1':
      return 'Hazai győzelem (1)'
    case 'X':
      return 'Döntetlen (X)'
    case '2':
      return 'Vendég győzelem (2)'
    default:
      return ''
  }
})

const methodText = computed(() => {
  if (!props.prediction?.method) return ''
  
  switch (props.prediction.method) {
    case 'baseline':
      return 'Odds alapú'
    case 'facts':
      return 'Tények alapú'
    case 'llm':
      return 'AI elemzés'
    case 'ensemble':
      return 'Ensemble (kombinált)'
    default:
      return props.prediction.method
  }
})

function formatSourceUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '') + (urlObj.pathname !== '/' ? urlObj.pathname.substring(0, 30) + '...' : '')
  } catch {
    return url.substring(0, 50) + (url.length > 50 ? '...' : '')
  }
}
</script>
