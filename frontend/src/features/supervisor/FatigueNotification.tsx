import { useEffect, useState } from 'react'
import type { ControllerProfile, FatigueSnapshot } from '../../types'

interface Notification {
  id: string
  controller: ControllerProfile
  snapshot: FatigueSnapshot
}

interface FatigueNotificationProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
}

export function FatigueNotification({ notifications, onDismiss }: FatigueNotificationProps) {
  if (notifications.length === 0) return null

  return (
    <div className="fixed right-6 top-6 z-50 space-y-3">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onDismiss: (id: string) => void
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger slide-in animation
    setIsVisible(true)

    // Auto-dismiss after 8 seconds
    const timer = setTimeout(() => {
      setIsVisible(false)
      // Wait for animation to complete before removing
      setTimeout(() => onDismiss(notification.id), 300)
    }, 8000)

    return () => clearTimeout(timer)
  }, [notification.id, onDismiss])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss(notification.id), 300)
  }

  return (
    <div
      className={`transform transition-all duration-300 ease-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="w-80 rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-100">
                {notification.controller.name} is showing high fatigue
              </span>
            </div>
            <div className="mb-2">
              <span className="text-2xl font-mono font-semibold text-pearl-danger">
                {notification.snapshot.score.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-400">Immediate attention recommended.</p>
          </div>
          <button
            onClick={handleClose}
            className="ml-3 flex-shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
            aria-label="Close notification"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="mt-3 rounded-lg border border-pearl-danger/40 bg-pearl-danger/10 px-3 py-2">
          <p className="text-xs text-pearl-danger">
            Status: <span className="font-semibold">High Fatigue</span>
          </p>
        </div>
      </div>
    </div>
  )
}

