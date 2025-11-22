import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useSessionStore } from '../../store/useSessionStore'
import PearlLogo from '@media/PearlLogo.png'

const navLinkStyles = 'flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition'

export function ControllerLayout() {
  const controller = useSessionStore((state) => state.controller)
  const logout = useSessionStore((state) => state.logout)
  if (!controller) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111b2c] via-[#1b2540] to-[#0f1828] text-slate-100">
      <div className="pearl-shell">
        <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="pearl-panel p-6">
              <div className="flex items-center gap-4">
                <img src={PearlLogo} alt="PEARL Logo" className="h-14 w-auto" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Controller Track</p>
                  <p className="text-lg font-semibold text-slate-100">{controller.name}</p>
                  <p className="text-xs text-slate-400">{controller.id}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-800/45 px-4 py-3 text-sm text-slate-300">
                <p className="font-medium text-slate-100">Sector · {controller.sectorName}</p>
                <p>Shift group · {controller.shiftGroup}</p>
              </div>
            </div>

            <nav className="pearl-panel p-3">
              <div className="pearl-nav">
                <NavLink
                  to="/controller/pre-shift"
                  className={({ isActive }) =>
                    `${navLinkStyles} ${isActive ? 'bg-pearl-primary/10 text-pearl-primary' : 'text-slate-300 hover:text-slate-100'}`
                  }
                >
                  <span>Pre-shift readiness</span>
                  <span aria-hidden>→</span>
                </NavLink>
                <NavLink
                  to="/controller"
                  end
                  className={({ isActive }) =>
                    `${navLinkStyles} ${isActive ? 'bg-pearl-primary/10 text-pearl-primary' : 'text-slate-300 hover:text-slate-100'}`
                  }
                >
                  <span>Dashboard</span>
                  <span aria-hidden>→</span>
                </NavLink>
                <NavLink
                  to="/controller/post-shift"
                  className={({ isActive }) =>
                    `${navLinkStyles} ${isActive ? 'bg-pearl-primary/10 text-pearl-primary' : 'text-slate-300 hover:text-slate-100'}`
                  }
                >
                  <span>Post-shift review</span>
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

