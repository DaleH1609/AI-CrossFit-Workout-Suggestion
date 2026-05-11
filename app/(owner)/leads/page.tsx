'use client'
// app/(owner)/leads/page.tsx — Lead capture CRM pipeline
import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/toast'

type LeadStatus = 'new' | 'contacted' | 'trial_booked' | 'showed_up' | 'joined' | 'lost'

interface Lead {
  id: string
  email: string
  name: string | null
  phone: string | null
  source: string | null
  status: LeadStatus
  notes: string | null
  trial_date: string | null
  created_at: string
}

const STATUSES: { key: LeadStatus; label: string; color: string }[] = [
  { key: 'new',          label: 'New',          color: 'bg-border/60 text-secondary' },
  { key: 'contacted',    label: 'Contacted',    color: 'bg-blue-500/10 text-blue-400' },
  { key: 'trial_booked', label: 'Trial Booked', color: 'bg-accent/10 text-accent' },
  { key: 'showed_up',    label: 'Showed Up',    color: 'bg-success/10 text-success' },
  { key: 'joined',       label: 'Joined!',      color: 'bg-success/20 text-success font-bold' },
  { key: 'lost',         label: 'Lost',         color: 'bg-danger/10 text-danger' },
]

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all')
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editTrialDate, setEditTrialDate] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const loadLeads = useCallback(async () => {
    try {
      const url = filterStatus === 'all' ? '/api/admin/leads' : `/api/admin/leads?status=${filterStatus}`
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      setLeads(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => { loadLeads() }, [loadLeads])

  async function moveStatus(lead: Lead, status: LeadStatus) {
    const res = await fetch('/api/admin/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, status }),
    })
    if (!res.ok) { toast('Failed to update status', 'error'); return }
    setLeads(l => l.map(x => x.id === lead.id ? { ...x, status } : x))
  }

  async function saveLead() {
    if (!editLead) return
    setSaving(true)
    const res = await fetch('/api/admin/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editLead.id, notes: editNotes, trial_date: editTrialDate || null }),
    })
    setSaving(false)
    if (!res.ok) { toast('Failed to save', 'error'); return }
    setLeads(l => l.map(x => x.id === editLead.id ? { ...x, notes: editNotes, trial_date: editTrialDate || null } : x))
    setEditLead(null)
    toast('Saved', 'success')
  }

  async function deleteLead(id: string) {
    const res = await fetch(`/api/admin/leads?id=${id}`, { method: 'DELETE' })
    if (!res.ok) { toast('Failed to delete', 'error'); return }
    setLeads(l => l.filter(x => x.id !== id))
    toast('Lead removed', 'success')
  }

  const statusMap = Object.fromEntries(STATUSES.map(s => [s.key, s]))
  const filtered = filterStatus === 'all' ? leads : leads.filter(l => l.status === filterStatus)

  // Count per status for pipeline bar
  const counts = Object.fromEntries(STATUSES.map(s => [s.key, leads.filter(l => l.status === s.key).length]))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-foreground">Leads</h1>
        <p className="text-xs text-secondary">{leads.length} total</p>
      </div>

      {/* Pipeline status bar */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
        {STATUSES.map(s => (
          <button
            key={s.key}
            onClick={() => setFilterStatus(filterStatus === s.key ? 'all' : s.key)}
            className={`rounded-lg border p-3 text-left transition-all ${
              filterStatus === s.key ? 'border-accent ring-1 ring-accent/30' : 'border-border hover:border-border/80'
            } bg-surface`}
          >
            <p className="text-lg font-bold text-foreground">{counts[s.key]}</p>
            <p className="text-[10px] text-secondary uppercase tracking-wider mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Embed snippet */}
      <details className="mb-6 border border-border rounded-xl">
        <summary className="px-4 py-3 cursor-pointer text-sm text-secondary hover:text-foreground">
          Website embed snippet
        </summary>
        <div className="px-4 pb-4 pt-2">
          <p className="text-xs text-secondary mb-2">Add this form to your gym's website to capture leads:</p>
          <pre className="text-xs bg-surface-raised border border-border rounded-lg p-3 overflow-x-auto text-foreground/70 whitespace-pre-wrap">
{`<form onsubmit="submitLead(event)">
  <input name="name" placeholder="Your name" required />
  <input name="email" type="email" placeholder="Email" required />
  <input name="phone" placeholder="Phone (optional)" />
  <button type="submit">Book a Free Trial</button>
</form>
<script>
async function submitLead(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  await fetch('/api/leads?gymId=YOUR_GYM_ID', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({...data, source:'website'})
  });
  alert('Thanks! We will be in touch.');
}
</script>`}
          </pre>
        </div>
      </details>

      {/* Leads table */}
      {loading ? (
        <div className="text-center text-secondary text-sm py-12">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border/60 rounded-xl py-16 px-8 text-center bg-surface/40">
          <div className="text-4xl mb-4">📋</div>
          {filterStatus === 'all' ? (
            <>
              <p className="text-foreground font-medium mb-1">No leads yet</p>
              <p className="text-secondary text-sm">Add your lead capture embed to your gym website. New enquiries will appear here automatically.</p>
            </>
          ) : (
            <p className="text-secondary text-sm">No leads in the <span className="text-foreground">{statusMap[filterStatus]?.label}</span> stage.</p>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_80px_80px] px-5 py-2.5 border-b border-border bg-surface-raised">
            <span className="text-[10px] text-secondary uppercase tracking-widest">Lead</span>
            <span className="text-[10px] text-secondary uppercase tracking-widest">Status</span>
            <span className="text-[10px] text-secondary uppercase tracking-widest">Source</span>
            <span />
          </div>
          {filtered.map(lead => {
            const s = statusMap[lead.status]
            return (
              <div key={lead.id} className="group grid grid-cols-[1fr_100px_80px_80px] items-center px-5 py-3.5 border-b border-border last:border-0 hover:bg-surface-raised transition-colors">
                <div className="min-w-0 pr-3">
                  <p className="text-sm text-foreground truncate">{lead.name ?? lead.email}</p>
                  {lead.name && <p className="text-xs text-secondary mt-0.5 truncate">{lead.email}</p>}
                  {lead.trial_date && (
                    <p className="text-[10px] text-accent mt-0.5">Trial: {new Date(lead.trial_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                  )}
                </div>

                {/* Status dropdown */}
                <div>
                  <select
                    value={lead.status}
                    onChange={e => moveStatus(lead, e.target.value as LeadStatus)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border-0 bg-transparent cursor-pointer ${s?.color}`}
                  >
                    {STATUSES.map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[10px] text-secondary capitalize">{lead.source ?? '—'}</span>
                </div>

                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditLead(lead); setEditNotes(lead.notes ?? ''); setEditTrialDate(lead.trial_date ?? '') }}
                    className="text-xs text-secondary hover:text-foreground transition-colors"
                  >
                    Notes
                  </button>
                  <button
                    onClick={() => deleteLead(lead.id)}
                    className="text-xs text-danger/60 hover:text-danger transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Notes / trial date slide-over */}
      {editLead && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditLead(null)} />
          <div className="relative w-full max-w-sm bg-background border-l border-border h-full overflow-y-auto p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-lg text-foreground">{editLead.name ?? editLead.email}</h2>
                {editLead.name && <p className="text-secondary text-xs">{editLead.email}</p>}
              </div>
              <button onClick={() => setEditLead(null)} className="text-secondary hover:text-foreground text-xl">×</button>
            </div>

            <label className="block text-xs text-secondary uppercase tracking-widest mb-1">Trial date</label>
            <input
              type="date"
              value={editTrialDate}
              onChange={e => setEditTrialDate(e.target.value)}
              className="w-full mb-4 px-3 py-2 bg-surface border border-border rounded-btn text-sm text-foreground focus:outline-none focus:border-accent"
            />

            <label className="block text-xs text-secondary uppercase tracking-widest mb-1">Notes</label>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              rows={6}
              placeholder="Add notes about this lead…"
              className="w-full mb-4 px-3 py-2.5 bg-surface border border-border rounded-btn text-sm text-foreground placeholder-secondary focus:outline-none focus:border-accent resize-none"
            />

            <button
              onClick={saveLead}
              disabled={saving}
              className="w-full py-2.5 bg-accent text-background text-sm font-bold rounded-btn disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
