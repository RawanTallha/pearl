import { io, Socket } from 'socket.io-client'
import type { FatigueSnapshot } from '../types'

type Listener = (payload: FatigueSnapshot[]) => void

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

const listeners = new Set<Listener>()
let socket: Socket | null = null
let latestFrame: FatigueSnapshot[] = []
let initialFetch: Promise<void> | null = null

function handleIncomingFrame(frame: FatigueSnapshot[]) {
  latestFrame = frame
  listeners.forEach((listener) => listener(frame))
}

function ensureSocket() {
  if (socket) return socket
  socket = io(API_BASE_URL, {
    transports: ['websocket'],
    autoConnect: true,
  })
  socket.on('fatigue:init', handleIncomingFrame)
  socket.on('fatigue:update', handleIncomingFrame)
  socket.on('disconnect', () => {
    latestFrame = []
  })
  return socket
}

async function ensureInitialFrame() {
  if (!initialFetch) {
    initialFetch = fetch(`${API_BASE_URL}/dashboard/live`)
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload?.controllers)) {
          latestFrame = payload.controllers
        }
      })
      .catch((error) => {
        console.error('Failed to fetch initial live frame', error)
      })
  }
  return initialFetch
}

export function subscribeToSimulation(listener: Listener) {
  listeners.add(listener)
  ensureSocket()
  ensureInitialFrame()
    .then(() => {
      if (latestFrame.length > 0) {
        listener(latestFrame)
      }
    })
    .catch(() => undefined)

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && socket) {
      socket.off('fatigue:init', handleIncomingFrame)
      socket.off('fatigue:update', handleIncomingFrame)
      socket.disconnect()
      socket = null
      latestFrame = []
      initialFetch = null
    }
  }
}

