import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://amiabvsynwuiupwvniqk.supabase.co'
const supabaseKey = 'sb_publishable_iBkHg15lONHkJXNn01wihA_7rQfnKh9'

export const supabase = createClient(supabaseUrl, supabaseKey)
