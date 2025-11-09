export type FatigueStatus = 'Normal' | 'Monitor' | 'High Fatigue'

export interface ControllerProfile {
  id: string
  name: string
  experienceYears: number
  yearOfBirth: number
  gender: 'Female' | 'Male' | 'Other'
  healthNotes?: string
  active: boolean
  baselineReadiness: number
  baselineFactors: {
    blinkRate: number
    speechRate: number
    responseDelay: number
    toneStability: number
  }
}

export interface SupervisorProfile {
  id: string
  name: string
  password: string
}

export interface FatigueFactor {
  label: string
  value: string
  trend?: 'up' | 'down' | 'steady'
}

export interface FatigueSnapshot {
  controllerId: string
  timestamp: string
  score: number
  status: FatigueStatus
  readinessLevel: number
  factors: FatigueFactor[]
  recommendation?: string
}

export interface ShiftSummary {
  controllerId: string
  shiftDate: string
  preShiftReadiness: number
  postShiftDelta: number
  peakFatigue: number
  notes?: string
}

export interface SupervisorAction {
  id: string
  controllerId: string
  action: 'suggest_break' | 'delay' | 'monitor'
  message: string
  createdAt: string
}

