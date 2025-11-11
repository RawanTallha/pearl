import type {
  ControllerProfile,
  FatigueSnapshot,
  SectorRoster,
  SectorSummary,
  ShiftSummary,
  SupervisorAction,
  SupervisorProfile,
} from '../types'
import {
  mockControllers,
  mockSectors,
  mockSupervisor,
  mockShiftSummaries,
  mockSupervisorActions,
  simulationFrames,
} from './mockData'

const NETWORK_DELAY = 350

const byId = new Map<string, ControllerProfile>(mockControllers.map((controller) => [controller.id, controller]))
const sectorsById = new Map<string, SectorRoster>(mockSectors.map((sector) => [sector.id, sector]))

export async function authenticateController(controllerId: string): Promise<ControllerProfile | null> {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY))
  return byId.get(controllerId) ?? null
}

export async function authenticateSupervisor(
  supervisorId: string,
  password: string,
): Promise<SupervisorProfile | null> {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY))
  if (supervisorId === mockSupervisor.id && password === mockSupervisor.password) {
    return mockSupervisor
  }
  return null
}

export async function fetchControllers(): Promise<ControllerProfile[]> {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY))
  return mockControllers
}

export async function fetchControllerById(controllerId: string): Promise<ControllerProfile | null> {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY))
  return byId.get(controllerId) ?? null
}

export async function fetchShiftSummaries(controllerId?: string): Promise<ShiftSummary[]> {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY))
  if (!controllerId) return mockShiftSummaries
  return mockShiftSummaries.filter((summary) => summary.controllerId === controllerId)
}

export async function fetchSupervisorActions(): Promise<SupervisorAction[]> {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY))
  return mockSupervisorActions
}

export function getSimulationFrame(index: number): FatigueSnapshot[] {
  return simulationFrames[index % simulationFrames.length]
}

export async function fetchSectorRosters(): Promise<SectorRoster[]> {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY))
  return mockSectors
}

export async function fetchSectorById(sectorId: string): Promise<SectorRoster | null> {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY))
  return sectorsById.get(sectorId) ?? null
}

export async function fetchSectorForController(controllerId: string): Promise<SectorRoster | null> {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY))
  const controller = byId.get(controllerId)
  if (!controller) return null
  return sectorsById.get(controller.sectorId) ?? null
}

export async function fetchSectorCatalog(): Promise<SectorSummary[]> {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY))
  return mockSectors.map((sector) => ({
    id: sector.id,
    name: sector.name,
    shiftGroup: sector.shiftGroup,
  }))
}

export async function fetchControllersBySector(sectorId: string): Promise<ControllerProfile[]> {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY))
  return mockControllers.filter((controller) => controller.sectorId === sectorId)
}

export async function fetchBackupCandidate(controllerId: string): Promise<ControllerProfile | null> {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY))
  const controller = byId.get(controllerId)
  if (!controller) return null
  const sector = sectorsById.get(controller.sectorId)
  if (!sector) return null
  return sector.backup.find((candidate) => candidate.id !== controllerId) ?? null
}

