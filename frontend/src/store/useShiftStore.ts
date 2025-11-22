import { create } from 'zustand'

export type ShiftStatus = 'idle' | 'active' | 'break' | 'completed'

interface ShiftState {
  currentShift: number // 1-4
  status: ShiftStatus
  shiftTimeRemaining: number // in seconds
  breakTimeRemaining: number // in seconds
  shiftStartTime: number | null // timestamp when shift started
  breakStartTime: number | null // timestamp when break started
  initialBreakDuration: number // initial break duration when break started
  isOnBreak: boolean
  totalShifts: number
  
  // Actions
  startShift: (shiftNumber: number) => void
  startBreak: () => void
  endShift: () => void
  updateTimer: () => void
  resetShifts: () => void
}

const SHIFT_DURATION = 2 * 60 * 60 // 2 hours in seconds
const BREAK_DURATION_MIN = 40 * 60 // 40 minutes in seconds
const BREAK_DURATION_MAX = 60 * 60 // 60 minutes in seconds

export const useShiftStore = create<ShiftState>((set, get) => ({
  currentShift: 1,
  status: 'idle',
  shiftTimeRemaining: SHIFT_DURATION,
  breakTimeRemaining: 0,
  shiftStartTime: null,
  breakStartTime: null,
  initialBreakDuration: 0,
  isOnBreak: false,
  totalShifts: 4,

  startShift: (shiftNumber: number) => {
    const now = Date.now()
    set({
      currentShift: shiftNumber,
      status: 'active',
      shiftTimeRemaining: SHIFT_DURATION,
      shiftStartTime: now,
      breakStartTime: null,
      isOnBreak: false,
    })
  },

  startBreak: () => {
    const { currentShift, totalShifts } = get()
    const now = Date.now()
    // Random break duration between 40-60 minutes
    const breakDuration = Math.floor(
      BREAK_DURATION_MIN + Math.random() * (BREAK_DURATION_MAX - BREAK_DURATION_MIN)
    )
    
    set({
      status: 'break',
      breakTimeRemaining: breakDuration,
      initialBreakDuration: breakDuration,
      breakStartTime: now,
      shiftStartTime: null,
      isOnBreak: true,
    })
  },

  endShift: () => {
    const { currentShift, totalShifts } = get()
    if (currentShift >= totalShifts) {
      set({
        status: 'completed',
        isOnBreak: false,
        shiftTimeRemaining: 0,
        breakTimeRemaining: 0,
      })
    } else {
      // Automatically start break after shift ends
      get().startBreak()
    }
  },

  updateTimer: () => {
    const state = get()
    const now = Date.now()

    if (state.status === 'active' && state.shiftStartTime) {
      const elapsed = Math.floor((now - state.shiftStartTime) / 1000)
      const remaining = Math.max(0, SHIFT_DURATION - elapsed)

      if (remaining <= 0) {
        // Shift ended
        get().endShift()
      } else {
        set({ shiftTimeRemaining: remaining })
      }
    } else if (state.status === 'break' && state.breakStartTime && state.initialBreakDuration > 0) {
      const elapsed = Math.floor((now - state.breakStartTime) / 1000)
      const remaining = Math.max(0, state.initialBreakDuration - elapsed)

      if (remaining <= 0) {
        // Break ended, start next shift
        const nextShift = state.currentShift + 1
        if (nextShift <= state.totalShifts) {
          get().startShift(nextShift)
        } else {
          set({
            status: 'completed',
            isOnBreak: false,
            breakTimeRemaining: 0,
            initialBreakDuration: 0,
          })
        }
      } else {
        set({ breakTimeRemaining: remaining })
      }
    }
  },

  resetShifts: () => {
    set({
      currentShift: 1,
      status: 'idle',
      shiftTimeRemaining: SHIFT_DURATION,
      breakTimeRemaining: 0,
      shiftStartTime: null,
      breakStartTime: null,
      initialBreakDuration: 0,
      isOnBreak: false,
    })
  },
}))

