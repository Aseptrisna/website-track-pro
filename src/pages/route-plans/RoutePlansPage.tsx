import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPinned, Plus, Edit2, Trash2, ChevronDown,
  ChevronLeft, ChevronRight, Car, UserRound,
  CalendarDays, Clock, CheckCircle2, XCircle,
  ArrowRight, Navigation, Milestone,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
type PlanStatus = 'planned' | 'in-progress' | 'completed' | 'cancelled';

interface RoutePlan {
  _id:                    string;
  name:                   string;
  vehicle:                string;
  vehicle_name:           string;
  plate_number:           string;
  driver:                 string | null;
  driver_name:            string;
  planned_date:           string;
  origin:                 string;
  destination:            string;
  waypoints:              string[];
  estimated_distance_km:  number;
  estimated_duration_min: number;
  notes:                  string;
  status:                 PlanStatus;
  completed_at:           string | null;
  createdAt:              string;
}

interface PlanStats {
  today:      number;
  thisWeek:   number;
  active:     number;
  completion: number;
  total:      number;
}

interface VehicleOption { _id: string; vehicle_name: string; plate_number: string }
interface DriverOption  { _id: string; name: string }

interface FormState {
  name:                   string;
  vehicleId:              string;
  driverId:               string;
  planned_date:           string;
  origin:                 string;
  destination:            string;
  waypoints:              string;   // newline-separated
  estimated_distance_km:  string;
  estimated_duration_min: string;
  notes:                  string;
  status:                 PlanStatus;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PlanStatus, {
  label: string; bg: string; text: string; icon: typeof CheckCircle2; dot: string;
}> = {
  'planned':     { label: 'Planned',     bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-400',    icon: CalendarDays,  dot: 'bg-blue-400'    },
  'in-progress': { label: 'In Progress', bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-700 dark:text-amber-400',  icon: Navigation,    dot: 'bg-amber-400'   },
  'completed':   { label: 'Completed',   bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle2, dot: 'bg-emerald-400' },
  'cancelled':   { label: 'Cancelled',   bg: 'bg-gray-100 dark:bg-slate-700',      text: 'text-gray-500 dark:text-gray-400',    icon: XCircle,       dot: 'bg-gray-400'    },
};

const STATUS_FLOW: Record<PlanStatus, PlanStatus | null> = {
  'planned':     'in-progress',
  'in-progress': 'completed',
  'completed':   null,
  'cancelled':   null,
};

const BLANK: FormState = {
  name: '', vehicleId: '', driverId: '', planned_date: new Date().toISOString().split('T')[0],
  origin: '', destination: '', waypoints: '', estimated_distance_km: '',
  estimated_duration_min: '', notes: '', status: 'planned',
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDur(min: number) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof MapPinned; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className={clsx('rounded-lg p-2 shrink-0', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Route Plan Card ─────────────────────────────────────────────────────────
function PlanCard({
  plan, onEdit, onDelete, onAdvance,
}: {
  plan: RoutePlan;
  onEdit:    (p: RoutePlan) => void;
  onDelete:  (p: RoutePlan) => void;
  onAdvance: (p: RoutePlan) => void;
}) {
  const sc   = STATUS_CONFIG[plan.status];
  const StatusIcon = sc.icon;
  const next = STATUS_FLOW[plan.status];

  return (
    <div className={clsx(
      'rounded-xl border bg-white dark:bg-slate-800 overflow-hidden transition-shadow hover:shadow-md',
      plan.status === 'cancelled'
        ? 'border-gray-200 dark:border-slate-700 opacity-60'
        : 'border-gray-200 dark:border-slate-700',
    )}>
      {/* Status bar */}
      <div className={clsx('h-1', sc.dot)} />

      <div className="p-4 space-y-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 dark:text-white truncate">{plan.name}</p>
            <p className="text-xs text-gray-400">{fmtDate(plan.planned_date)}</p>
          </div>
          <span className={clsx('flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0', sc.bg, sc.text)}>
            <StatusIcon className="h-3 w-3" />
            {sc.label}
          </span>
        </div>

        {/* Route */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          </div>
          <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{plan.origin}</span>
        </div>

        {/* Waypoints */}
        {plan.waypoints.length > 0 && (
          <div className="ml-2.5 border-l-2 border-dashed border-gray-200 dark:border-slate-600 pl-4 space-y-1">
            {plan.waypoints.map((wp, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                <Milestone className="h-3 w-3 shrink-0" />
                <span className="truncate">{wp}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          </div>
          <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{plan.destination}</span>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 pt-2 dark:border-slate-700">
          <span className="flex items-center gap-1">
            <Car className="h-3.5 w-3.5" /> {plan.vehicle_name} · {plan.plate_number}
          </span>
          {plan.driver_name && (
            <span className="flex items-center gap-1">
              <UserRound className="h-3.5 w-3.5" /> {plan.driver_name}
            </span>
          )}
          {plan.estimated_distance_km > 0 && (
            <span className="flex items-center gap-1">
              <ArrowRight className="h-3.5 w-3.5" /> {plan.estimated_distance_km} km
            </span>
          )}
          {plan.estimated_duration_min > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {fmtDur(plan.estimated_duration_min)}
            </span>
          )}
        </div>

        {plan.notes && (
          <p className="text-xs text-gray-400 italic truncate">{plan.notes}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-gray-100 pt-2 dark:border-slate-700">
          {/* Advance status button */}
          {next && (
            <button
              onClick={() => onAdvance(plan)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors',
                next === 'in-progress'
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
              )}
            >
              {STATUS_CONFIG[next].icon && (() => {
                const NIcon = STATUS_CONFIG[next].icon;
                return <NIcon className="h-3.5 w-3.5" />;
              })()}
              Mark {STATUS_CONFIG[next].label}
            </button>
          )}
          <button onClick={() => onEdit(plan)}
            className="rounded-lg border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(plan)}
            className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-red-800/40 dark:hover:bg-red-900/20">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RoutePlansPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<RoutePlan | null>(null);
  const [form,      setForm]      = useState<FormState>(BLANK);

  const [statusFilter,  setStatusFilter]  = useState<PlanStatus | 'all'>('all');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [page,          setPage]          = useState(1);

  const { data: vehicleOptions } = useQuery<VehicleOption[]>({
    queryKey: ['vehicles-options'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  const { data: driverOptions } = useQuery<DriverOption[]>({
    queryKey: ['drivers-options'],
    queryFn: async () => {
      const { data } = await api.get('/drivers', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  const { data: stats } = useQuery<PlanStats>({
    queryKey: ['route-plan-stats'],
    queryFn: async () => { const { data } = await api.get('/route-plans/stats'); return data; },
  });

  const listParams: Record<string, any> = { page, limit: 24 };
  if (statusFilter !== 'all') listParams.status    = statusFilter;
  if (vehicleFilter)          listParams.vehicleId = vehicleFilter;

  const { data: list, isLoading } = useQuery<{
    data: RoutePlan[]; total: number; page: number; pages: number;
  }>({
    queryKey: ['route-plans', statusFilter, vehicleFilter, page],
    queryFn: async () => { const { data } = await api.get('/route-plans', { params: listParams }); return data; },
    placeholderData: (prev) => prev,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['route-plans'] });
    qc.invalidateQueries({ queryKey: ['route-plan-stats'] });
  };

  const createMut = useMutation({
    mutationFn: (dto: any) => api.post('/route-plans', dto),
    onSuccess: () => { toast.success('Route plan created'); invalidate(); setShowModal(false); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => api.put(`/route-plans/${id}`, dto),
    onSuccess: () => { toast.success('Updated'); invalidate(); setShowModal(false); },
    onError: () => toast.error('Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/route-plans/${id}`),
    onSuccess: () => { toast.success('Deleted'); invalidate(); },
    onError: () => toast.error('Failed to delete'),
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openCreate = () => { setEditing(null); setForm(BLANK); setShowModal(true); };
  const openEdit   = (p: RoutePlan) => {
    setEditing(p);
    setForm({
      name:                   p.name,
      vehicleId:              p.vehicle,
      driverId:               p.driver ?? '',
      planned_date:           p.planned_date.split('T')[0],
      origin:                 p.origin,
      destination:            p.destination,
      waypoints:              p.waypoints.join('\n'),
      estimated_distance_km:  p.estimated_distance_km ? String(p.estimated_distance_km) : '',
      estimated_duration_min: p.estimated_duration_min ? String(p.estimated_duration_min) : '',
      notes:                  p.notes,
      status:                 p.status,
    });
    setShowModal(true);
  };

  const handleSave = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.vehicleId) { toast.error('Select a vehicle'); return; }
    if (!form.origin || !form.destination) { toast.error('Origin and destination are required'); return; }

    const dto = {
      name:                   form.name,
      vehicleId:              form.vehicleId,
      driverId:               form.driverId || null,
      planned_date:           form.planned_date,
      origin:                 form.origin,
      destination:            form.destination,
      waypoints:              form.waypoints.split('\n').map((s) => s.trim()).filter(Boolean),
      estimated_distance_km:  Number(form.estimated_distance_km) || 0,
      estimated_duration_min: Number(form.estimated_duration_min) || 0,
      notes:                  form.notes,
      status:                 form.status,
    };

    if (editing) updateMut.mutate({ id: editing._id, dto });
    else         createMut.mutate(dto);
  };

  const handleAdvance = (p: RoutePlan) => {
    const next = STATUS_FLOW[p.status];
    if (!next) return;
    updateMut.mutate({ id: p._id, dto: { status: next } });
  };

  const handleDelete = (p: RoutePlan) => {
    if (confirm(`Delete route plan "${p.name}"?`)) deleteMut.mutate(p._id);
  };

  // Group plans by date for display
  const groupedPlans = useMemo(() => {
    const groups = new Map<string, RoutePlan[]>();
    for (const plan of list?.data ?? []) {
      const dateKey = plan.planned_date.split('T')[0];
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(plan);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [list]);

  const inputClass    = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white';
  const selectFilter  = 'rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <MapPinned className="h-6 w-6 text-emerald-600" /> Route Plans
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Plan and dispatch trips before vehicles depart
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> New Route Plan
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={CalendarDays} label="Today's Plans"   value={String(stats?.today ?? 0)}
          sub="planned / in-progress"
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard icon={MapPinned}    label="This Week"        value={String(stats?.thisWeek ?? 0)}
          sub="next 7 days"
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard icon={Navigation}   label="Active Now"       value={String(stats?.active ?? 0)}
          sub="in-progress"
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        <StatCard icon={CheckCircle2} label="Completion Rate"  value={`${stats?.completion ?? 0}%`}
          sub={`${stats?.total ?? 0} plans total`}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Status tabs */}
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-800">
          {(['all', 'planned', 'in-progress', 'completed', 'cancelled'] as const).map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={clsx(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                statusFilter === s
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400',
              )}>
              {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>

        <select value={vehicleFilter} onChange={(e) => { setVehicleFilter(e.target.value); setPage(1); }} className={selectFilter}>
          <option value="">All Vehicles</option>
          {vehicleOptions?.map((v) => (
            <option key={v._id} value={v._id}>{v.vehicle_name} ({v.plate_number})</option>
          ))}
        </select>
      </div>

      {/* Plans grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-700" />
          ))}
        </div>
      ) : (list?.data.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-20 dark:border-slate-600 dark:bg-slate-800/50">
          <MapPinned className="h-10 w-10 text-gray-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">No route plans found</p>
          <p className="mt-1 text-xs text-gray-400">Create a route plan to dispatch vehicles before they depart.</p>
          <button onClick={openCreate}
            className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <Plus className="h-4 w-4" /> Create First Plan
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedPlans.map(([dateKey, plans]) => (
            <div key={dateKey}>
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {fmtDate(dateKey)}
                </h3>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-slate-700 dark:text-gray-400">
                  {plans.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((p) => (
                  <PlanCard key={p._id} plan={p}
                    onEdit={openEdit} onDelete={handleDelete} onAdvance={handleAdvance} />
                ))}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {(list?.pages ?? 1) > 1 && (
            <div className="flex items-center justify-between">
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
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editing ? 'Edit Route Plan' : 'New Route Plan'} size="lg">
        <form onSubmit={handleSave} className="flex flex-col gap-4">

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Plan Name</label>
            <input required type="text" placeholder="e.g. Delivery Run Jakarta → Bandung"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass} />
          </div>

          {/* Vehicle + Driver */}
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
                Driver <span className="text-gray-400">(optional)</span>
              </label>
              <select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })} className={inputClass}>
                <option value="">Unassigned</option>
                {driverOptions?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          {/* Date + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Planned Date</label>
              <input required type="date" value={form.planned_date}
                onChange={(e) => setForm({ ...form, planned_date: e.target.value })}
                className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PlanStatus })} className={inputClass}>
                {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                  <option key={k} value={k}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Origin + Destination */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-500 mr-1" />
                Origin
              </label>
              <input required type="text" placeholder="Departure location"
                value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })}
                className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 mr-1" />
                Destination
              </label>
              <input required type="text" placeholder="Arrival location"
                value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className={inputClass} />
            </div>
          </div>

          {/* Waypoints */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Waypoints <span className="text-gray-400">(one per line, optional)</span>
            </label>
            <textarea rows={2} placeholder={"Stop 1 — Bekasi\nStop 2 — Karawang"}
              value={form.waypoints} onChange={(e) => setForm({ ...form, waypoints: e.target.value })}
              className={clsx(inputClass, 'resize-none')} />
          </div>

          {/* Distance + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Est. Distance <span className="text-gray-400">(km)</span>
              </label>
              <input type="number" min="0" placeholder="0"
                value={form.estimated_distance_km}
                onChange={(e) => setForm({ ...form, estimated_distance_km: e.target.value })}
                className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Est. Duration <span className="text-gray-400">(minutes)</span>
              </label>
              <input type="number" min="0" placeholder="0"
                value={form.estimated_duration_min}
                onChange={(e) => setForm({ ...form, estimated_duration_min: e.target.value })}
                className={inputClass} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Notes <span className="text-gray-400">(optional)</span>
            </label>
            <input type="text" placeholder="e.g. Pick up at Gudang A, deliver to Client B"
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={inputClass} />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-3 dark:border-slate-700">
            <button type="button" onClick={() => setShowModal(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button type="submit" disabled={createMut.isPending || updateMut.isPending}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {(createMut.isPending || updateMut.isPending) && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {editing ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
