<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Tippszelvények</h1>
      <p class="text-gray-600">
        Generált variációk és tippkombinációk
      </p>
    </div>

    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <p class="text-blue-800 mb-4">
        <strong>🚧 Fejlesztés alatt</strong>
      </p>
      <p class="text-blue-700 text-sm">
        A szelvénygenerálás és variációkezelés funkciók a következő fejlesztési fázisokban lesznek implementálva (M2, M3).
      </p>
      <ul class="mt-4 space-y-2 text-sm text-blue-700">
        <li>• Eseményválasztás és kombinációk készítése</li>
        <li>• Költségkeret alapú variációgenerálás</li>
        <li>• AI-alapú javaslatok és optimalizálás</li>
        <li>• Export CSV/JSON formátumban</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Szelvények - TipMix AI',
  meta: [
    {
      name: 'description',
      content: 'Tippszelvények és variációk kezelése'
    }
  ]
})
</script>
