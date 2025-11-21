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
  onNotifyBackup: (controllerId: string) => void
  onDelayMonitoring: (controllerId: string) => void
  availableBackups: (sectorId: string) => ControllerProfile[]
  assignedBackups: Map<string, string>
  showDropdownForController: string | null
  selectedBackupForController: Map<string, string>
  onBackupSelection: (controllerId: string, backupId: string) => void
  onConfirmBackup: (controllerId: string) => void
  onDismissByController?: (controllerId: string) => void
}

export function FatigueNotification({ 
  notifications, 
  onDismiss, 
  onNotifyBackup, 
  onDelayMonitoring,
  availableBackups,
  assignedBackups,
  showDropdownForController,
  selectedBackupForController,
  onBackupSelection,
  onConfirmBackup,
  onDismissByController
}: FatigueNotificationProps) {
  if (notifications.length === 0) return null

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
          onNotifyBackup={onNotifyBackup}
          onDelayMonitoring={onDelayMonitoring}
          availableBackups={availableBackups}
          assignedBackups={assignedBackups}
          showDropdownForController={showDropdownForController}
          selectedBackupForController={selectedBackupForController}
          onBackupSelection={onBackupSelection}
          onConfirmBackup={onConfirmBackup}
          onDismissByController={onDismissByController}
        />
      ))}
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onDismiss: (id: string) => void
  onNotifyBackup: (controllerId: string) => void
  onDelayMonitoring: (controllerId: string) => void
  availableBackups: (sectorId: string) => ControllerProfile[]
  assignedBackups: Map<string, string>
  showDropdownForController: string | null
  selectedBackupForController: Map<string, string>
  onBackupSelection: (controllerId: string, backupId: string) => void
  onConfirmBackup: (controllerId: string) => void
  onDismissByController?: (controllerId: string) => void
}

function NotificationItem({ 
  notification, 
  onDismiss, 
  onNotifyBackup, 
  onDelayMonitoring,
  availableBackups,
  assignedBackups,
  showDropdownForController,
  selectedBackupForController,
  onBackupSelection,
  onConfirmBackup,
  onDismissByController
}: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger slide-in animation
    setIsVisible(true)
    // No auto-dismiss - notification stays until action is taken
  }, [notification.id])

  const handleActionTaken = () => {
    setIsVisible(false)
    setTimeout(() => {
      onDismiss(notification.id)
      // Also dismiss by controller ID if handler is provided
      if (onDismissByController) {
        onDismissByController(notification.controller.id)
      }
    }, 300)
  }

  const availableBackupList = availableBackups(notification.controller.sectorId)
  const isDropdownOpen = showDropdownForController === notification.controller.id
  const selectedBackupId = selectedBackupForController.get(notification.controller.id)
  const hasAssignedBackup = assignedBackups.has(notification.controller.id)

  const handleNotifyBackup = () => {
    onNotifyBackup(notification.controller.id)
  }

  const handleDelayMonitoring = () => {
    onDelayMonitoring(notification.controller.id)
    handleActionTaken()
  }

  const handleConfirmBackup = () => {
    onConfirmBackup(notification.controller.id)
    handleActionTaken()
  }

  return (
    <div
      className={`transform transition-all duration-300 ease-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="rounded-2xl border-2 border-pearl-danger/60 bg-slate-900/80 p-6 shadow-2xl ring-2 ring-pearl-danger/30">
        <div className="mb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-100 mb-1">
                {notification.controller.name} is showing high fatigue
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-mono font-semibold text-pearl-danger">
                  {notification.snapshot.score.toFixed(2)}
                </span>
                <span className="text-xs text-pearl-danger font-semibold">High Fatigue</span>
              </div>
              {notification.snapshot.recommendation && (
                <p className="mt-2 text-sm text-slate-400">{notification.snapshot.recommendation}</p>
              )}
            </div>
          </div>
        </div>

        {!hasAssignedBackup && (
          <>
            {!isDropdownOpen ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleNotifyBackup}
                  className="w-full rounded-xl bg-pearl-danger/20 px-4 py-3 text-sm font-semibold text-pearl-danger hover:bg-pearl-danger/30 transition-colors"
                >
                  Notify Backup Controller
                </button>
                <button
                  onClick={handleDelayMonitoring}
                  className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 hover:border-slate-600 hover:bg-slate-800/50 transition-colors"
                >
                  Delay and monitor 10 minutes
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={selectedBackupId || ''}
                  onChange={(e) => onBackupSelection(notification.controller.id, e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
                >
                  <option value="">Select backup controller...</option>
                  {availableBackupList.map((backup) => (
                    <option key={backup.id} value={backup.id}>
                      {backup.name}
                    </option>
                  ))}
                </select>
                {selectedBackupId && (
                  <button
                    onClick={handleConfirmBackup}
                    className="w-full rounded-xl bg-pearl-primary/20 px-4 py-3 text-sm font-semibold text-pearl-primary hover:bg-pearl-primary/30 transition-colors"
                  >
                    Confirm Backup Assignment
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {hasAssignedBackup && (
          <div className="rounded-lg border border-pearl-success/40 bg-pearl-success/10 px-4 py-3">
            <p className="text-sm text-pearl-success font-semibold">
              ✓ Backup controller already assigned
            </p>
            <button
              onClick={() => {
                if (onDismissByController) {
                  onDismissByController(notification.controller.id)
                } else {
                  handleActionTaken()
                }
              }}
              className="mt-3 w-full rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-slate-600 hover:bg-slate-800/50 transition-colors"
            >
              Acknowledge
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

