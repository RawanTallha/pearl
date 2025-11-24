export type FatigueStatus = 'Normal' | 'Monitor' | 'High Fatigue'

export type RosterRole = 'primary' | 'backup'

export interface ControllerProfile {
  id: string
  name: string
  password?: string
  experienceYears: number
  yearOfBirth: number
  gender: 'Female' | 'Male' | 'Other'
  healthNotes?: string
  active: boolean
  sectorId: string
  sectorName: string
  shiftGroup: string
  rosterRole: RosterRole
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
  sectorId?: string
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
  action: 'suggest_break' | 'delay' | 'monitor' | 'backup_assigned'
  message: string
  createdAt: string
}

export interface SectorRoster {
  id: string
  name: string
  shiftGroup: string
  description?: string
  primary: ControllerProfile[]
  backup: ControllerProfile[]
}

export interface SectorSummary {
  id: string
  name: string
  shiftGroup: string
}

