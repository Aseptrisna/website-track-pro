import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, Car, Gauge, MapPin, Clock, ChevronRight, Check, X } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import api from '../../lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Geofence { _id: string; name: string; type: string }

interface AlertRule {
  speed_alert_enabled:    boolean;
  speed_limit_override:   number | null;
  geofence_enter_enabled: boolean;
  geofence_exit_enabled:  boolean;
  monitored_geofences:    Array<{ _id: string; name: string; type: string }>;
  cooldown_minutes:       number;
}

interface VehicleRule {
  vehicle_id:          string;
  vehicle_name:        string;
  plate_number:        string;
  vehicle_speed_limit: number;
  rule:                AlertRule | null;
}

const DEFAULTS: AlertRule = {
  speed_alert_enabled:    true,
  speed_limit_override:   null,
  geofence_enter_enabled: true,
  geofence_exit_enabled:  true,
  monitored_geofences:    [],
  cooldown_minutes:       10,
};

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600',
      )}
    >
      <span
        className={clsx(
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4.5' : 'translate-x-1',
        )}
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  );
}

// ── Status pills ──────────────────────────────────────────────────────────────
function RuleSummary({ item }: { item: VehicleRule }) {
  const r = item.rule ?? DEFAULTS;
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        r.speed_alert_enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                               : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400')}>
        <Gauge className="h-2.5 w-2.5" />
        Speed {r.speed_alert_enabled
          ? `≤${r.speed_limit_override ?? item.vehicle_speed_limit} km/h`
          : 'off'}
      </span>
      <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        r.geofence_enter_enabled ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                 : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400')}>
        <MapPin className="h-2.5 w-2.5" />
        Enter {r.geofence_enter_enabled ? 'on' : 'off'}
      </span>
      <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        r.geofence_exit_enabled ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400')}>
        <MapPin className="h-2.5 w-2.5" />
        Exit {r.geofence_exit_enabled ? 'on' : 'off'}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-slate-700 dark:text-gray-400">
        <Clock className="h-2.5 w-2.5" />
        {r.cooldown_minutes}min cooldown
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AlertRulesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<VehicleRule | null>(null);
  const [form, setForm] = useState<{
    speed_alert_enabled: boolean;
    speed_limit_override: string;
    geofence_enter_enabled: boolean;
    geofence_exit_enabled: boolean;
    monitored_geofences: string[];
    cooldown_minutes: string;
  } | null>(null);

  const { data: items, isLoading } = useQuery<VehicleRule[]>({
    queryKey: ['alert-rules'],
    queryFn: async () => { const { data } = await api.get('/alert-rules'); return data; },
  });

  const { data: geofences } = useQuery<Geofence[]>({
    queryKey: ['geofences-list'],
    queryFn: async () => { const { data } = await api.get('/geofences'); return data; },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ vehicleId, payload }: { vehicleId: string; payload: any }) => {
      return api.put(`/alert-rules/${vehicleId}`, payload);
    },
    onSuccess: () => {
      toast.success('Alert rules saved');
      qc.invalidateQueries({ queryKey: ['alert-rules'] });
      setEditing(null);
    },
    onError: () => toast.error('Failed to save'),
  });

  const openEdit = (item: VehicleRule) => {
    const r = item.rule ?? DEFAULTS;
    setForm({
      speed_alert_enabled:    r.speed_alert_enabled,
      speed_limit_override:   r.speed_limit_override != null ? String(r.speed_limit_override) : '',
      geofence_enter_enabled: r.geofence_enter_enabled,
      geofence_exit_enabled:  r.geofence_exit_enabled,
      monitored_geofences:    r.monitored_geofences.map((g) => g._id),
      cooldown_minutes:       String(r.cooldown_minutes),
    });
    setEditing(item);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !form) return;
    saveMutation.mutate({
      vehicleId: editing.vehicle_id,
      payload: {
        speed_alert_enabled:    form.speed_alert_enabled,
        speed_limit_override:   form.speed_limit_override ? Number(form.speed_limit_override) : null,
        geofence_enter_enabled: form.geofence_enter_enabled,
        geofence_exit_enabled:  form.geofence_exit_enabled,
        monitored_geofences:    form.monitored_geofences,
        cooldown_minutes:       form.cooldown_minutes ? Number(form.cooldown_minutes) : 10,
      },
    });
  };

  const toggleGeofence = (id: string) => {
    if (!form) return;
    setForm({
      ...form,
      monitored_geofences: form.monitored_geofences.includes(id)
        ? form.monitored_geofences.filter((g) => g !== id)
        : [...form.monitored_geofences, id],
    });
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BellRing className="h-6 w-6" /> Alert Rules
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure per-vehicle alert thresholds and notification preferences
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : !items?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 dark:border-slate-600 dark:bg-slate-800/50">
          <Car className="h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No vehicles found. Add a vehicle first.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800 divide-y divide-gray-100 dark:divide-slate-700">
          {items.map((item) => (
            <div key={item.vehicle_id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/30">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white truncate">{item.vehicle_name}</span>
                  <span className="text-xs text-gray-400">{item.plate_number}</span>
                  {!item.rule && (
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400 dark:bg-slate-700">default</span>
                  )}
                </div>
                <div className="mt-1.5"><RuleSummary item={item} /></div>
              </div>
              <button
                onClick={() => openEdit(item)}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
              >
                Configure <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={`Alert Rules — ${editing?.vehicle_name}`} size="lg">
        {form && (
          <form onSubmit={handleSave} className="flex flex-col gap-5">

            {/* Speed alerts */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-700/30">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Speed Alerts</span>
                </div>
                <Toggle checked={form.speed_alert_enabled} onChange={(v) => setForm({ ...form, speed_alert_enabled: v })} />
              </div>
              <div className={clsx('space-y-3 transition-opacity', !form.speed_alert_enabled && 'pointer-events-none opacity-40')}>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Speed Limit Override (km/h)
                    <span className="ml-1 text-gray-400">— leave empty to use vehicle default ({editing?.vehicle_speed_limit} km/h)</span>
                  </label>
                  <input
                    type="number"
                    min={10} max={300}
                    placeholder={`Default: ${editing?.vehicle_speed_limit} km/h`}
                    value={form.speed_limit_override}
                    onChange={(e) => setForm({ ...form, speed_limit_override: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Notification Cooldown (minutes)
                  </label>
                  <input
                    type="number"
                    min={1} max={120}
                    value={form.cooldown_minutes}
                    onChange={(e) => setForm({ ...form, cooldown_minutes: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Geofence alerts */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-700/30">
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Geofence Alerts</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Notify on geofence enter</span>
                  <Toggle checked={form.geofence_enter_enabled} onChange={(v) => setForm({ ...form, geofence_enter_enabled: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Notify on geofence exit</span>
                  <Toggle checked={form.geofence_exit_enabled} onChange={(v) => setForm({ ...form, geofence_exit_enabled: v })} />
                </div>

                {/* Geofence multi-select */}
                {geofences?.length ? (
                  <div>
                    <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                      Monitor specific geofences <span className="text-gray-400">(empty = all)</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {geofences.map((g) => {
                        const active = form.monitored_geofences.includes(g._id);
                        return (
                          <button
                            key={g._id}
                            type="button"
                            onClick={() => toggleGeofence(g._id)}
                            className={clsx(
                              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                              active
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-300',
                            )}
                          >
                            {active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-gray-400" />}
                            {g.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No geofences defined yet.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-3 dark:border-slate-700">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button type="submit" disabled={saveMutation.isPending} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {saveMutation.isPending && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                Save Rules
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
