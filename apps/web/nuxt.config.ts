// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],

  runtimeConfig: {
    // Server-side only
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    tippmixApiUrl: process.env.TIPP_API_URL,
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    
    // Public keys exposed to client
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    }
  },

  typescript: {
    strict: true,
    typeCheck: false
  }
})
