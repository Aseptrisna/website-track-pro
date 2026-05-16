import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Plus, Edit2, Trash2,
  Car, ChevronLeft, ChevronRight,
  ShieldOff, Wrench, TrendingUp, CheckCircle2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
type IncidentType     = 'accident' | 'breakdown' | 'theft' | 'vandalism' | 'other';
type IncidentSeverity = 'minor' | 'moderate' | 'severe';
type IncidentStatus   = 'open' | 'in-progress' | 'resolved';

interface Incident {
  _id:                 string;
  vehicle:             string;
  vehicle_name:        string;
  plate_number:        string;
  driver_name:         string;
  date:                string;
  type:                IncidentType;
  severity:            IncidentSeverity;
  description:         string;
  location:            string;
  damage_cost:         number;
  insurance_claim_ref: string;
  repair_cost:         number;
  status:              IncidentStatus;
  resolved_at:         string | null;
  createdAt:           string;
}

interface IncidentStats {
  openCount:   number;
  yearCount:   number;
  damageCost:  number;
  repairCost:  number;
  byType:      { type: string; count: number }[];
  bySeverity:  { severity: string; count: number }[];
  topVehicles: { _id: string; vehicle_name: string; plate_number: string; count: number; total_cost: number }[];
  trend:       { month: string; count: number }[];
}

interface VehicleOption { _id: string; vehicle_name: string; plate_number: string }

interface FormState {
  vehicleId:           string;
  driver_name:         string;
  date:                string;
  type:                IncidentType;
  severity:            IncidentSeverity;
  description:         string;
  location:            string;
  damage_cost:         string;
  insurance_claim_ref: string;
  repair_cost:         string;
  status:              IncidentStatus;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<IncidentType, { label: string; color: string; bg: string; chartColor: string }> = {
  accident:   { label: 'Accident',   color: 'text-red-700 dark:text-red-400',    bg: 'bg-red-100 dark:bg-red-900/30',      chartColor: '#ef4444' },
  breakdown:  { label: 'Breakdown',  color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', chartColor: '#f97316' },
  theft:      { label: 'Theft',      color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', chartColor: '#a855f7' },
  vandalism:  { label: 'Vandalism',  color: 'text-pink-700 dark:text-pink-400',   bg: 'bg-pink-100 dark:bg-pink-900/30',    chartColor: '#ec4899' },
  other:      { label: 'Other',      color: 'text-gray-600 dark:text-gray-400',   bg: 'bg-gray-100 dark:bg-slate-700',      chartColor: '#9ca3af' },
};

const SEV_CONFIG: Record<IncidentSeverity, { label: string; color: string; dot: string }> = {
  minor:    { label: 'Minor',    color: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-400' },
  moderate: { label: 'Moderate', color: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  severe:   { label: 'Severe',   color: 'text-red-700 dark:text-red-400',       dot: 'bg-red-500'    },
};

const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string; bg: string }> = {
  'open':        { label: 'Open',        color: 'text-red-700 dark:text-red-400',     bg: 'bg-red-100 dark:bg-red-900/30'     },
  'in-progress': { label: 'In Progress', color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  'resolved':    { label: 'Resolved',    color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
};

const BLANK: FormState = {
  vehicleId: '', driver_name: '', date: new Date().toISOString().split('T')[0],
  type: 'accident', severity: 'minor', description: '', location: '',
  damage_cost: '', insurance_claim_ref: '', repair_cost: '', status: 'open',
};

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtR = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof AlertTriangle; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className={clsx('rounded-lg p-2 shrink-0', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-0.5 truncate text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function IncidentsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<Incident | null>(null);
  const [form,      setForm]      = useState<FormState>(BLANK);

  const [vehicleFilter,  setVehicleFilter]  = useState('');
  const [typeFilter,     setTypeFilter]     = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');
  const [page,           setPage]           = useState(1);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: vehicleOptions } = useQuery<VehicleOption[]>({
    queryKey: ['vehicles-options'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  const { data: stats } = useQuery<IncidentStats>({
    queryKey: ['incident-stats'],
    queryFn: async () => { const { data } = await api.get('/incidents/stats'); return data; },
  });

  const listParams: Record<string, any> = { page, limit: 25 };
  if (vehicleFilter) listParams.vehicleId = vehicleFilter;
  if (typeFilter)    listParams.type      = typeFilter;
  if (statusFilter)  listParams.status    = statusFilter;

  const { data: list, isLoading } = useQuery<{
    data: Incident[]; total: number; page: number; pages: number;
  }>({
    queryKey: ['incidents', vehicleFilter, typeFilter, statusFilter, page],
    queryFn: async () => { const { data } = await api.get('/incidents', { params: listParams }); return data; },
    placeholderData: (prev) => prev,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['incidents'] });
    qc.invalidateQueries({ queryKey: ['incident-stats'] });
  };

  const createMut = useMutation({
    mutationFn: (dto: FormState) => api.post('/incidents', dto),
    onSuccess: () => { toast.success('Incident logged'); invalidate(); setShowModal(false); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => api.put(`/incidents/${id}`, dto),
    onSuccess: () => { toast.success('Updated'); invalidate(); setShowModal(false); },
    onError: () => toast.error('Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/incidents/${id}`),
    onSuccess: () => { toast.success('Deleted'); invalidate(); },
    onError: () => toast.error('Failed to delete'),
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openCreate = () => { setEditing(null); setForm(BLANK); setShowModal(true); };
  const openEdit   = (i: Incident) => {
    setEditing(i);
    setForm({
      vehicleId:           i.vehicle,
      driver_name:         i.driver_name,
      date:                i.date.split('T')[0],
      type:                i.type,
      severity:            i.severity,
      description:         i.description,
      location:            i.location,
      damage_cost:         i.damage_cost ? String(i.damage_cost) : '',
      insurance_claim_ref: i.insurance_claim_ref,
      repair_cost:         i.repair_cost ? String(i.repair_cost) : '',
      status:              i.status,
    });
    setShowModal(true);
  };

  const handleSave = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.vehicleId)   { toast.error('Select a vehicle'); return; }
    if (!form.description) { toast.error('Description is required'); return; }
    const dto = {
      ...form,
      damage_cost: Number(form.damage_cost) || 0,
      repair_cost: Number(form.repair_cost) || 0,
    };
    if (editing) updateMut.mutate({ id: editing._id, dto });
    else         createMut.mutate(form);
  };

  // ── Chart data ───────────────────────────────────────────────────────────────
  const trendData = useMemo(() =>
    (stats?.trend ?? []).map((t) => ({
      month: SHORT_MONTHS[parseInt(t.month.split('-')[1], 10) - 1],
      Incidents: t.count,
    })),
  [stats]);

  const inputClass   = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white';
  const selectFilter = 'rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <AlertTriangle className="h-6 w-6 text-red-500" /> Incident Log
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track accidents, breakdowns, theft, and other fleet incidents
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <Plus className="h-4 w-4" /> Log Incident
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={AlertTriangle} label="Open Incidents"  value={String(stats?.openCount ?? 0)}
          sub="need attention"
          color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
        <StatCard icon={ShieldOff}    label="Total YTD"        value={String(stats?.yearCount ?? 0)}
          sub="this year"
          color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
        <StatCard icon={Wrench}       label="Repair Cost YTD"  value={fmtR(stats?.repairCost ?? 0)}
          sub={`Est. damage ${fmtR(stats?.damageCost ?? 0)}`}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
        <StatCard icon={Car}          label="Most Affected"
          value={stats?.topVehicles[0]?.vehicle_name ?? '—'}
          sub={stats?.topVehicles[0] ? `${stats.topVehicles[0].count} incident(s)` : undefined}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
      </div>

      {/* Charts */}
      {(stats?.trend.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* 6-month trend */}
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">6-Month Trend</h3>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-slate-700" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="Incidents" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* By type + severity */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">By Type (YTD)</h3>
              <div className="space-y-1.5">
                {(stats?.byType ?? []).map((t) => {
                  const cfg  = TYPE_CONFIG[t.type as IncidentType] ?? TYPE_CONFIG.other;
                  const pctV = stats?.yearCount ? Math.round((t.count / stats.yearCount) * 100) : 0;
                  return (
                    <div key={t.type} className="flex items-center gap-2 text-xs">
                      <span className={clsx('w-20 shrink-0 font-medium', cfg.color)}>{cfg.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-slate-700">
                        <div className="h-2 rounded-full" style={{ width: `${pctV}%`, backgroundColor: cfg.chartColor }} />
                      </div>
                      <span className="w-4 text-right text-gray-500">{t.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">By Severity (YTD)</h3>
              <div className="flex flex-wrap gap-2">
                {(['severe', 'moderate', 'minor'] as IncidentSeverity[]).map((s) => {
                  const cfg   = SEV_CONFIG[s];
                  const entry = stats?.bySeverity.find((b) => b.severity === s);
                  return (
                    <div key={s} className="flex items-center gap-1.5 text-xs">
                      <span className={clsx('h-2.5 w-2.5 rounded-full', cfg.dot)} />
                      <span className={cfg.color}>{cfg.label}</span>
                      <span className="font-bold text-gray-700 dark:text-gray-300">{entry?.count ?? 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {(stats?.topVehicles.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Top Affected Vehicles</h3>
                <div className="space-y-1.5">
                  {stats?.topVehicles.slice(0, 3).map((v) => (
                    <div key={v._id} className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{v.vehicle_name}</p>
                        <p className="text-gray-400">{v.plate_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600 dark:text-red-400">{v.count}×</p>
                        <p className="text-gray-400">{fmtR(v.total_cost)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={vehicleFilter} onChange={(e) => { setVehicleFilter(e.target.value); setPage(1); }} className={selectFilter}>
          <option value="">All Vehicles</option>
          {vehicleOptions?.map((v) => (
            <option key={v._id} value={v._id}>{v.vehicle_name} ({v.plate_number})</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className={selectFilter}>
          <option value="">All Types</option>
          {Object.entries(TYPE_CONFIG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={selectFilter}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
        </select>
      </div>

      {/* Incident list */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-800">
        {isLoading ? (
          <div className="space-y-1 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700" />
            ))}
          </div>
        ) : (list?.data.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="h-10 w-10 text-emerald-300 dark:text-emerald-700" />
            <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">No incidents found</p>
            <p className="mt-1 text-xs text-gray-400">Log an incident if a vehicle has an accident, breakdown, or theft.</p>
            <button onClick={openCreate}
              className="mt-4 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
              <Plus className="h-4 w-4" /> Log First Incident
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-900/40">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Vehicle</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Severity</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Description</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-900 dark:text-white">Cost</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {list?.data.map((inc) => {
                    const typeCfg   = TYPE_CONFIG[inc.type]     ?? TYPE_CONFIG.other;
                    const sevCfg    = SEV_CONFIG[inc.severity]  ?? SEV_CONFIG.minor;
                    const statusCfg = STATUS_CONFIG[inc.status] ?? STATUS_CONFIG.open;
                    return (
                      <tr key={inc._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {new Date(inc.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-white">{inc.vehicle_name}</p>
                          <p className="text-xs text-gray-400">{inc.plate_number}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-semibold', typeCfg.bg, typeCfg.color)}>
                            {typeCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={clsx('h-2 w-2 rounded-full', sevCfg.dot)} />
                            <span className={clsx('text-xs font-medium', sevCfg.color)}>{sevCfg.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-semibold', statusCfg.bg, statusCfg.color)}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="truncate text-sm text-gray-500 dark:text-gray-400">{inc.description}</p>
                          {inc.location && <p className="truncate text-xs text-gray-400">{inc.location}</p>}
                        </td>
                        <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
                          {(inc.repair_cost > 0 || inc.damage_cost > 0) ? (
                            <div>
                              {inc.repair_cost > 0 && (
                                <p className="font-semibold text-gray-900 dark:text-white">{fmtR(inc.repair_cost)}</p>
                              )}
                              {inc.damage_cost > 0 && (
                                <p className="text-xs text-gray-400">est. {fmtR(inc.damage_cost)}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => openEdit(inc)}
                              className="rounded-lg border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { if (confirm('Delete this incident?')) deleteMut.mutate(inc._id); }}
                              className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-red-800/40 dark:hover:bg-red-900/20">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(list?.pages ?? 1) > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-slate-700">
                <span className="text-xs text-gray-400">
                  {list?.total} total · page {list?.page} of {list?.pages}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-slate-700">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(list?.pages ?? 1, p + 1))} disabled={page === (list?.pages ?? 1)}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-slate-700">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editing ? 'Edit Incident' : 'Log Incident'} size="lg">
        <form onSubmit={handleSave} className="flex flex-col gap-4">

          {/* Vehicle + Driver row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Vehicle</label>
              <select required value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} className={inputClass}>
                <option value="">Select vehicle…</option>
                {vehicleOptions?.map((v) => (
                  <option key={v._id} value={v._id}>{v.vehicle_name} — {v.plate_number}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Driver Name <span className="text-gray-400">(optional)</span>
              </label>
              <input type="text" placeholder="Driver at time of incident"
                value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                className={inputClass} />
            </div>
          </div>

          {/* Date + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Date</label>
              <input required type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as IncidentType })} className={inputClass}>
                {Object.entries(TYPE_CONFIG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
              </select>
            </div>
          </div>

          {/* Severity + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Severity</label>
              <div className="flex gap-2">
                {(['minor', 'moderate', 'severe'] as IncidentSeverity[]).map((s) => {
                  const cfg = SEV_CONFIG[s];
                  return (
                    <label key={s} className={clsx(
                      'flex-1 flex items-center justify-center gap-1 cursor-pointer rounded-lg border py-2 text-xs font-medium transition-colors',
                      form.severity === s
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-600 dark:text-gray-400',
                    )}>
                      <input type="radio" name="severity" value={s} checked={form.severity === s}
                        onChange={() => setForm({ ...form, severity: s })} className="sr-only" />
                      <span className={clsx('h-2 w-2 rounded-full', cfg.dot)} />
                      {cfg.label}
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as IncidentStatus })} className={inputClass}>
                {Object.entries(STATUS_CONFIG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
            <textarea required rows={2} placeholder="Describe what happened…"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={clsx(inputClass, 'resize-none')} />
          </div>

          {/* Location */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Location <span className="text-gray-400">(optional)</span>
            </label>
            <input type="text" placeholder="e.g. Jl. Sudirman, Jakarta"
              value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className={inputClass} />
          </div>

          {/* Cost row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Est. Damage Cost <span className="text-gray-400">(IDR)</span>
              </label>
              <input type="number" min="0" step="1000" placeholder="0"
                value={form.damage_cost} onChange={(e) => setForm({ ...form, damage_cost: e.target.value })}
                className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Actual Repair Cost <span className="text-gray-400">(IDR)</span>
              </label>
              <input type="number" min="0" step="1000" placeholder="0"
                value={form.repair_cost} onChange={(e) => setForm({ ...form, repair_cost: e.target.value })}
                className={inputClass} />
            </div>
          </div>

          {/* Insurance claim ref */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Insurance Claim Ref <span className="text-gray-400">(optional)</span>
            </label>
            <input type="text" placeholder="e.g. CLM-2025-001234"
              value={form.insurance_claim_ref} onChange={(e) => setForm({ ...form, insurance_claim_ref: e.target.value })}
              className={inputClass} />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-3 dark:border-slate-700">
            <button type="button" onClick={() => setShowModal(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button type="submit" disabled={createMut.isPending || updateMut.isPending}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {(createMut.isPending || updateMut.isPending) && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {editing ? 'Save Changes' : 'Log Incident'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
