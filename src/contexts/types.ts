export interface CalendarEvent {
  id: string
  day: number
  startHour: number
  duration: number
  title: string
  description?: string
  player_name?: string
}

export type ViewMode = 'personal' | 'all'

export interface PendingChanges {
  toCreate: CalendarEvent[]
  toDelete: string[]
}

export interface DragState {
  isDragging: boolean
  dragStart: { day: number; hour: number } | null
  dragEnd: { day: number; hour: number } | null
}

export interface CalendarContextType {
  // Core state
  events: CalendarEvent[]
  playerName: string
  currentUser: string
  viewMode: ViewMode
  loading: boolean
  error: string | null
  showPlayerModal: boolean
  
  // Drag state
  isDragging: boolean
  dragStart: { day: number; hour: number } | null
  dragEnd: { day: number; hour: number } | null
  
  // Debounced save state
  pendingChanges: PendingChanges
  saveCountdown: number | null
  isSaving: boolean
  showSaved: boolean
  
  // Actions
  setPlayerName: (name: string) => void
  setCurrentUser: (name: string) => void
  setViewMode: (mode: ViewMode) => void
  loadSessions: () => Promise<void>
  handleMouseDown: (day: number, hour: number) => void
  handleMouseEnter: (day: number, hour: number) => void
  handleMouseUp: () => void
  getFilteredEvents: () => CalendarEvent[]
  
  // Constants
  SESSION_DURATION: number
}
