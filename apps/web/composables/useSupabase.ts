import { createClient } from '@supabase/supabase-js'

export const useSupabase = () => {
  const config = useRuntimeConfig()
  
  const supabaseUrl = config.public.supabaseUrl
  const supabaseKey = config.public.supabaseAnonKey
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured')
    return null
  }
  
  const client = createClient(supabaseUrl, supabaseKey)
  
  return client
}
