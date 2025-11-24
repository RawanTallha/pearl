import axios from 'axios'
import type {
  ControllerProfile,
  FatigueSnapshot,
  SectorRoster,
  SectorSummary,
  ShiftSummary,
  SupervisorAction,
  SupervisorProfile,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

function isNotFound(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404
}

export async function authenticateController(controllerId: string, password: string): Promise<ControllerProfile | null> {
  if (!controllerId || !password) return null
  try {
    const { data } = await api.post<ControllerProfile>('/auth/controller', { controllerId, password })
    return data
  } catch (error) {
    if (isNotFound(error) || (axios.isAxiosError(error) && error.response?.status === 401)) return null
    throw error
  }
}

export async function authenticateSupervisor(
  supervisorId: string,
  password: string,
): Promise<SupervisorProfile | null> {
  try {
    const { data } = await api.post<SupervisorProfile>('/auth/supervisor', { supervisorId, password })
    return data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null
    }
    throw error
  }
}

export async function fetchControllers(sectorId?: string): Promise<ControllerProfile[]> {
  const params = sectorId ? { sectorId } : undefined
  const { data } = await api.get<ControllerProfile[]>('/controllers', { params })
  return data
}

export async function fetchControllerById(controllerId: string): Promise<ControllerProfile | null> {
  if (!controllerId) return null
  try {
    const { data } = await api.get<ControllerProfile>(`/controllers/${controllerId}`)
    return data
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

export async function fetchShiftSummaries(controllerId?: string): Promise<ShiftSummary[]> {
  const params = controllerId ? { controllerId } : undefined
  const { data } = await api.get<{ summaries: ShiftSummary[] }>('/analytics/monthly', { params })
  return data.summaries
}

export async function fetchSupervisorActions(): Promise<SupervisorAction[]> {
  const { data } = await api.get<SupervisorAction[]>('/actions')
  return data
}

export async function saveSupervisorAction(action: SupervisorAction): Promise<SupervisorAction> {
  const { data } = await api.post<SupervisorAction>('/actions', {
    controllerId: action.controllerId,
    action: action.action,
    message: action.message,
  })
  return data
}

export async function fetchLiveFrame(): Promise<FatigueSnapshot[]> {
  const { data } = await api.get<{ timestamp: string; controllers: FatigueSnapshot[] }>('/dashboard/live')
  return data.controllers ?? []
}

export async function fetchSectorRosters(): Promise<SectorRoster[]> {
  const { data } = await api.get<SectorRoster[]>('/sectors')
  return data
}

export async function fetchSectorById(sectorId: string): Promise<SectorRoster | null> {
  if (!sectorId) return null
  try {
    const { data } = await api.get<SectorRoster>(`/sectors/${sectorId}`)
    return data
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

export async function fetchSectorForController(controllerId: string): Promise<SectorRoster | null> {
  if (!controllerId) return null
  try {
    const { data } = await api.get<SectorRoster>(`/controllers/${controllerId}/sector`)
    return data
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

export async function fetchSectorCatalog(): Promise<SectorSummary[]> {
  const rosters = await fetchSectorRosters()
  return rosters.map((sector) => ({
    id: sector.id,
    name: sector.name,
    shiftGroup: sector.shiftGroup,
  }))
}

export async function fetchControllersBySector(sectorId: string): Promise<ControllerProfile[]> {
  if (!sectorId) return []
  return fetchControllers(sectorId)
}

export async function fetchBackupCandidate(controllerId: string): Promise<ControllerProfile | null> {
  if (!controllerId) return null
  try {
    const { data } = await api.get<ControllerProfile>(`/controllers/${controllerId}/backup`)
    return data
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

