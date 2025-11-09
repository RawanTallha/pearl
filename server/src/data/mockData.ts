import type { ControllerProfile, FatigueSnapshot, ShiftSummary, SupervisorAction, SupervisorProfile } from '../types.js'

export const controllers: ControllerProfile[] = [
  {
    id: 'C_Lama_001',
    name: 'Lama',
    experienceYears: 7,
    yearOfBirth: 1993,
    gender: 'Female',
    healthNotes: 'No chronic conditions. Sensitive to caffeine.',
    active: true,
    baselineReadiness: 0.91,
    baselineFactors: {
      blinkRate: 16,
      speechRate: 128,
      responseDelay: 0.9,
      toneStability: 0.94,
    },
  },
  {
    id: 'C_Rawan_002',
    name: 'Rawan',
    experienceYears: 5,
    yearOfBirth: 1996,
    gender: 'Female',
    healthNotes: 'Seasonal allergies. Uses blue-light glasses.',
    active: true,
    baselineReadiness: 0.88,
    baselineFactors: {
      blinkRate: 18,
      speechRate: 120,
      responseDelay: 1.1,
      toneStability: 0.89,
    },
  },
  {
    id: 'C_Rahaf_003',
    name: 'Rahaf',
    experienceYears: 9,
    yearOfBirth: 1992,
    gender: 'Female',
    healthNotes: 'Prefers standing desk setup.',
    active: true,
    baselineReadiness: 0.95,
    baselineFactors: {
      blinkRate: 14,
      speechRate: 115,
      responseDelay: 0.8,
      toneStability: 0.97,
    },
  },
]

export const supervisor: SupervisorProfile = {
  id: 'S_Sara_001',
  name: 'Sara',
  password: 'pearl-secure',
}

export const simulationFrames: FatigueSnapshot[][] = [
  [
    {
      controllerId: 'C_Lama_001',
      timestamp: '2025-11-09T10:30:00Z',
      score: 0.42,
      readinessLevel: 0.9,
      status: 'Monitor',
      factors: [
        { label: 'Blink rate', value: '19/min', trend: 'up' },
        { label: 'Speech rate', value: '132 wpm', trend: 'up' },
        { label: 'Tone stability', value: '0.90', trend: 'down' },
      ],
      recommendation: 'Monitor breathing cadence',
    },
    {
      controllerId: 'C_Rawan_002',
      timestamp: '2025-11-09T10:30:00Z',
      score: 0.68,
      readinessLevel: 0.74,
      status: 'High Fatigue',
      factors: [
        { label: 'Blink rate', value: '21/min', trend: 'up' },
        { label: 'Yawn count', value: '2 in 5 min', trend: 'up' },
        { label: 'Pause ratio', value: '32%', trend: 'up' },
      ],
      recommendation: 'Suggest 5 min micro-break',
    },
    {
      controllerId: 'C_Rahaf_003',
      timestamp: '2025-11-09T10:30:00Z',
      score: 0.28,
      readinessLevel: 0.93,
      status: 'Normal',
      factors: [
        { label: 'Blink rate', value: '15/min', trend: 'steady' },
        { label: 'Posture', value: 'Stable', trend: 'steady' },
        { label: 'Response delay', value: '0.8s', trend: 'steady' },
      ],
      recommendation: 'Maintain current rotation',
    },
  ],
  [
    {
      controllerId: 'C_Lama_001',
      timestamp: '2025-11-09T10:35:00Z',
      score: 0.46,
      readinessLevel: 0.88,
      status: 'Monitor',
      factors: [
        { label: 'Blink rate', value: '20/min', trend: 'up' },
        { label: 'Speech rate', value: '135 wpm', trend: 'up' },
        { label: 'Tone stability', value: '0.88', trend: 'down' },
      ],
      recommendation: 'Encourage hydration',
    },
    {
      controllerId: 'C_Rawan_002',
      timestamp: '2025-11-09T10:35:00Z',
      score: 0.73,
      readinessLevel: 0.7,
      status: 'High Fatigue',
      factors: [
        { label: 'Blink rate', value: '23/min', trend: 'up' },
        { label: 'Pause ratio', value: '37%', trend: 'up' },
        { label: 'Tone stability', value: '0.71', trend: 'down' },
      ],
      recommendation: 'Trigger break alert',
    },
    {
      controllerId: 'C_Rahaf_003',
      timestamp: '2025-11-09T10:35:00Z',
      score: 0.32,
      readinessLevel: 0.92,
      status: 'Normal',
      factors: [
        { label: 'Blink rate', value: '14/min', trend: 'steady' },
        { label: 'Voice tone', value: 'Calm', trend: 'steady' },
        { label: 'Response delay', value: '0.9s', trend: 'steady' },
      ],
      recommendation: 'Ready to assist',
    },
  ],
  [
    {
      controllerId: 'C_Lama_001',
      timestamp: '2025-11-09T10:40:00Z',
      score: 0.39,
      readinessLevel: 0.9,
      status: 'Monitor',
      factors: [
        { label: 'Blink rate', value: '18/min', trend: 'down' },
        { label: 'Speech rate', value: '129 wpm', trend: 'down' },
        { label: 'Tone stability', value: '0.92', trend: 'up' },
      ],
      recommendation: 'Stable after advisory',
    },
    {
      controllerId: 'C_Rawan_002',
      timestamp: '2025-11-09T10:40:00Z',
      score: 0.65,
      readinessLevel: 0.77,
      status: 'Monitor',
      factors: [
        { label: 'Blink rate', value: '20/min', trend: 'down' },
        { label: 'Yawns', value: '1 in 5 min', trend: 'down' },
        { label: 'Pause ratio', value: '28%', trend: 'down' },
      ],
      recommendation: 'Continue monitoring',
    },
    {
      controllerId: 'C_Rahaf_003',
      timestamp: '2025-11-09T10:40:00Z',
      score: 0.29,
      readinessLevel: 0.94,
      status: 'Normal',
      factors: [
        { label: 'Blink rate', value: '15/min', trend: 'steady' },
        { label: 'Posture', value: 'Stable', trend: 'steady' },
        { label: 'Speech rate', value: '116 wpm', trend: 'steady' },
      ],
      recommendation: 'Standing by',
    },
  ],
]

export const shiftSummaries: ShiftSummary[] = [
  {
    controllerId: 'C_Lama_001',
    shiftDate: '2025-11-08',
    preShiftReadiness: 0.92,
    peakFatigue: 0.58,
    postShiftDelta: 0.25,
    notes: 'Handled high-traffic window with short break.',
  },
  {
    controllerId: 'C_Rawan_002',
    shiftDate: '2025-11-08',
    preShiftReadiness: 0.89,
    peakFatigue: 0.76,
    postShiftDelta: 0.31,
    notes: 'Night shift extension. Recommended schedule rotation.',
  },
  {
    controllerId: 'C_Rahaf_003',
    shiftDate: '2025-11-08',
    preShiftReadiness: 0.94,
    peakFatigue: 0.45,
    postShiftDelta: 0.14,
  },
]

export const supervisorActions: SupervisorAction[] = [
  {
    id: 'A-001',
    controllerId: 'C_Rawan_002',
    action: 'suggest_break',
    message: 'Triggered 5-min micro-break for Rawan',
    createdAt: '2025-11-09T10:36:00Z',
  },
  {
    id: 'A-002',
    controllerId: 'C_Lama_001',
    action: 'monitor',
    message: 'Monitoring Lama during high workload window',
    createdAt: '2025-11-09T10:33:00Z',
  },
]

