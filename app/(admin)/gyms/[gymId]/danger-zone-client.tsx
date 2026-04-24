// app/(admin)/gyms/[gymId]/danger-zone-client.tsx
'use client'
import { useState, useTransition } from 'react'
import { suspendGym, unsuspendGym, deleteGym } from './actions'

export function DangerZoneClient({
  gymId,
  gymName,
  isSuspended,
}: {
  gymId: string
  gymName: string
  isSuspended: boolean
}) {
  const [suspendChecked, setSuspendChecked] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [isSuspendPending, startSuspendTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()

  // Server Actions return Promises — must use async callback so NEXT_REDIRECT
  // and thrown errors propagate correctly instead of being silently dropped.
  function handleSuspend() {
    startSuspendTransition(async () => { await suspendGym(gymId, gymName) })
  }
  function handleUnsuspend() {
    startSuspendTransition(async () => { await unsuspendGym(gymId, gymName) })
  }
  function handleDelete() {
    if (deleteInput !== gymName) return
    startDeleteTransition(async () => { await deleteGym(gymId, gymName) })
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-4">
      <h2 className="text-sm font-semibold text-red-700">Danger Zone</h2>

      {/* Suspend / Unsuspend */}
      <div className="space-y-2">
        {!isSuspended ? (
          <>
            <label className="flex items-center gap-2 text-sm text-red-700 cursor-pointer">
              <input
                type="checkbox"
                checked={suspendChecked}
                onChange={e => setSuspendChecked(e.target.checked)}
                className="rounded"
              />
              I understand this will prevent the gym owner from using their dashboard
            </label>
            <button
              disabled={!suspendChecked || isSuspendPending}
              onClick={handleSuspend}
              className="px-4 py-2 text-sm rounded-md bg-red-600 text-white disabled:opacity-40 hover:bg-red-700 transition-colors"
            >
              {isSuspendPending ? 'Suspending…' : 'Suspend Gym'}
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-red-700 font-medium">⚠ This gym is currently suspended</p>
            <button
              disabled={isSuspendPending}
              onClick={handleUnsuspend}
              className="px-4 py-2 text-sm rounded-md border border-red-400 bg-white text-red-700 hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              {isSuspendPending ? 'Unsuspending…' : 'Unsuspend Gym'}
            </button>
          </div>
        )}
      </div>

      {/* Delete */}
      <div className="pt-3 border-t border-red-200 space-y-2">
        <p className="text-sm text-red-700">
          Permanently delete this gym and all its data. Type <strong>{gymName}</strong> to confirm.
        </p>
        <input
          type="text"
          placeholder={`Type "${gymName}" to confirm`}
          value={deleteInput}
          onChange={e => setDeleteInput(e.target.value)}
          className="w-full max-w-sm px-3 py-2 text-sm rounded-md border border-red-300 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <button
          disabled={deleteInput !== gymName || isDeletePending}
          onClick={handleDelete}
          className="px-4 py-2 text-sm rounded-md border border-red-600 text-red-700 bg-white hover:bg-red-50 transition-colors disabled:opacity-40"
        >
          {isDeletePending ? 'Deleting…' : 'Delete Gym Permanently'}
        </button>
      </div>
    </div>
  )
}
