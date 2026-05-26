export interface CalendarTask {
  id: string
  user_id?: string
  date: string   // 'yyyy-MM-dd'
  text: string
  done: boolean
  created_at?: string
  updated_at?: string
}
