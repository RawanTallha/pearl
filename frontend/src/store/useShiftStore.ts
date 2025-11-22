import { create } from 'zustand'

export type ShiftStatus = 'idle' | 'active' | 'break' | 'completed'

interface ShiftState {
  currentShift: number // 1-3 work periods
  status: ShiftStatus
  shiftTimeRemaining: number // in seconds
  breakTimeRemaining: number // in seconds
  shiftStartTime: number | null // timestamp when shift started
  breakStartTime: number | null // timestamp when break started
  initialShiftDuration: number // initial shift duration when shift started
  initialBreakDuration: number // initial break duration when break started
  isOnBreak: boolean
  totalShifts: number
  useAlternativeSchedule: boolean | null // null = not determined yet, true/false = schedule choice
  
  // Actions
  startShift: (shiftNumber: number) => void
  startBreak: () => void
  endShift: () => void
  updateTimer: () => void
  resetShifts: () => void
  getShiftDuration: (shiftNumber: number) => number
  getBreakDuration: (breakNumber: number) => number
}

// ATCO Schedule: ~5 hours work, ~3 hours breaks, max 2 hours without break
// Structure: 2h work → 1.5h break → 2h work → 1.5h break → 1h work = 5h work, 3h break
const SHIFT_DURATIONS = [
  2 * 60 * 60,  // Shift 1: 2 hours
  2 * 60 * 60,  // Shift 2: 2 hours
  1 * 60 * 60,  // Shift 3: 1 hour (total: 5 hours)
]

const BREAK_DURATIONS = [
  90 * 60,  // Break 1: 1.5 hours (90 minutes)
  90 * 60,  // Break 2: 1.5 hours (90 minutes) (total: 3 hours)
]

// Alternative schedule (5:20 work, 2:40 break) - can be randomized
const ALTERNATIVE_SHIFT_DURATIONS = [
  2 * 60 * 60,      // Shift 1: 2 hours
  2 * 60 * 60,      // Shift 2: 2 hours
  1 * 60 * 60 + 20 * 60, // Shift 3: 1 hour 20 minutes (total: 5:20)
]

const ALTERNATIVE_BREAK_DURATIONS = [
  80 * 60,  // Break 1: 1 hour 20 minutes
  80 * 60,  // Break 2: 1 hour 20 minutes (total: 2:40)
]

export const useShiftStore = create<ShiftState>((set, get) => ({
  currentShift: 1,
  status: 'idle',
  shiftTimeRemaining: SHIFT_DURATIONS[0],
  breakTimeRemaining: 0,
  shiftStartTime: null,
  breakStartTime: null,
  initialShiftDuration: SHIFT_DURATIONS[0],
  initialBreakDuration: 0,
  isOnBreak: false,
  totalShifts: 3, // 3 work periods
  useAlternativeSchedule: null, // Will be determined on first shift start

  getShiftDuration: (shiftNumber: number) => {
    const state = get()
    // Determine schedule on first shift (30% chance for alternative)
    if (state.useAlternativeSchedule === null) {
      const useAlternative = Math.random() < 0.3 // 30% chance for alternative
      set({ useAlternativeSchedule: useAlternative })
    }
    const durations = state.useAlternativeSchedule ? ALTERNATIVE_SHIFT_DURATIONS : SHIFT_DURATIONS
    return durations[shiftNumber - 1] || durations[durations.length - 1]
  },

  getBreakDuration: (breakNumber: number) => {
    const state = get()
    // Use the same schedule choice as shifts
    if (state.useAlternativeSchedule === null) {
      const useAlternative = Math.random() < 0.3 // 30% chance for alternative
      set({ useAlternativeSchedule: useAlternative })
    }
    const durations = state.useAlternativeSchedule ? ALTERNATIVE_BREAK_DURATIONS : BREAK_DURATIONS
    return durations[breakNumber - 1] || durations[durations.length - 1]
  },

  startShift: (shiftNumber: number) => {
    const now = Date.now()
    const duration = get().getShiftDuration(shiftNumber)
    set({
      currentShift: shiftNumber,
      status: 'active',
      shiftTimeRemaining: duration,
      initialShiftDuration: duration,
      shiftStartTime: now,
      breakStartTime: null,
      isOnBreak: false,
    })
  },

  startBreak: () => {
    const { currentShift } = get()
    const now = Date.now()
    // Break number is currentShift (break after shift 1, break after shift 2)
    const breakNumber = currentShift
    const breakDuration = get().getBreakDuration(breakNumber)
    
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

    if (state.status === 'active' && state.shiftStartTime && state.initialShiftDuration > 0) {
      const elapsed = Math.floor((now - state.shiftStartTime) / 1000)
      const remaining = Math.max(0, state.initialShiftDuration - elapsed)

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
      shiftTimeRemaining: SHIFT_DURATIONS[0],
      breakTimeRemaining: 0,
      shiftStartTime: null,
      breakStartTime: null,
      initialShiftDuration: SHIFT_DURATIONS[0],
      initialBreakDuration: 0,
      isOnBreak: false,
      useAlternativeSchedule: null,
    })
  },
}))

