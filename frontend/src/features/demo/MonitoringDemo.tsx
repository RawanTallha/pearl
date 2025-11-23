import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchControllers } from '../../services/dataService'
import type { ControllerProfile } from '../../types'
import PearlLogo from '@media/PearlLogo.png'

export function MonitoringDemo() {
  const navigate = useNavigate()
  
  const { data: controllers, isLoading } = useQuery({
    queryKey: ['controllers'],
    queryFn: () => fetchControllers(),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading controllers...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111b2c] via-[#1b2540] to-[#0f1828] text-slate-100">
      <div className="pearl-shell">
        <div className="space-y-8">
          {/* Header */}
          <header className="flex items-center justify-between rounded-2xl bg-slate-900/70 p-6 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-4">
              <img src={PearlLogo} alt="PEARL" className="h-12 w-auto" />
              <div>
                <h1 className="text-2xl font-semibold text-slate-100">Monitoring & Analysis Demo</h1>
                <p className="text-sm text-slate-500">Technical showcase for mentors and programmers</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-pearl-primary hover:text-pearl-primary transition-all"
            >
              Back to Landing
            </button>
          </header>

          {/* Controllers List */}
          <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-500">Select Controller to Monitor</h2>
              <p className="text-sm text-slate-500">
                Each controller has their own monitoring page with 4 camera feeds, YOLO detection, and voice analysis
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {controllers && controllers.length > 0 ? (
                controllers.map((controller) => (
                  <ControllerCard key={controller.id} controller={controller} onSelect={() => navigate(`/demo/controller/${controller.id}`)} />
                ))
              ) : (
                <div className="col-span-full rounded-2xl border border-slate-700 bg-slate-900/55 p-8 text-center">
                  <p className="text-slate-500">No controllers found</p>
                </div>
              )}
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-8 text-center">
            <p className="text-xs text-slate-500">Al-Dana Team LRR</p>
          </footer>
        </div>
      </div>
    </div>
  )
}

function ControllerCard({ controller, onSelect }: { controller: ControllerProfile; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="group rounded-2xl border border-slate-700 bg-slate-900/55 p-6 text-left transition-all hover:border-pearl-primary hover:bg-slate-900/80 hover:shadow-lg hover:shadow-pearl-primary/20"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 group-hover:text-pearl-primary transition-colors">
            {controller.name}
          </h3>
          <p className="text-xs text-slate-500">{controller.id}</p>
        </div>
        <div className="rounded-full bg-pearl-primary/20 px-3 py-1 text-xs font-semibold text-pearl-primary">
          View →
        </div>
      </div>
      <div className="space-y-2 text-sm text-slate-400">
        <div className="flex justify-between">
          <span>Sector:</span>
          <span className="text-slate-300">{controller.sectorName}</span>
        </div>
        <div className="flex justify-between">
          <span>Experience:</span>
          <span className="text-slate-300">{controller.experienceYears} years</span>
        </div>
        <div className="flex justify-between">
          <span>Shift Group:</span>
          <span className="text-slate-300">{controller.shiftGroup}</span>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/55 p-3 text-xs text-slate-500">
        <p className="font-semibold text-slate-400 mb-1">Monitoring Features:</p>
        <ul className="space-y-1">
          <li>• 4 Camera feeds with YOLO detection</li>
          <li>• Voice analysis model</li>
          <li>• Real-time fatigue metrics</li>
        </ul>
      </div>
    </button>
  )
}
