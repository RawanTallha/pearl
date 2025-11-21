import { useSessionStore } from '../../store/useSessionStore'

const settingsMatrix = [
  { option: 'Camera / Mic Permissions', description: 'Toggle access and re-calibrate local capture devices.', access: 'Controller + Supervisor' },
  { option: 'Threshold Adjustment', description: 'Align fatigue sensitivity (blink count, delay threshold).', access: 'Supervisor only' },
  { option: 'Data Export', description: 'Export numerical reports in CSV or PDF format.', access: 'Supervisor only' },
  { option: 'Language & UI', description: 'Switch between English and Arabic interface.', access: 'Both roles' },
  { option: 'System Mode', description: 'Toggle Simulation or Real-time operation.', access: 'Supervisor' },
  { option: 'Security Policy', description: 'View privacy terms and data handling processes.', access: 'Both roles' },
]

export function SettingsView() {
  const role = useSessionStore((state) => state.role)

  return (
    <div className="space-y-8">
      <header className="rounded-2xl bg-slate-900/70 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">PEARL settings overview</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-100">Fine-tune the fatigue engine with controlled access</h2>
        <p className="mt-2 text-sm text-slate-500">
          Permissions adapt to the selected track. Controllers keep autonomy over capture devices, while supervisors
          manage thresholds and reporting.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80">
        <div className="border-b border-slate-700 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-500">Shared module access matrix</h3>
          <p className="text-sm text-slate-500">Role-based controls ensure privacy and operational clarity.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/70 text-slate-500">
              <tr>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Option</th>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-500">
              {settingsMatrix.map((item) => (
                <tr key={item.option} className="hover:bg-slate-900/50">
                  <td className="px-6 py-4 font-semibold text-slate-100">{item.option}</td>
                  <td className="px-6 py-4 text-slate-500">{item.description}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{item.access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 text-sm text-slate-500">
        <h3 className="text-lg font-semibold text-slate-500">Calibration</h3>
        <p className="mt-2">
          {role === 'supervisor'
            ? 'Adjust fatigue weights directly in the calibration panel below. Prototype controls are locked, but this card demonstrates where the sliders and password confirmations would live.'
            : 'Calibration sliders unlock for supervisors. Controllers can request adjustments through supervisor chat for collaborative tuning.'}
        </p>
        <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/55 p-5">
          <p className="text-slate-500">
            {role === 'supervisor'
              ? '🔒 Sensitive change — confirm password to alter blink/yawn thresholds.'
              : 'ℹ️ View-only mode — awaiting supervisor confirmation.'}
          </p>
        </div>
      </section>
    </div>
  )
}

