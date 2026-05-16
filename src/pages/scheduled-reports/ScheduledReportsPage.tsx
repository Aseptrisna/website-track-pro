import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Plus, Trash2, Send, ToggleLeft, ToggleRight, Clock, CalendarDays, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import api from '../../lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────
type ReportType      = 'fleet_summary' | 'violations' | 'idle_time';
type ReportFrequency = 'daily' | 'weekly' | 'monthly';

interface Schedule {
  _id:             string;
  report_type:     ReportType;
  frequency:       ReportFrequency;
  recipient_email: string;
  enabled:         boolean;
  last_sent_at:    string | null;
  createdAt:       string;
}

interface FormState {
  report_type:     ReportType;
  frequency:       ReportFrequency;
  recipient_email: string;
}

// ── Config ────────────────────────────────────────────────────────────────────
const REPORT_TYPES: Array<{ value: ReportType; label: string; desc: string }> = [
  { value: 'fleet_summary', label: 'Fleet Summary',    desc: 'Vehicles, violations, and idle time overview'      },
  { value: 'violations',    label: 'Speed Violations', desc: 'Detailed breakdown of speed violations by severity' },
  { value: 'idle_time',     label: 'Idle Time',        desc: 'Per-vehicle idle duration and event counts'         },
];

const FREQUENCIES: Array<{ value: ReportFrequency; label: string; desc: string }> = [
  { value: 'daily',   label: 'Daily',   desc: 'Sent every day at 7 AM'           },
  { value: 'weekly',  label: 'Weekly',  desc: 'Sent every 7 days, covers 7 days' },
  { value: 'monthly', label: 'Monthly', desc: 'Sent every 30 days'               },
];

const TYPE_COLOR: Record<ReportType, string> = {
  fleet_summary: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  violations:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  idle_time:     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const FREQ_ICON: Record<ReportFrequency, React.ComponentType<any>> = {
  daily:   Clock,
  weekly:  CalendarDays,
  monthly: RefreshCw,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

const BLANK: FormState = { report_type: 'fleet_summary', frequency: 'weekly', recipient_email: '' };

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ScheduledReportsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<Schedule | null>(null);
  const [form,      setForm]      = useState<FormState>(BLANK);
  const [sending,   setSending]   = useState<string | null>(null);

  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ['report-schedules'],
    queryFn: async () => { const { data } = await api.get('/report-schedules'); return data; },
  });

  const createMut = useMutation({
    mutationFn: (dto: FormState) => api.post('/report-schedules', dto),
    onSuccess: () => { toast.success('Schedule created'); qc.invalidateQueries({ queryKey: ['report-schedules'] }); setShowModal(false); },
    onError:   () => toast.error('Failed to save'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => api.put(`/report-schedules/${id}`, dto),
    onSuccess: () => { toast.success('Schedule updated'); qc.invalidateQueries({ queryKey: ['report-schedules'] }); setShowModal(false); },
    onError:   () => toast.error('Failed to save'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/report-schedules/${id}`),
    onSuccess: () => { toast.success('Schedule deleted'); qc.invalidateQueries({ queryKey: ['report-schedules'] }); },
    onError:   () => toast.error('Failed to delete'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.put(`/report-schedules/${id}`, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report-schedules'] }),
  });

  const openCreate = () => { setEditing(null); setForm(BLANK); setShowModal(true); };
  const openEdit   = (s: Schedule) => {
    setEditing(s);
    setForm({ report_type: s.report_type, frequency: s.frequency, recipient_email: s.recipient_email });
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipient_email.trim()) { toast.error('Recipient email is required'); return; }
    if (editing) updateMut.mutate({ id: editing._id, dto: form });
    else         createMut.mutate(form);
  };

  const handleSendNow = async (s: Schedule) => {
    setSending(s._id);
    try {
      await api.post(`/report-schedules/${s._id}/send-now`);
      toast.success(`Report sent to ${s.recipient_email}`);
      qc.invalidateQueries({ queryKey: ['report-schedules'] });
    } catch {
      toast.error('Failed to send report');
    } finally {
      setSending(null);
    }
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <Mail className="h-6 w-6" /> Scheduled Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Receive automated fleet reports by email on your schedule
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> New Schedule
        </button>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-300">
        Reports are automatically sent at <strong>7:00 AM</strong> based on the configured frequency. Use <strong>Send Now</strong> to test immediately.
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-20 dark:border-slate-600 dark:bg-slate-800/50">
          <Mail className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">No report schedules yet</p>
          <p className="mt-1 text-xs text-gray-400">Create your first schedule to start receiving automated reports.</p>
          <button onClick={openCreate} className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <Plus className="h-4 w-4" /> Create Schedule
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
          {schedules.map((s) => {
            const FreqIcon = FREQ_ICON[s.frequency];
            const isPending = sending === s._id;
            return (
              <div key={s._id} className={clsx('flex items-center gap-4 px-5 py-4', !s.enabled && 'opacity-60')}>
                {/* toggle */}
                <button
                  onClick={() => toggleMut.mutate({ id: s._id, enabled: !s.enabled })}
                  className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  title={s.enabled ? 'Disable' : 'Enable'}
                >
                  {s.enabled
                    ? <ToggleRight className="h-6 w-6 text-emerald-500" />
                    : <ToggleLeft  className="h-6 w-6" />}
                </button>

                {/* content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', TYPE_COLOR[s.report_type])}>
                      {s.report_type.replace('_', ' ')}
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                      <FreqIcon className="h-3 w-3" />
                      {s.frequency.charAt(0).toUpperCase() + s.frequency.slice(1)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{s.recipient_email}</p>
                  <p className="text-xs text-gray-400">
                    {s.last_sent_at ? `Last sent ${timeAgo(s.last_sent_at)}` : 'Never sent'}
                  </p>
                </div>

                {/* actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => handleSendNow(s)}
                    disabled={isPending}
                    title="Send now"
                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    {isPending
                      ? <div className="h-3.5 w-3.5 animate-spin rounded-full border border-gray-400 border-t-transparent" />
                      : <Send className="h-3.5 w-3.5" />}
                    Send Now
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this schedule?')) deleteMut.mutate(s._id); }}
                    className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:border-red-800/40 dark:hover:bg-red-900/20"
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
        title={editing ? 'Edit Schedule' : 'New Report Schedule'}
        size="md"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Report type */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Report Type</label>
            <div className="space-y-2">
              {REPORT_TYPES.map((rt) => (
                <label
                  key={rt.value}
                  className={clsx(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                    form.report_type === rt.value
                      ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-500',
                  )}
                >
                  <input
                    type="radio"
                    name="report_type"
                    value={rt.value}
                    checked={form.report_type === rt.value}
                    onChange={() => setForm({ ...form, report_type: rt.value })}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{rt.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{rt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Frequency</label>
            <div className="flex gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setForm({ ...form, frequency: f.value })}
                  className={clsx(
                    'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    form.frequency === f.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-600 dark:text-gray-300',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              {FREQUENCIES.find((f) => f.value === form.frequency)?.desc}
            </p>
          </div>

          {/* Recipient email */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Recipient Email
            </label>
            <input
              type="email"
              required
              placeholder="email@example.com"
              value={form.recipient_email}
              onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-3 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
            >
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
              {editing ? 'Save Changes' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
