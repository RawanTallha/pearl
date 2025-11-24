import type { ControllerProfile, ShiftSummary, SupervisorAction, FatigueSnapshot } from '../../types'

interface ExportData {
  date: string
  controllerName: string
  controllerId: string
  fatiguePeak: number
  postShiftDelta: number
  preShiftReadiness: number
  notes?: string
}

export function exportToCSV(
  summaries: ShiftSummary[],
  controllers: ControllerProfile[],
  selectedControllerIds: string[],
  timeRange: { from: Date; to: Date },
): void {
  const controllerMap = new Map(controllers.map((c) => [c.id, c]))

  const exportData: ExportData[] = summaries
    .filter((summary) => {
      const summaryDate = new Date(summary.shiftDate)
      return (
        summaryDate >= timeRange.from &&
        summaryDate <= timeRange.to &&
        (selectedControllerIds.length === 0 || selectedControllerIds.includes(summary.controllerId))
      )
    })
    .map((summary) => {
      const controller = controllerMap.get(summary.controllerId)
      return {
        date: summary.shiftDate,
        controllerName: controller?.name ?? summary.controllerId,
        controllerId: summary.controllerId,
        fatiguePeak: Number((summary.peakFatigue * 100).toFixed(1)),
        postShiftDelta: Number((summary.postShiftDelta * 100).toFixed(1)),
        preShiftReadiness: Number((summary.preShiftReadiness * 100).toFixed(1)),
        notes: summary.notes ?? '',
      }
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.controllerName.localeCompare(b.controllerName)
    })

  const headers = ['Date', 'Controller Name', 'Controller ID', 'Fatigue Peak %', 'Post Shift Delta %', 'Pre Shift Readiness %', 'Notes']
  const csvRows = [
    headers.join(','),
    ...exportData.map((row) =>
      [
        row.date,
        `"${row.controllerName}"`,
        row.controllerId,
        row.fatiguePeak,
        row.postShiftDelta,
        row.preShiftReadiness,
        `"${row.notes}"`,
      ].join(','),
    ),
  ]

  const csvContent = csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `per-employee-fatigue-analytics-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToPDF(
  summaries: ShiftSummary[],
  controllers: ControllerProfile[],
  selectedControllerIds: string[],
  timeRange: { from: Date; to: Date },
): void {
  const controllerMap = new Map(controllers.map((c) => [c.id, c]))

  const exportData: ExportData[] = summaries
    .filter((summary) => {
      const summaryDate = new Date(summary.shiftDate)
      return (
        summaryDate >= timeRange.from &&
        summaryDate <= timeRange.to &&
        (selectedControllerIds.length === 0 || selectedControllerIds.includes(summary.controllerId))
      )
    })
    .map((summary) => {
      const controller = controllerMap.get(summary.controllerId)
      return {
        date: summary.shiftDate,
        controllerName: controller?.name ?? summary.controllerId,
        controllerId: summary.controllerId,
        fatiguePeak: Number((summary.peakFatigue * 100).toFixed(1)),
        postShiftDelta: Number((summary.postShiftDelta * 100).toFixed(1)),
        preShiftReadiness: Number((summary.preShiftReadiness * 100).toFixed(1)),
        notes: summary.notes ?? '',
      }
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.controllerName.localeCompare(b.controllerName)
    })

  const selectedControllerNames =
    selectedControllerIds.length === 0
      ? 'All controllers'
      : selectedControllerIds.map((id) => controllerMap.get(id)?.name ?? id).join(', ')

  // Create HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Per-Employee Fatigue Analytics</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #1e293b;
            background: white;
          }
          h1 {
            color: #0f172a;
            border-bottom: 2px solid #1e293b;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .meta {
            margin-bottom: 20px;
            padding: 10px;
            background: #f1f5f9;
            border-radius: 8px;
          }
          .meta p {
            margin: 5px 0;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 8px 12px;
            text-align: left;
            font-size: 12px;
          }
          th {
            background: #1e293b;
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background: #f8fafc;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #cbd5e1;
            font-size: 11px;
            color: #64748b;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h1>Per-Employee Fatigue Analytics</h1>
        <div class="meta">
          <p><strong>Date Range:</strong> ${timeRange.from.toLocaleDateString()} to ${timeRange.to.toLocaleDateString()}</p>
          <p><strong>Selected Controllers:</strong> ${selectedControllerNames}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Controller Name</th>
              <th>Controller ID</th>
              <th>Fatigue Peak %</th>
              <th>Post Shift Delta %</th>
              <th>Pre Shift Readiness %</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${exportData
              .map(
                (row) => `
              <tr>
                <td>${row.date}</td>
                <td>${row.controllerName}</td>
                <td>${row.controllerId}</td>
                <td>${row.fatiguePeak}</td>
                <td>${row.postShiftDelta}</td>
                <td>${row.preShiftReadiness}</td>
                <td>${row.notes || '-'}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Report generated by Pearl Fatigue Management System</p>
        </div>
      </body>
    </html>
  `

  // Open print dialog for PDF
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }
}

interface SupervisorActionExportData {
  timestamp: string
  fatiguedController: string
  assignedBackup: string
  assignedPlanner: string
  fatigueScore: string
  notes: string
}

// Parse action message to extract backup controller info
function parseActionMessage(message: string): { fatiguedController: string; backupController: string; plannerName: string | null } | null {
  // Try new format first: "Backup assigned for Controller: Name (ID) — Backup: Name (ID)"
  let backupMatch = message.match(/Backup assigned for Controller: (.+?) \(([^)]+)\) — Backup: (.+?) \(([^)]+)\)/)
  if (backupMatch) {
    return {
      fatiguedController: `${backupMatch[1]} (${backupMatch[2]})`,
      backupController: `${backupMatch[3]} (${backupMatch[4]})`,
      plannerName: null,
    }
  }
  
  // Try old format: "Backup assigned for Controller: Name (Backup: Name)"
  backupMatch = message.match(/Backup assigned for Controller: (.+?) \(Backup: (.+?)\)/)
  if (backupMatch) {
    return {
      fatiguedController: backupMatch[1],
      backupController: backupMatch[2],
      plannerName: null,
    }
  }
  
  // Try delay format with backup: "Monitoring delayed 10 minutes for Controller: Name (ID) — Backup: Name (ID)"
  backupMatch = message.match(/Monitoring delayed 10 minutes for Controller: (.+?) \(([^)]+)\) — Backup: (.+?) \(([^)]+)\)/)
  if (backupMatch) {
    return {
      fatiguedController: `${backupMatch[1]} (${backupMatch[2]})`,
      backupController: `${backupMatch[3]} (${backupMatch[4]})`,
      plannerName: null,
    }
  }
  
  // Try planner format with ID: "Planner assigned for Controller: Name (ID) — Planner: PlannerName (PlannerID)"
  // Match both em dash (—) and regular dash (-) for compatibility
  // Use non-greedy matching and ensure we capture the full planner name and ID
  let plannerMatch = message.match(/Planner assigned for Controller: (.+?) \(([^)]+)\)\s*[—\-]\s*Planner:\s*(.+?)\s*\(([^)]+)\)/)
  if (plannerMatch && plannerMatch[3] && plannerMatch[4]) {
    return {
      fatiguedController: `${plannerMatch[1]} (${plannerMatch[2]})`,
      backupController: '-',
      plannerName: `${plannerMatch[3].trim()} (${plannerMatch[4]})`, // Include ID in plannerName for consistent format
    }
  }
  
  // Try planner format without ID (legacy): "Planner assigned for Controller: Name (ID) — Planner: PlannerName"
  plannerMatch = message.match(/Planner assigned for Controller: (.+?) \(([^)]+)\) [—\-] Planner: (.+?)(?:\s|$)/)
  if (plannerMatch) {
    return {
      fatiguedController: `${plannerMatch[1]} (${plannerMatch[2]})`,
      backupController: '-',
      plannerName: plannerMatch[3].trim(), // Trim to remove any trailing whitespace
    }
  }
  
  return null
}

export function exportSupervisorActionsToCSV(
  actions: SupervisorAction[],
  controllers: ControllerProfile[],
  frames: FatigueSnapshot[],
): void {
  if (!actions.length || !controllers.length) return

  const controllerMap = new Map(controllers.map((c) => [c.id, c]))
  const frameMap = new Map(frames.map((f) => [f.controllerId, f]))

  const controllerNameMap = new Map(controllers.map((c) => [c.name, c]))

  const exportData: SupervisorActionExportData[] = actions.map((action) => {
    const parsed = parseActionMessage(action.message)
    const controller = controllerMap.get(action.controllerId)
    
    let fatiguedController: string
    let assignedBackup: string
    let assignedPlanner: string = '-'
    
    if (parsed) {
      // Message contains backup or planner info
      fatiguedController = parsed.fatiguedController
      assignedBackup = parsed.backupController !== '-' ? parsed.backupController : '-'
      
      // Handle planner
      if (parsed.plannerName) {
        const plannerName = parsed.plannerName.trim()
        if (plannerName.includes('(') && plannerName.includes(')')) {
          assignedPlanner = plannerName
        } else {
          const plannerController = controllerNameMap.get(plannerName) || 
            controllers.find(c => c.name.toLowerCase() === plannerName.toLowerCase())
          assignedPlanner = plannerController 
            ? `${plannerController.name} (${plannerController.id})`
            : plannerName
        }
      }
    } else {
      // No backup/planner info in message, extract from controller data
      fatiguedController = controller
        ? `${controller.name} (${controller.id})`
        : action.controllerId
      
      // Check if it's a delay action without backup info
      if (action.message.includes('Monitoring delayed')) {
        assignedBackup = '-'
      } else {
        assignedBackup = '-'
      }
    }
    
    // Try to find fatigue score from frames
    const snapshot = frameMap.get(action.controllerId)
    const fatigueScore = snapshot ? snapshot.score.toFixed(2) : 'N/A'
    
    return {
      timestamp: new Date(action.createdAt).toISOString(),
      fatiguedController,
      assignedBackup,
      assignedPlanner,
      fatigueScore,
      notes: action.message,
    }
  })

  const headers = ['Timestamp', 'Fatigued Controller (Name + ID)', 'Assigned Backup (Name + ID)', 'Fatigue Score', 'Notes']
  const csvRows = [
    headers.join(','),
    ...exportData.map((row) =>
      [
        row.timestamp,
        `"${row.fatiguedController}"`,
        `"${row.assignedBackup}"`,
        row.fatigueScore,
        `"${row.notes}"`,
      ].join(','),
    ),
  ]

  const csvContent = csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `supervisor-actions-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportSupervisorActionsToPDF(
  actions: SupervisorAction[],
  controllers: ControllerProfile[],
): void {
  if (!actions.length || !controllers.length) return

  const controllerMap = new Map(controllers.map((c) => [c.id, c]))
  // Create a name-to-controller map for lookup when only name is available
  const controllerNameMap = new Map(controllers.map((c) => [c.name, c]))

  const exportData: SupervisorActionExportData[] = actions.map((action) => {
    const parsed = parseActionMessage(action.message)
    const controller = controllerMap.get(action.controllerId)
    
    let fatiguedController: string
    let assignedBackup: string = '-'
    let assignedPlanner: string = '-'
    
    if (parsed) {
      // Message contains backup or planner info
      fatiguedController = parsed.fatiguedController
      
      // Ensure backup shows name and ID format
      if (parsed.backupController && parsed.backupController !== '-') {
        // If backup already has ID format (contains parentheses), use it as is
        if (parsed.backupController.includes('(') && parsed.backupController.includes(')')) {
          assignedBackup = parsed.backupController
        } else {
          // Backup name only - need to look up the ID
          const backupController = controllerNameMap.get(parsed.backupController.trim())
          if (backupController) {
            assignedBackup = `${backupController.name} (${backupController.id})`
          } else {
            // If lookup fails, try to find by partial name match
            const foundController = controllers.find(c => 
              c.name.toLowerCase() === parsed.backupController.toLowerCase().trim()
            )
            assignedBackup = foundController 
              ? `${foundController.name} (${foundController.id})`
              : parsed.backupController // Fallback to original if not found
          }
        }
      } else {
        assignedBackup = '-'
      }
      
      // Ensure planner shows name and ID format
      if (parsed.plannerName) {
        const plannerName = parsed.plannerName.trim()
        
        // Check if plannerName already includes ID format (from new message format)
        // Format: "Name (ID)" or just "Name"
        if (plannerName.includes('(') && plannerName.includes(')')) {
          // Already has ID format, use it directly
          assignedPlanner = plannerName
        } else {
          // Planner name only - need to look up the ID
          // IMPORTANT: Always prioritize rosterRole === 'Planners' check first
          let plannerController = controllers.find(c => 
            c.name === plannerName && (c.rosterRole as string) === 'Planners'
          )
          
          // If not found with exact match, try case-insensitive with rosterRole check
          if (!plannerController) {
            plannerController = controllers.find(c => 
              c.name.toLowerCase() === plannerName.toLowerCase() && (c.rosterRole as string) === 'Planners'
            )
          }
          
          // If still not found, try the name map (but this should not be needed if planners are in the list)
          if (!plannerController) {
            const mappedController = controllerNameMap.get(plannerName)
            if (mappedController && (mappedController.rosterRole as string) === 'Planners') {
              plannerController = mappedController
            }
          }
          
          // Last resort: try without rosterRole check (should rarely happen)
          if (!plannerController) {
            plannerController = controllers.find(c => 
              c.name.toLowerCase() === plannerName.toLowerCase()
            )
          }
          
          // Format as "Name (ID)" or fallback to name only if not found
          if (plannerController) {
            assignedPlanner = `${plannerController.name} (${plannerController.id})`
          } else {
            // Last resort: if we can't find the planner, just use the name
            // DO NOT use a broader search as it might match the wrong controller
            assignedPlanner = plannerName
          }
        }
      } else {
        assignedPlanner = '-'
      }
      
      // Final check: ensure assignedPlanner is ALWAYS in "Name (ID)" format if it's not already
      if (assignedPlanner !== '-' && !assignedPlanner.includes('(')) {
        // Try one more lookup - ONLY with rosterRole === 'Planners' to avoid wrong matches
        const finalLookup = controllers.find(c => 
          c.name === assignedPlanner && (c.rosterRole as string) === 'Planners'
        ) || controllers.find(c => 
          c.name.toLowerCase() === assignedPlanner.toLowerCase() && (c.rosterRole as string) === 'Planners'
        )
        // If found, format it properly
        if (finalLookup) {
          assignedPlanner = `${finalLookup.name} (${finalLookup.id})`
        } else {
          // If still not found, log a warning but keep the name (don't match wrong controller)
          console.warn(`Could not find planner ID for: ${assignedPlanner}. Available planners:`, 
            controllers.filter(c => (c.rosterRole as string) === 'Planners').map(c => c.name))
        }
      }
    } else {
      // No backup/planner info in message, extract from controller data
      fatiguedController = controller
        ? `${controller.name} (${controller.id})`
        : action.controllerId
      
      // Try to extract backup info from message even if parsing failed
      // Look for backup mentions in various formats
      let backupFound = false
      const backupPatterns = [
        /Backup: (.+?) \(([^)]+)\)/,
        /Backup: (.+?)(?:\s|$)/,
        /backup: (.+?) \(([^)]+)\)/i,
        /backup: (.+?)(?:\s|$)/i,
      ]
      
      for (const pattern of backupPatterns) {
        const match = action.message.match(pattern)
        if (match) {
          if (match[2]) {
            // Has ID
            assignedBackup = `${match[1].trim()} (${match[2]})`
          } else {
            // Name only, look up ID
            const backupController = controllerNameMap.get(match[1].trim())
            assignedBackup = backupController 
              ? `${backupController.name} (${backupController.id})`
              : match[1].trim()
          }
          backupFound = true
          break
        }
      }
      
      if (!backupFound) {
        // Check if it's a delay action without backup info
        if (action.message.includes('Monitoring delayed')) {
          assignedBackup = '-'
        } else {
          assignedBackup = '-'
        }
      }
      
      // Try to extract planner info from message even if parsing failed
      let plannerFound = false
      const plannerPatterns = [
        /Planner: (.+?) \(([^)]+)\)/,
        /Planner: (.+?)(?:\s|$)/,
        /planner: (.+?) \(([^)]+)\)/i,
        /planner: (.+?)(?:\s|$)/i,
      ]
      
      for (const pattern of plannerPatterns) {
        const match = action.message.match(pattern)
        if (match) {
          const plannerName = match[1].trim()
          if (match[2]) {
            // Has ID
            assignedPlanner = `${plannerName} (${match[2]})`
          } else {
            // Name only, look up ID
            // IMPORTANT: Always prioritize rosterRole === 'Planners' check first
            let plannerController = controllers.find(c => 
              c.name === plannerName && (c.rosterRole as string) === 'Planners'
            )
            
            // If not found with exact match, try case-insensitive with rosterRole check
            if (!plannerController) {
              plannerController = controllers.find(c => 
                c.name.toLowerCase() === plannerName.toLowerCase() && (c.rosterRole as string) === 'Planners'
              )
            }
            
            // If still not found, try the name map (but this should not be needed if planners are in the list)
            if (!plannerController) {
              const mappedController = controllerNameMap.get(plannerName)
              if (mappedController && (mappedController.rosterRole as string) === 'Planners') {
                plannerController = mappedController
              }
            }
            
            // Last resort: try without rosterRole check (should rarely happen)
            if (!plannerController) {
              plannerController = controllers.find(c => 
                c.name.toLowerCase() === plannerName.toLowerCase()
              )
            }
            
            assignedPlanner = plannerController 
              ? `${plannerController.name} (${plannerController.id})`
              : plannerName
          }
          plannerFound = true
          break
        }
      }
      
      if (!plannerFound) {
        assignedPlanner = '-'
      }
    }
    
    // Clean notes - remove backup/planner details since they're in separate columns
    let cleanNotes = action.message
    if (parsed && (parsed.backupController !== '-' || parsed.plannerName)) {
      // Remove backup/planner assignment details from notes since they're in separate columns
      if (parsed.backupController !== '-') {
        cleanNotes = cleanNotes.replace(/Backup assigned for Controller: .+? [—\-] Backup: .+?/g, 'Backup assigned')
        cleanNotes = cleanNotes.replace(/Monitoring delayed 10 minutes for Controller: .+? [—\-] Backup: .+?/g, 'Monitoring delayed 10 minutes')
      }
      if (parsed.plannerName) {
        cleanNotes = cleanNotes.replace(/Planner assigned for Controller: .+? [—\-] Planner: .+?/g, 'Planner assigned')
      }
    }
    
    return {
      timestamp: new Date(action.createdAt).toISOString(),
      fatiguedController,
      assignedBackup,
      assignedPlanner,
      fatigueScore: 'N/A', // PDF doesn't need fatigue score from frames
      notes: cleanNotes,
    }
  })

  // Create HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Supervisor Actions Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #1e293b;
            background: white;
          }
          h1 {
            color: #0f172a;
            border-bottom: 2px solid #1e293b;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .meta {
            margin-bottom: 20px;
            padding: 10px;
            background: #f1f5f9;
            border-radius: 8px;
          }
          .meta p {
            margin: 5px 0;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 8px 12px;
            text-align: left;
            font-size: 12px;
          }
          th {
            background: #1e293b;
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background: #f8fafc;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #cbd5e1;
            font-size: 11px;
            color: #64748b;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h1>Supervisor Actions Report</h1>
        <div class="meta">
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Actions:</strong> ${actions.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Fatigued Controller</th>
              <th>Assigned Backup</th>
              <th>Planners Assigned</th>
              <th>Action Description</th>
            </tr>
          </thead>
          <tbody>
            ${exportData
              .map(
                (row) => `
              <tr>
                <td>${new Date(row.timestamp).toLocaleString()}</td>
                <td>${row.fatiguedController}</td>
                <td>${row.assignedBackup}</td>
                <td>${row.assignedPlanner}</td>
                <td>${row.notes}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Report generated by Pearl Fatigue Management System</p>
        </div>
      </body>
    </html>
  `

  // Open print dialog for PDF
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }
}


