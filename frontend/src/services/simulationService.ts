import type { FatigueSnapshot } from '../types'
import { simulationFrames } from './mockData'

type Listener = (payload: FatigueSnapshot[]) => void

const listeners = new Set<Listener>()
let tick = 0
let timer: ReturnType<typeof setInterval> | null = null

function emit() {
  const frame = simulationFrames[tick % simulationFrames.length]
  listeners.forEach((listener) => listener(frame))
  tick += 1
}

function ensureTimer() {
  if (timer) return
  timer = setInterval(emit, 5000)
}

export function subscribeToSimulation(listener: Listener) {
  ensureTimer()
  listener(simulationFrames[tick % simulationFrames.length])
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
      tick = 0
    }
  }
}

