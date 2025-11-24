import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticateController, authenticateSupervisor } from '../../services/dataService'
import { useSessionStore } from '../../store/useSessionStore'
import PearlLogo from '@media/PearlLogo.png'

type RoleOption = 'controller' | 'supervisor'

export function Landing() {
  const navigate = useNavigate()
  const loginController = useSessionStore((state) => state.loginController)
  const loginSupervisor = useSessionStore((state) => state.loginSupervisor)

  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null)
  const [controllerId, setControllerId] = useState('')
  const [controllerPassword, setControllerPassword] = useState('')
  const [showControllerPassword, setShowControllerPassword] = useState(false)
  const [supervisorId, setSupervisorId] = useState('')
  const [supervisorPassword, setSupervisorPassword] = useState('')
  const [showSupervisorPassword, setShowSupervisorPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRoleChange = (role: RoleOption) => {
    setSelectedRole(role)
    setError(null)
  }

  const handleControllerLogin = async (event: FormEvent) => {
    event.preventDefault()
    if (!controllerId.trim() || !controllerPassword.trim()) {
      setError('Please enter your Controller ID and password.')
      return
    }
    setIsSubmitting(true)
    const profile = await authenticateController(controllerId.trim(), controllerPassword.trim())
    setIsSubmitting(false)
    if (!profile) {
      setError('Controller credentials are invalid.')
      return
    }
    loginController(profile)
    navigate('/controller/pre-shift', { replace: true })
  }

  const handleSupervisorLogin = async (event: FormEvent) => {
    event.preventDefault()
    if (!supervisorId.trim() || !supervisorPassword.trim()) {
      setError('Enter Supervisor ID and password to continue.')
      return
    }
    setIsSubmitting(true)
    const supervisor = await authenticateSupervisor(supervisorId.trim(), supervisorPassword.trim())
    setIsSubmitting(false)
    if (!supervisor) {
      setError('Supervisor credentials are invalid.')
      return
    }
    loginSupervisor(supervisor)
    navigate('/supervisor', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#111b2c] via-[#1b2540] to-[#0f1828] text-slate-100">
      <div className="pearl-shell">
        <div className="grid gap-10 lg:grid-cols-[minmax(420px,1.3fr)_minmax(0,2.4fr)] xl:grid-cols-[minmax(480px,1.4fr)_minmax(0,2.8fr)] 2xl:grid-cols-[minmax(520px,1.5fr)_minmax(0,3fr)] xl:gap-16 2xl:gap-24 items-start">
          <section className="space-y-9 w-full">
            <div className="pearl-panel p-8">
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
                <img src={PearlLogo} alt="PEARL" className="h-20 w-auto" />
                PEARL System
              </div>
              <h1 className="mt-6 text-3xl font-semibold text-slate-100 xl:text-4xl">
              Proactive Early Awareness & Readiness Layer
              </h1>

            </div>

            <div className="grid w-full gap-5 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {[
                { title: 'Guided routines', helper: 'Simple steps.' },
                { title: 'Live awareness', helper: 'Critical signals only.' },
                { title: 'Private data loop', helper: 'Private data.' },
                { title: 'One-tap exports', helper: 'Instant exports.' },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-600 bg-slate-900/60 p-5 shadow-[0_16px_36px_rgba(5,7,16,0.35)]"
                >
                  <p className="text-sm font-semibold text-slate-50">{card.title}</p>
                  <p className="mt-1 text-xs text-slate-300">{card.helper}</p>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <a
                href="/demo"
                className="inline-block rounded-xl border border-slate-400 bg-transparent px-4 py-2 text-sm font-semibold text-pearl-primary transition hover:bg-pearl-primary/10"
              >
                View Monitoring Demo (For Mentors)
              </a>
            </div>
          </section>

          <section className="pearl-panel space-y-9 p-6 lg:p-12 w-full">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Sign in</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-100 lg:text-[26px]">Welcome to PEARL</h2>
              <p className="mt-2 text-sm text-slate-300">Choose your role to continue</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(['controller', 'supervisor'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleChange(role)}
                  className={`rounded-2xl border px-4 py-5 text-left transition ${
                    selectedRole === role
                      ? 'border-pearl-primary bg-pearl-primary/10 shadow-md shadow-pearl-primary/20'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <p className="text-base font-semibold text-slate-100">
                    {role === 'controller' ? 'Controller workspace' : 'Supervisor workspace'}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    {role === 'controller'
                      ? 'Monitor and review.'
                      : 'Monitor and export.'}
                  </p>
                </button>
              ))}
            </div>

            {error ? (
              <p className="rounded-2xl border border-red-500/50 bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</p>
            ) : null}

            {selectedRole === 'controller' ? (
              <form onSubmit={handleControllerLogin} className="space-y-4">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-slate-300">Controller ID</span>
                  <input
                    value={controllerId}
                    onChange={(event) => setControllerId(event.target.value)}
                    placeholder="e.g., C_Lama_001"
                    className="rounded-2xl border border-slate-600 bg-slate-900/55 px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-slate-300">Password</span>
                  <div className="relative">
                    <input
                      type={showControllerPassword ? 'text' : 'password'}
                      value={controllerPassword}
                      onChange={(event) => setControllerPassword(event.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-slate-600 bg-slate-900/55 px-4 py-3 pr-12 text-slate-100 placeholder:text-slate-400 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowControllerPassword(!showControllerPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                      aria-label={showControllerPassword ? 'Hide password' : 'Show password'}
                    >
                      {showControllerPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-green-500 px-4 py-3 font-semibold text-white shadow-lg shadow-green-500/30 transition hover:bg-green-600 hover:shadow-green-500/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:bg-slate-900/60 disabled:text-slate-500 disabled:shadow-none"
                >
                  {isSubmitting ? 'Processing…' : 'Enter controller portal'}
                </button>
              </form>
            ) : null}

            {selectedRole === 'supervisor' ? (
              <form onSubmit={handleSupervisorLogin} className="space-y-4">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-slate-300">Supervisor ID</span>
                  <input
                    value={supervisorId}
                    onChange={(event) => setSupervisorId(event.target.value)}
                    placeholder="e.g., S_Sara_001"
                    className="rounded-2xl border border-slate-600 bg-slate-900/55 px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-slate-300">Password</span>
                  <div className="relative">
                    <input
                      type={showSupervisorPassword ? 'text' : 'password'}
                      value={supervisorPassword}
                      onChange={(event) => setSupervisorPassword(event.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-slate-600 bg-slate-900/55 px-4 py-3 pr-12 text-slate-100 placeholder:text-slate-400 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSupervisorPassword(!showSupervisorPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                      aria-label={showSupervisorPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSupervisorPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-green-500 px-4 py-3 font-semibold text-white shadow-lg shadow-green-500/30 transition hover:bg-green-600 hover:shadow-green-500/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:bg-slate-900/60 disabled:text-slate-500 disabled:shadow-none"
                >
                  {isSubmitting ? 'Validating…' : 'Enter supervisor portal'}
                </button>
              </form>
            ) : (
              <p className="text-sm text-slate-500">Pick a track to keep things focused.</p>
            )}
          </section>
        </div>
        <footer className="mt-12 text-center">
          <p className="text-xs text-slate-500">Al-Dana Team LRR</p>
        </footer>
      </div>
    </div>
  )
}

