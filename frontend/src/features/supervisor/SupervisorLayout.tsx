import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useSessionStore } from '../../store/useSessionStore'
import PearlLogo from '@media/PearlLogo.png'

const navClasses = 'flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition'

export function SupervisorLayout() {
  const supervisor = useSessionStore((state) => state.supervisor)
  const logout = useSessionStore((state) => state.logout)

  if (!supervisor) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111b2c] via-[#1c2741] to-[#0f1828] text-slate-100">
      <div className="pearl-shell">
        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="pearl-panel p-6">
              <div className="flex items-center gap-4">
                <img src={PearlLogo} alt="PEARL Logo" className="h-12 w-auto" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Supervisor Track</p>
                  <p className="text-lg font-semibold text-slate-100">{supervisor.name}</p>
                  <p className="text-xs text-slate-400">{supervisor.id}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                <div className="rounded-2xl bg-slate-800/45 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Controllers</p>
                  <p className="text-2xl font-semibold text-slate-100">24</p>
                </div>
                <div className="rounded-2xl bg-slate-800/45 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Alerts</p>
                  <p className="text-2xl font-semibold text-pearl-primary">3</p>
                </div>
              </div>
            </div>

            <nav className="pearl-panel p-3">
              <div className="pearl-nav">
                <NavLink
                  to="/supervisor"
                  end
                  className={({ isActive }) =>
                    `${navClasses} ${isActive ? 'bg-pearl-primary/10 text-pearl-primary' : 'text-slate-300 hover:text-slate-100'}`
                  }
                >
                  <span>Live dashboard</span>
                  <span aria-hidden>→</span>
                </NavLink>
                <NavLink
                  to="/supervisor/controllers"
                  className={({ isActive }) =>
                    `${navClasses} ${isActive ? 'bg-pearl-primary/10 text-pearl-primary' : 'text-slate-300 hover:text-slate-100'}`
                  }
                >
                  <span>Controllers</span>
                  <span aria-hidden>→</span>
                </NavLink>
                <NavLink
                  to="/supervisor/analytics"
                  className={({ isActive }) =>
                    `${navClasses} ${isActive ? 'bg-pearl-primary/10 text-pearl-primary' : 'text-slate-300 hover:text-slate-100'}`
                  }
                >
                  <span>Analytics</span>
                  <span aria-hidden>→</span>
                </NavLink>
                <NavLink
                  to="/supervisor/settings"
                  className={({ isActive }) =>
                    `${navClasses} ${isActive ? 'bg-pearl-primary/10 text-pearl-primary' : 'text-slate-300 hover:text-slate-100'}`
                  }
                >
                  <span>Settings</span>
                  <span aria-hidden>→</span>
                </NavLink>
              </div>
            </nav>

            <button
              onClick={logout}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-slate-500 transition hover:border-slate-600 hover:text-slate-100"
            >
              Log out
            </button>
          </aside>

          <section className="pearl-panel min-h-[60vh] p-6">
            <Outlet />
          </section>
        </div>
        <footer className="mt-8 text-center">
          <p className="text-xs text-slate-500">Al-Dana Team LRR</p>
        </footer>
      </div>
    </div>
  )
}

