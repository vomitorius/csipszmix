<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h3 class="text-xl font-bold mb-4">AI Predikció</h3>
    
    <div v-if="prediction" class="space-y-4">
      <div class="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
        <div>
          <p class="text-sm text-gray-600">Javasolt kimenetel</p>
          <p class="text-2xl font-bold text-blue-600">{{ outcomeText }}</p>
        </div>
        <div class="text-right">
          <p class="text-sm text-gray-600">Megbízhatóság</p>
          <p class="text-2xl font-bold">{{ (prediction.confidence * 100).toFixed(0) }}%</p>
        </div>
      </div>

      <div class="space-y-2">
        <p class="font-semibold">Valószínűségek:</p>
        <div class="space-y-1">
          <div class="flex justify-between items-center">
            <span class="text-sm">Hazai győzelem (1):</span>
            <span class="font-semibold">{{ (prediction.probabilities.home * 100).toFixed(1) }}%</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm">Döntetlen (X):</span>
            <span class="font-semibold">{{ (prediction.probabilities.draw * 100).toFixed(1) }}%</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm">Vendég győzelem (2):</span>
            <span class="font-semibold">{{ (prediction.probabilities.away * 100).toFixed(1) }}%</span>
          </div>
        </div>
      </div>

      <div v-if="prediction.rationale" class="p-4 bg-gray-50 rounded-lg">
        <p class="text-sm font-semibold mb-2">Indoklás:</p>
        <p class="text-sm text-gray-700">{{ prediction.rationale }}</p>
      </div>

      <div v-if="prediction.topSources && prediction.topSources.length > 0" class="space-y-2">
        <p class="text-sm font-semibold">Források:</p>
        <ul class="space-y-1">
          <li v-for="(source, idx) in prediction.topSources" :key="idx" class="text-sm text-blue-600">
            <a :href="source" target="_blank" rel="noopener noreferrer" class="hover:underline">
              {{ source }}
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-500">
      <p>Még nincs elérhető predikció ehhez az eseményhez.</p>
      <p class="text-sm mt-2">A predikciók később lesznek elérhetőek.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Prediction } from '~/server/utils/types'

const props = defineProps<{
  prediction?: Prediction
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
</script>
