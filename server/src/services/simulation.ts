import type { FatigueSnapshot } from '../types.js'
import { generateLiveSnapshotFrames } from '../db/index.js'

let frames: FatigueSnapshot[][] = []
let index = 0

function ensureFrames() {
  if (frames.length === 0) {
    frames = generateLiveSnapshotFrames()
  }
}

export function refreshSimulationFrames() {
  frames = generateLiveSnapshotFrames()
  index = 0
}

export function getCurrentFrame(): FatigueSnapshot[] {
  ensureFrames()
  if (frames.length === 0) return []
  return frames[index % frames.length] ?? []
}

export function advanceFrame(): FatigueSnapshot[] {
  ensureFrames()
  if (frames.length === 0) return []
  index = (index + 1) % frames.length
  return getCurrentFrame()
}

export function resetSimulation() {
  refreshSimulationFrames()
}

