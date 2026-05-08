export interface User {
  id: string
  email: string
  created_at?: string
  updated_at?: string
}

export interface UserProfile {
  id: string
  user_id: string
  full_name?: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}
