import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchControllers, fetchSectorCatalog } from '../../services/dataService'
import type { ControllerProfile, RosterRole, SectorSummary } from '../../types'

interface DraftController {
  name: string
  id: string
  experienceYears: number
  yearOfBirth: number
  gender: ControllerProfile['gender']
  healthNotes: string
  sectorId: string
  rosterRole: RosterRole
}

const initialDraft: DraftController = {
  name: '',
  id: '',
  experienceYears: 1,
  yearOfBirth: 1998,
  gender: 'Female',
  healthNotes: '',
  sectorId: '',
  rosterRole: 'primary',
}

export function ControllerManagement() {
  const { data: fetchedControllers } = useQuery({
    queryKey: ['controllers'],
    queryFn: () => fetchControllers(),
  })
  const { data: sectorCatalog } = useQuery({
    queryKey: ['sector-catalog'],
    queryFn: () => fetchSectorCatalog(),
  })

  const [controllers, setControllers] = useState<ControllerProfile[]>([])
  const [draft, setDraft] = useState<DraftController>(initialDraft)
  const [isFormOpen, setIsFormOpen] = useState(false)

  useEffect(() => {
    if (fetchedControllers) {
      setControllers(fetchedControllers)
    }
  }, [fetchedControllers])

  useEffect(() => {
    if (sectorCatalog && sectorCatalog.length > 0 && !draft.sectorId) {
      setDraft((prev) => ({ ...prev, sectorId: sectorCatalog[0].id }))
    }
  }, [sectorCatalog, draft.sectorId])

  const controllerCount = controllers.length

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.name || !draft.id || !draft.sectorId) return

    const sectorDetails: SectorSummary | undefined = sectorCatalog?.find((sector) => sector.id === draft.sectorId)
    if (!sectorDetails) return

    const newController: ControllerProfile = {
      id: draft.id,
      name: draft.name,
      experienceYears: draft.experienceYears,
      yearOfBirth: draft.yearOfBirth,
      gender: draft.gender,
      healthNotes: draft.healthNotes,
      sectorId: sectorDetails.id,
      sectorName: sectorDetails.name,
      shiftGroup: sectorDetails.shiftGroup,
      rosterRole: draft.rosterRole,
      baselineReadiness: 0.9,
      baselineFactors: {
        blinkRate: 17,
        speechRate: 123,
        responseDelay: 0.95,
        toneStability: 0.92,
      },
    }

    setControllers((prev) => [newController, ...prev])
    setDraft(initialDraft)
    setIsFormOpen(false)
  }

  const rosterSummary = useMemo(
    () =>
      controllers.map((controller) => ({
        id: controller.id,
        name: controller.name,
        experienceYears: controller.experienceYears,
        age: new Date().getFullYear() - controller.yearOfBirth,
        note: controller.healthNotes ?? '—',
          sector: controller.sectorName,
          rosterRole: controller.rosterRole,
      })),
    [controllers],
  )

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-2xl bg-slate-900/70 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Controllers management panel</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-100">Maintain roster and baseline folders</h2>
          <p className="mt-2 text-sm text-slate-500">
            Add controllers, update their profiles, and manage roster assignments. Prototype actions update the local
            dataset to illustrate the workflow.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-6 py-4 text-right">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Roster size</p>
          <p className="mt-2 text-4xl font-semibold text-slate-100">{controllerCount}</p>
          <p className="text-xs text-slate-500">Baseline folders auto-create on first login.</p>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-500">Active controllers</h3>
            <p className="text-sm text-slate-500">
              Each controller entry stores profile, baseline, and shift data inside `/database/controllers/{'{ID}'}`.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-700">
          <table className="min-w-full divide-y divide-slate-800/80 text-sm">
            <thead className="bg-slate-900/65 text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left font-medium uppercase tracking-wider">Controller</th>
                <th className="px-5 py-3 text-left font-medium uppercase tracking-wider">Sector</th>
                <th className="px-5 py-3 text-left font-medium uppercase tracking-wider">Experience</th>
                <th className="px-5 py-3 text-left font-medium uppercase tracking-wider">Age</th>
                <th className="px-5 py-3 text-left font-medium uppercase tracking-wider">Health notes</th>
                <th className="px-5 py-3 text-left font-medium uppercase tracking-wider">Baseline readiness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-500">
              {rosterSummary.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-900/50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-100">{entry.name}</p>
                    <p className="text-xs text-slate-500">{entry.id}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    <p>{entry.sector}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{entry.rosterRole}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">{entry.experienceYears} years</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{entry.age}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{entry.note}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">Auto-sync on login</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isFormOpen ? (
        <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-6 shadow-xl shadow-black/40">
          <h3 className="text-lg font-semibold text-slate-500">Create new controller profile</h3>
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-slate-500">
              Name
              <input
                required
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-slate-500">
              Controller ID
              <input
                required
                value={draft.id}
                onChange={(event) => setDraft((prev) => ({ ...prev, id: event.target.value }))}
                placeholder="e.g., C_Sara_104"
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-slate-500">
              Experience (years)
              <input
                type="number"
                min={0}
                value={draft.experienceYears}
                onChange={(event) => setDraft((prev) => ({ ...prev, experienceYears: Number(event.target.value) }))}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-slate-500">
              Year of birth
              <input
                type="number"
                value={draft.yearOfBirth}
                onChange={(event) => setDraft((prev) => ({ ...prev, yearOfBirth: Number(event.target.value) }))}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-slate-500">
              Gender
              <select
                value={draft.gender}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, gender: event.target.value as ControllerProfile['gender'] }))
                }
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
              >
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </label>
            <label className="md:col-span-2 flex flex-col gap-2 text-xs uppercase tracking-wide text-slate-500">
              Health notes
              <textarea
                value={draft.healthNotes}
                onChange={(event) => setDraft((prev) => ({ ...prev, healthNotes: event.target.value }))}
                rows={3}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-slate-500">
              Sector assignment
              <select
                value={draft.sectorId}
                onChange={(event) => setDraft((prev) => ({ ...prev, sectorId: event.target.value }))}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
              >
                {sectorCatalog?.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name} — {sector.shiftGroup}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-slate-500">
              Roster role
              <select
                value={draft.rosterRole}
                onChange={(event) => setDraft((prev) => ({ ...prev, rosterRole: event.target.value as RosterRole }))}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 focus:border-pearl-primary focus:outline-none focus:ring-2 focus:ring-pearl-primary/30"
              >
                <option value="primary">Primary</option>
                <option value="backup">Backup</option>
              </select>
            </label>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDraft(initialDraft)
                  setIsFormOpen(false)
                }}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-500 hover:border-slate-700 hover:text-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-pearl-primary px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-300"
              >
                Save controller
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

