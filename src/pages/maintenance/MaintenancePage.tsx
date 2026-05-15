import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench, Plus, Pencil, Trash2, Download, X,
  DollarSign, ClipboardCheck, Car, TrendingUp,
  ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
type MaintenanceType =
  | 'routine_service' | 'oil_change' | 'tire_change' | 'brake_service'
  | 'engine_repair'   | 'electrical' | 'body_repair' | 'ac_service' | 'other';

interface VehicleOption {
  _id: string;
  vehicle_name: string;
  plate_number: string;
}

interface MaintenanceRecord {
  _id: string;
  vehicle: { _id: string; vehicle_name: string; plate_number: string };
  date: string;
  type: MaintenanceType;
  description: string;
  cost: number;
  workshop?: string;
  odometer_at_service?: number;
  notes?: string;
}

interface MaintenanceStats {
  totalCost: number;
  totalRecords: number;
  avgCost: number;
  monthlyTrend: { month: string; totalCost: number; count: number }[];
  byType: { type: string; totalCost: number; count: number }[];
  byVehicle: { vehicleName: string; plateNumber: string; totalCost: number; count: number; lastDate: string }[];
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<MaintenanceType, string> = {
  routine_service: 'Routine Service',
  oil_change:      'Oil Change',
  tire_change:     'Tire Change',
  brake_service:   'Brake Service',
  engine_repair:   'Engine Repair',
  electrical:      'Electrical',
  body_repair:     'Body Repair',
  ac_service:      'AC Service',
  other:           'Other',
};

const TYPE_COLORS: Record<MaintenanceType, string> = {
  routine_service: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  oil_change:      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  tire_change:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  brake_service:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  engine_repair:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  electrical:      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  body_repair:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ac_service:      'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  other:           'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-400',
};

const ALL_TYPES = Object.keys(TYPE_LABELS) as MaintenanceType[];

const emptyForm = {
  vehicle:            '',
  date:               new Date().toISOString().slice(0, 10),
  type:               'routine_service' as MaintenanceType,
  description:        '',
  cost:               '',
  workshop:           '',
  odometer_at_service: '',
  notes:              '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtR = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmt  = (n: number) => n.toLocaleString('id-ID');

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Wrench; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className={clsx('rounded-lg p-2 shrink-0', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const queryClient = useQueryClient();
  const [page, setPage]                 = useState(1);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [form, setForm]                 = useState(emptyForm);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: vehicleOptions } = useQuery<VehicleOption[]>({
    queryKey: ['vehicles-options'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  const recordParams: Record<string, any> = { page, limit: 15 };
  if (vehicleFilter) recordParams.vehicleId = vehicleFilter;
  if (typeFilter)    recordParams.type      = typeFilter;

  const { data: recordsData, isLoading } = useQuery<{
    data: MaintenanceRecord[]; total: number; totalPages: number;
  }>({
    queryKey: ['maintenance', page, vehicleFilter, typeFilter],
    queryFn: async () => {
      const { data } = await api.get('/maintenance', { params: recordParams });
      return data;
    },
    placeholderData: (prev) => prev,
  });

  const statsParams: Record<string, any> = {};
  if (vehicleFilter) statsParams.vehicleId = vehicleFilter;

  const { data: stats } = useQuery<MaintenanceStats>({
    queryKey: ['maintenance-stats', vehicleFilter],
    queryFn: async () => {
      const { data } = await api.get('/maintenance/stats', { params: statsParams });
      return data;
    },
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] }); // last_service_date updated
  };

  const saveMutation = useMutation({
    mutationFn: (values: typeof form) => {
      const payload = {
        vehicle:             values.vehicle,
        date:                values.date,
        type:                values.type,
        description:         values.description,
        cost:                values.cost ? parseFloat(values.cost) : 0,
        workshop:            values.workshop || undefined,
        odometer_at_service: values.odometer_at_service ? parseFloat(values.odometer_at_service) : undefined,
        notes:               values.notes || undefined,
      };
      return editId
        ? api.put(`/maintenance/${editId}`, payload)
        : api.post('/maintenance', payload);
    },
    onSuccess: () => {
      toast.success(editId ? 'Record updated' : 'Maintenance record added');
      invalidate();
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/maintenance/${id}`),
    onSuccess: () => { toast.success('Record deleted'); invalidate(); setDeleteId(null); },
    onError: () => toast.error('Failed to delete'),
  });

  // ── Handlers ────────────────────────────────────────────────────────────
  const closeModal = () => { setModalOpen(false); setEditId(null); setForm(emptyForm); };

  const openEdit = (r: MaintenanceRecord) => {
    setEditId(r._id);
    setForm({
      vehicle:             r.vehicle._id,
      date:                r.date.slice(0, 10),
      type:                r.type,
      description:         r.description,
      cost:                r.cost != null ? String(r.cost) : '',
      workshop:            r.workshop ?? '',
      odometer_at_service: r.odometer_at_service != null ? String(r.odometer_at_service) : '',
      notes:               r.notes ?? '',
    });
    setModalOpen(true);
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['Date', 'Vehicle', 'Plate', 'Type', 'Description', 'Cost (IDR)', 'Odometer (km)', 'Workshop', 'Notes'],
      ...(recordsData?.data ?? []).map((r) => [
        r.date.slice(0, 10),
        r.vehicle.vehicle_name,
        r.vehicle.plate_number,
        TYPE_LABELS[r.type] ?? r.type,
        r.description,
        r.cost,
        r.odometer_at_service ?? '',
        r.workshop ?? '',
        r.notes ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'maintenance.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const records    = recordsData?.data ?? [];
  const totalPages = recordsData?.totalPages ?? 1;

  const chartData = useMemo(() =>
    (stats?.monthlyTrend ?? []).map(({ month, totalCost }) => ({
      month,
      'Cost (K IDR)': Math.round(totalCost / 1000),
    })),
  [stats]);

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maintenance Records</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track completed service work and maintenance costs
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <Plus className="h-4 w-4" /> Add Record
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Car className="h-4 w-4 text-gray-400 shrink-0" />
        <button
          onClick={() => { setVehicleFilter(''); setPage(1); }}
          className={clsx('rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            !vehicleFilter ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300')}>
          All Vehicles
        </button>
        {vehicleOptions?.map((v) => (
          <button key={v._id} onClick={() => { setVehicleFilter(v._id); setPage(1); }}
            className={clsx('rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              vehicleFilter === v._id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300')}>
            {v.vehicle_name}
          </button>
        ))}
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-gray-400 shrink-0" />
        <button onClick={() => { setTypeFilter(''); setPage(1); }}
          className={clsx('rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            !typeFilter ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300')}>
          All Types
        </button>
        {ALL_TYPES.map((t) => (
          <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
            className={clsx('rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              typeFilter === t ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300')}>
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={DollarSign}    label="Total Cost"    value={fmtR(stats?.totalCost ?? 0)}    sub="all time"          color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
        <StatCard icon={ClipboardCheck} label="Total Records" value={String(stats?.totalRecords ?? 0)} sub="maintenance events" color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard icon={TrendingUp}    label="Avg Cost"      value={fmtR(stats?.avgCost ?? 0)}      sub="per record"        color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        <StatCard icon={Wrench}        label="Most Common"   value={stats?.byType?.[0] ? TYPE_LABELS[stats.byType[0].type as MaintenanceType] ?? stats.byType[0].type : '—'} sub={stats?.byType?.[0] ? `${stats.byType[0].count} times` : ''} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
      </div>

      {/* Chart + by-vehicle */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Monthly cost chart */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Monthly Maintenance Cost (last 6 months)</h3>
          {chartData.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-slate-700" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v) => [`Rp ${((v as number) * 1000).toLocaleString('id-ID')}`, 'Cost']}
                />
                <Bar dataKey="Cost (K IDR)" fill="#f97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top vehicles by maintenance cost */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Top Vehicles by Cost</h3>
          {!stats?.byVehicle?.length ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">No data yet</div>
          ) : (
            <ul className="space-y-3">
              {stats.byVehicle.slice(0, 5).map((v) => {
                const pct = stats.totalCost > 0 ? (v.totalCost / stats.totalCost) * 100 : 0;
                return (
                  <li key={v.plateNumber}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-900 dark:text-white truncate max-w-[68%]">
                        {v.vehicleName}
                        <span className="ml-1 text-gray-400">({v.plateNumber})</span>
                      </span>
                      <span className="text-gray-500 shrink-0">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700">
                      <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {v.count} records · {fmtR(v.totalCost)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Records table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-gray-100 px-4 py-3 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Service History</h3>
        </div>

        {isLoading ? (
          <div className="space-y-1 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Wrench className="h-8 w-8 text-gray-300 dark:text-slate-600" />
            <p className="mt-2 text-sm text-gray-400">No maintenance records yet.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-900/40">
                    {['Date', 'Vehicle', 'Type', 'Description', 'Cost', 'Odometer', 'Workshop', ''].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {records.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {new Date(r.date).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{r.vehicle.vehicle_name}</p>
                        <p className="text-xs text-gray-400">{r.vehicle.plate_number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold', TYPE_COLORS[r.type])}>
                          {TYPE_LABELS[r.type] ?? r.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[200px] truncate" title={r.description}>
                        {r.description}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        {fmtR(r.cost)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                        {r.odometer_at_service != null ? `${fmt(r.odometer_at_service)} km` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[120px] truncate">
                        {r.workshop ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(r)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteId(r._id)}
                            className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-slate-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Page {page} of {totalPages} · {recordsData?.total} records
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="rounded-lg border p-1.5 text-gray-500 disabled:opacity-40 dark:border-slate-600">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="rounded-lg border p-1.5 text-gray-500 disabled:opacity-40 dark:border-slate-600">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editId ? 'Edit Record' : 'Add Maintenance Record'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4 p-5">

              {/* Vehicle + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle *</label>
                  <select required value={form.vehicle}
                    onChange={(e) => setForm({ ...form, vehicle: e.target.value })} className={inputClass}>
                    <option value="">— Select —</option>
                    {vehicleOptions?.map((v) => (
                      <option key={v._id} value={v._id}>{v.vehicle_name} ({v.plate_number})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Date *</label>
                  <input type="date" required value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Maintenance Type *</label>
                <select required value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as MaintenanceType })} className={inputClass}>
                  {ALL_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description *</label>
                <input type="text" required placeholder="e.g. Full service 10,000 km, oil filter change"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
              </div>

              {/* Cost + Odometer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Cost (IDR)</label>
                  <input type="number" min="0" step="1000" placeholder="e.g. 350000"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Odometer (km)</label>
                  <input type="number" min="0" step="1" placeholder="e.g. 25000"
                    value={form.odometer_at_service}
                    onChange={(e) => setForm({ ...form, odometer_at_service: e.target.value })} className={inputClass} />
                </div>
              </div>

              {/* Workshop */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Workshop / Mechanic</label>
                <input type="text" placeholder="e.g. Bengkel Maju Jaya"
                  value={form.workshop}
                  onChange={(e) => setForm({ ...form, workshop: e.target.value })} className={inputClass} />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea rows={2} placeholder="Additional notes…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
              </div>

              {!editId && (
                <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  Saving this record will automatically update the vehicle's last service date and odometer.
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
                  Cancel
                </button>
                <button type="submit" disabled={saveMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  {saveMutation.isPending && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  {editId ? 'Update' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Maintenance Record"
        message="Are you sure you want to delete this maintenance record?"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
