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
    
    // LLM Provider configuration (M2)
    openaiApiKey: process.env.OPENAI_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    togetherApiKey: process.env.TOGETHER_API_KEY,
    llmProvider: process.env.LLM_PROVIDER || 'openai',
    chatModel: process.env.CHAT_MODEL || 'gpt-4o-mini',
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    
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
