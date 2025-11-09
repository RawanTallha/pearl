import type {
  ControllerProfile,
  FatigueSnapshot,
  ShiftSummary,
  SupervisorAction,
  SupervisorProfile,
} from '../types'
import {
  mockControllers,
  mockSupervisor,
  mockShiftSummaries,
  mockSupervisorActions,
  simulationFrames,
} from './mockData'

const NETWORK_DELAY = 350

const byId = new Map<string, ControllerProfile>(mockControllers.map((controller) => [controller.id, controller]))

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

