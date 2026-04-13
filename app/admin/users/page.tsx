'use client'

/**
 * Admin User Management Page
 *
 * Search users, view role/billing state, toggle exemptions, change roles.
 * Protected: only users with is_admin=true or role in owner/admin can access.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '../../../lib/supabase/browser-client'
import { checkIsAdmin } from '../../../lib/admin-guard'

// ── Types ──

type UserRow = {
  id: string
  email: string | null
  username: string | null
  role: string
  is_admin: boolean
  subscription_status: string | null
  billing_exempt: boolean
  billing_exempt_until: string | null
  billing_exempt_reason: string | null
}

type LogEntry = {
  id: number
  time: string
  type: 'info' | 'success' | 'error'
  message: string
}

// ── API helpers ──

async function apiSearchUsers(q: string): Promise<{ users: UserRow[] }> {
  const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`)
  return res.json()
}

async function apiUpdateUser(userId: string, updates: Record<string, unknown>): Promise<{ success?: boolean; error?: string }> {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, updates }),
  })
  return res.json()
}

// ── Helpers ──

const ROLE_OPTIONS = ['user', 'staff', 'admin', 'owner'] as const
const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  staff: 'bg-green-100 text-green-800',
  user: 'bg-gray-100 text-gray-600',
}
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-amber-100 text-amber-700',
  canceled: 'bg-red-100 text-red-700',
  unpaid: 'bg-red-100 text-red-700',
}

function Badge({ text, colorClass }: { text: string; colorClass?: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${colorClass ?? 'bg-gray-100 text-gray-600'}`}>
      {text}
    </span>
  )
}

// ── Main Component ──

export default function AdminUsersPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [adminRole, setAdminRole] = useState<string>('user')

  // Search
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editExempt, setEditExempt] = useState(false)
  const [editExemptUntil, setEditExemptUntil] = useState('')
  const [editExemptReason, setEditExemptReason] = useState('')
  const [saving, setSaving] = useState(false)

  // Log
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logIdRef = { current: 0 }

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const id = ++logIdRef.current
    const time = new Date().toLocaleTimeString('ja-JP')
    setLogs((prev) => [{ id, time, type, message }, ...prev].slice(0, 30))
  }, [])

  // Auth check
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    checkIsAdmin(supabase).then(({ isAdmin, role, mfaRequired }) => {
      if (!isAdmin) {
        router.replace('/dashboard')
      } else if (mfaRequired) {
        router.replace('/admin/mfa-setup')
      } else {
        setAuthorized(true)
        setAdminRole(role)
      }
      setAuthChecked(true)
    })
  }, [router])

  // Search handler
  async function handleSearch() {
    setLoading(true)
    try {
      const result = await apiSearchUsers(search)
      setUsers(result.users ?? [])
      addLog('info', `Found ${result.users?.length ?? 0} user(s)`)
    } catch (e) {
      addLog('error', `Search failed: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setLoading(false)
    }
  }

  // Start editing
  function startEdit(user: UserRow) {
    setEditingId(user.id)
    setEditRole(user.role ?? 'user')
    setEditExempt(user.billing_exempt ?? false)
    setEditExemptUntil(user.billing_exempt_until?.slice(0, 10) ?? '')
    setEditExemptReason(user.billing_exempt_reason ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  // Save changes
  async function handleSave(userId: string) {
    setSaving(true)
    const updates: Record<string, unknown> = {
      role: editRole,
      billing_exempt: editExempt,
      billing_exempt_until: editExemptUntil ? new Date(editExemptUntil + 'T23:59:59').toISOString() : null,
      billing_exempt_reason: editExemptReason || null,
    }

    try {
      const result = await apiUpdateUser(userId, updates)
      if (result.error) {
        addLog('error', `Update failed: ${result.error}`)
      } else {
        addLog('success', `Updated user ${userId.slice(0, 8)}`)
        setEditingId(null)
        handleSearch() // refresh
      }
    } catch (e) {
      addLog('error', `Save error: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setSaving(false)
    }
  }

  // Toggle billing exempt (quick action)
  async function handleToggleExempt(user: UserRow) {
    const newValue = !user.billing_exempt
    try {
      const result = await apiUpdateUser(user.id, {
        billing_exempt: newValue,
        billing_exempt_reason: newValue ? 'admin_toggle' : null,
      })
      if (result.error) {
        addLog('error', result.error)
      } else {
        addLog('success', `${user.email ?? user.id.slice(0, 8)}: billing_exempt → ${newValue}`)
        handleSearch()
      }
    } catch (e) {
      addLog('error', `Toggle failed: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  if (!authChecked || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">{authChecked ? 'Access denied.' : 'Verifying access...'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-black text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500">Manage roles and billing exemptions.</p>

        {/* Search */}
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by email or username"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="rounded-lg bg-gray-800 px-5 py-2 text-sm font-bold text-white transition hover:bg-gray-900 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* User list */}
        {users.length > 0 && (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {users.map((user) => {
              const isEditing = editingId === user.id
              const isOwner = user.role === 'owner'

              return (
                <div key={user.id} className="px-5 py-4">
                  {/* User header row */}
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-900">
                        {user.email ?? user.id.slice(0, 12)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user.username ?? 'no username'} · {user.id.slice(0, 8)}
                      </p>
                    </div>
                    <Badge text={user.role ?? 'user'} colorClass={ROLE_COLORS[user.role] ?? ROLE_COLORS.user} />
                    {user.subscription_status && (
                      <Badge text={user.subscription_status} colorClass={STATUS_COLORS[user.subscription_status]} />
                    )}
                    {user.billing_exempt && (
                      <Badge text="無料中" colorClass="bg-amber-100 text-amber-800" />
                    )}
                  </div>

                  {/* Action buttons */}
                  {!isEditing && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleExempt(user)}
                        className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                          user.billing_exempt
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                      >
                        {user.billing_exempt ? '無料解除' : '無料にする'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(user)}
                        className="rounded-md bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                      >
                        Edit
                      </button>
                    </div>
                  )}

                  {/* Edit form */}
                  {isEditing && (
                    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500">Role</label>
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            disabled={isOwner && adminRole !== 'owner'}
                            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm disabled:opacity-50"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r} disabled={r === 'owner' && adminRole !== 'owner'}>
                                {r}
                              </option>
                            ))}
                          </select>
                          {isOwner && <p className="mt-1 text-[10px] text-red-500">Owner role protected</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500">Billing Exempt</label>
                          <select
                            value={editExempt ? 'yes' : 'no'}
                            onChange={(e) => setEditExempt(e.target.value === 'yes')}
                            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500">Exempt Until</label>
                          <input
                            type="date"
                            value={editExemptUntil}
                            onChange={(e) => setEditExemptUntil(e.target.value)}
                            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500">Reason</label>
                          <input
                            type="text"
                            value={editExemptReason}
                            onChange={(e) => setEditExemptReason(e.target.value)}
                            placeholder="e.g. tester, employee"
                            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSave(user.id)}
                          disabled={saving}
                          className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-md bg-gray-200 px-4 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {users.length === 0 && !loading && (
          <p className="text-center text-sm text-gray-400">Search for users to manage.</p>
        )}

        {/* Activity log */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-800">Activity Log</h2>
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {logs.length === 0 && <p className="text-xs text-gray-400">No activity yet.</p>}
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2 text-xs">
                <span className="w-16 shrink-0 text-gray-400">{log.time}</span>
                <span className={
                  log.type === 'error' ? 'font-bold text-red-600'
                  : log.type === 'success' ? 'font-bold text-green-600'
                  : 'text-gray-600'
                }>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
