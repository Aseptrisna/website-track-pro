import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Trash2, Edit2, Shield, Eye, CheckCircle2, XCircle } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TeamMember {
  _id:             string;
  name:            string;
  email:           string;
  role:            'manager' | 'viewer';
  isActive:        boolean;
  isEmailVerified: boolean;
  createdAt:       string;
}

interface FormState {
  name:     string;
  email:    string;
  password: string;
  role:     'manager' | 'viewer';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  manager: {
    label: 'Manager',
    desc:  'Full fleet access — can create, update, and delete records',
    icon:  Shield,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  viewer: {
    label: 'Viewer',
    desc:  'Read-only access — can view all fleet data but cannot make changes',
    icon:  Eye,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
} as const;

const BLANK: FormState = { name: '', email: '', password: '', role: 'manager' };

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TeamPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<TeamMember | null>(null);
  const [form,      setForm]      = useState<FormState>(BLANK);

  // Redirect if not owner
  if (user?.isTeamMember) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="h-12 w-12 text-gray-300" />
        <p className="mt-4 text-lg font-medium text-gray-500 dark:text-gray-400">Access Restricted</p>
        <p className="mt-1 text-sm text-gray-400">Only fleet owners can manage the team.</p>
      </div>
    );
  }

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['team'],
    queryFn: async () => { const { data } = await api.get('/team'); return data; },
  });

  const createMut = useMutation({
    mutationFn: (dto: FormState) => api.post('/team', dto),
    onSuccess: () => { toast.success('Team member added'); qc.invalidateQueries({ queryKey: ['team'] }); setShowModal(false); },
    onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to add member'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => api.put(`/team/${id}`, dto),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['team'] }); setShowModal(false); },
    onError:   () => toast.error('Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/team/${id}`),
    onSuccess: () => { toast.success('Removed from team'); qc.invalidateQueries({ queryKey: ['team'] }); },
    onError:   () => toast.error('Failed to remove'),
  });

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/team/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
    onError:   () => toast.error('Failed to update status'),
  });

  const openCreate = () => { setEditing(null); setForm(BLANK); setShowModal(true); };
  const openEdit   = (m: TeamMember) => {
    setEditing(m);
    setForm({ name: m.name, email: m.email, password: '', role: m.role });
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      const dto: any = { name: form.name, role: form.role };
      if (form.password) dto.password = form.password;
      updateMut.mutate({ id: editing._id, dto });
    } else {
      if (!form.password) { toast.error('Password is required for new members'); return; }
      createMut.mutate(form);
    }
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <Users className="h-6 w-6" /> Team Members
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Grant fleet access to managers and viewers
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <UserPlus className="h-4 w-4" /> Add Member
        </button>
      </div>

      {/* Role info cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
          <div key={key} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', cfg.color)}>
                {cfg.label}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{cfg.desc}</p>
          </div>
        ))}
      </div>

      {/* Team list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-20 dark:border-slate-600 dark:bg-slate-800/50">
          <Users className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">No team members yet</p>
          <p className="mt-1 text-xs text-gray-400">Add managers or viewers to give others access to your fleet.</p>
          <button onClick={openCreate} className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <UserPlus className="h-4 w-4" /> Add First Member
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
          {members.map((m) => {
            const cfg = ROLE_CONFIG[m.role] ?? ROLE_CONFIG.viewer;
            const RoleIcon = cfg.icon;
            return (
              <div key={m._id} className={clsx('flex items-center gap-4 px-5 py-4', !m.isActive && 'opacity-60')}>
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold dark:bg-emerald-900/30 dark:text-emerald-400">
                  {m.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">{m.name}</p>
                    <span className={clsx('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', cfg.color)}>
                      <RoleIcon className="h-2.5 w-2.5" />
                      {cfg.label}
                    </span>
                    {!m.isActive && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        Deactivated
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-gray-500 dark:text-gray-400">{m.email}</p>
                  <p className="text-xs text-gray-400">
                    Added {new Date(m.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => toggleActiveMut.mutate({ id: m._id, isActive: !m.isActive })}
                    title={m.isActive ? 'Deactivate' : 'Activate'}
                    className="rounded-lg border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700"
                  >
                    {m.isActive
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      : <XCircle      className="h-4 w-4 text-red-400"     />}
                  </button>
                  <button
                    onClick={() => openEdit(m)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Remove ${m.name} from the team?`)) deleteMut.mutate(m._id); }}
                    className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-red-800/40 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Edit — ${editing.name}` : 'Add Team Member'}
        size="md"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Full Name</label>
            <input
              required
              type="text"
              placeholder="e.g. Budi Santoso"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Email Address</label>
            <input
              required
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={!!editing}
              className={clsx(inputClass, editing && 'cursor-not-allowed opacity-60')}
            />
            {editing && <p className="mt-1 text-[11px] text-gray-400">Email cannot be changed after creation.</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Password {editing && <span className="text-gray-400">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              placeholder={editing ? 'Leave blank to keep current password' : 'Set a password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputClass}
              minLength={editing ? undefined : 6}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {(['manager', 'viewer'] as const).map((r) => {
                const cfg = ROLE_CONFIG[r];
                const RoleIcon = cfg.icon;
                return (
                  <label
                    key={r}
                    className={clsx(
                      'flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors',
                      form.role === r
                        ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-500',
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={form.role === r}
                      onChange={() => setForm({ ...form, role: r })}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-1.5">
                      <RoleIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{cfg.label}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{cfg.desc}</p>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-3 dark:border-slate-700">
            <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {(createMut.isPending || updateMut.isPending) && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {editing ? 'Save Changes' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
