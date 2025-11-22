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
  const [supervisorId, setSupervisorId] = useState('')
  const [supervisorPassword, setSupervisorPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRoleChange = (role: RoleOption) => {
    setSelectedRole(role)
    setError(null)
  }

  const handleControllerLogin = async (event: FormEvent) => {
    event.preventDefault()
    if (!controllerId.trim()) {
      setError('Please enter your Controller ID.')
      return
    }
    setIsSubmitting(true)
    const profile = await authenticateController(controllerId.trim())
    setIsSubmitting(false)
    if (!profile) {
      setError('Controller ID not found. Please retry or contact the supervisor.')
      return
    }
    loginController(profile)
    navigate('/controller', { replace: true })
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
                Comfortable fatigue monitoring
              </h1>
              <p className="mt-3 text-base text-slate-400">
                Pick your workspace and breeze through a focused, two-minute flow.
              </p>
            </div>

            <div className="grid w-full gap-5 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {[
                { title: 'Guided routines', helper: 'Bite-size steps keep stress low.' },
                { title: 'Live awareness', helper: 'Only the critical signals show.' },
                { title: 'Private data loop', helper: 'Biometrics stay with the controller.' },
                { title: 'One-tap exports', helper: 'Share reports instantly.' },
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
          </section>

          <section className="pearl-panel space-y-9 p-6 lg:p-12 w-full">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Sign in</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100 lg:text-[26px]">Choose the calm track that fits you</h2>
              </div>
              <span className="rounded-full bg-slate-900/70 px-4 py-1 text-xs font-medium text-slate-400">Simulation data</span>
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
                      ? 'Refresh, monitor, and wrap up with a quiet summary.'
                      : 'Glance, nudge, and export in one calm view.'}
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
                  <input
                    type="password"
                    value={supervisorPassword}
                    onChange={(event) => setSupervisorPassword(event.target.value)}
                    placeholder="••••••••"
                    className="rounded-2xl border border-slate-600 bg-slate-900/55 px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
                  />
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
      </div>
    </div>
  )
}

