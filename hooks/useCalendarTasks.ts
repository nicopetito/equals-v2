'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { calendarTasksService } from '@/services/calendar_tasks.service'
import type { CalendarTask } from '@/types'

export interface UseCalendarTasksReturn {
  tasksByDate: Map<string, CalendarTask[]>
  loading: boolean
  addTask: (date: string, text: string) => Promise<void>
  toggleTask: (id: string, done: boolean) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  refetch: () => void
}

export function useCalendarTasks(month: Date): UseCalendarTasksReturn {
  const from = format(startOfMonth(month), 'yyyy-MM-dd')
  const to   = format(endOfMonth(month),   'yyyy-MM-dd')

  const [tasks, setTasks]     = useState<CalendarTask[]>([])
  const [loading, setLoading] = useState(true)
  const [rev, setRev]         = useState(0)

  useEffect(() => {
    let active = true
    calendarTasksService.listByMonth(from, to)
      .then(data => { if (active) setTasks(data) })
      .catch(() => { /* tasks are non-critical, silently fail */ })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [from, to, rev])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>()
    for (const task of tasks) {
      const list = map.get(task.date) ?? []
      list.push(task)
      map.set(task.date, list)
    }
    return map
  }, [tasks])

  const addTask = useCallback(async (date: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const tempId = `temp-${Date.now()}`
    const optimistic: CalendarTask = { id: tempId, date, text: trimmed, done: false }
    setTasks(prev => [...prev, optimistic])

    try {
      const created = await calendarTasksService.create(date, trimmed)
      setTasks(prev => prev.map(t => t.id === tempId ? created : t))
    } catch {
      setTasks(prev => prev.filter(t => t.id !== tempId))
    }
  }, [])

  const toggleTask = useCallback(async (id: string, done: boolean) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t))
    try {
      await calendarTasksService.toggle(id, done)
    } catch {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !done } : t))
    }
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    const backup = tasks.find(t => t.id === id)
    setTasks(prev => prev.filter(t => t.id !== id))
    try {
      await calendarTasksService.delete(id)
    } catch {
      if (backup) setTasks(prev => [...prev, backup])
    }
  }, [tasks])

  function refetch() { setLoading(true); setRev(r => r + 1) }

  return { tasksByDate, loading, addTask, toggleTask, deleteTask, refetch }
}
