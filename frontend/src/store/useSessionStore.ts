import { create } from 'zustand'
import type { ControllerProfile, SupervisorProfile, UserRole } from '../types'

interface SessionState {
  role: UserRole | null
  controller: ControllerProfile | null
  supervisor: SupervisorProfile | null
  loginController: (controller: ControllerProfile) => void
  loginSupervisor: (supervisor: SupervisorProfile) => void
  logout: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  role: null,
  controller: null,
  supervisor: null,
  loginController: (controller) =>
    set({
      role: 'controller',
      controller,
      supervisor: null,
    }),
  loginSupervisor: (supervisor) =>
    set({
      role: 'supervisor',
      controller: null,
      supervisor,
    }),
  logout: () =>
    set({
      role: null,
      controller: null,
      supervisor: null,
    }),
}))

