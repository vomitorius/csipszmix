<template>
  <div class="grid grid-cols-3 gap-3">
    <div class="text-center p-3 bg-gray-50 rounded-lg">
      <p class="text-xs text-gray-500 mb-1">1 (Hazai)</p>
      <p class="text-xl font-bold text-blue-600">{{ odds.home.toFixed(2) }}</p>
    </div>
    <div class="text-center p-3 bg-gray-50 rounded-lg">
      <p class="text-xs text-gray-500 mb-1">X (Döntetlen)</p>
      <p class="text-xl font-bold text-gray-600">{{ odds.draw.toFixed(2) }}</p>
    </div>
    <div class="text-center p-3 bg-gray-50 rounded-lg">
      <p class="text-xs text-gray-500 mb-1">2 (Vendég)</p>
      <p class="text-xl font-bold text-red-600">{{ odds.away.toFixed(2) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  odds: {
    home: number
    draw: number
    away: number
  }
}>()
</script>
