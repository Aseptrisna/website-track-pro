import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Fuel, Plus, Pencil, Trash2, Download,
  Droplets, DollarSign, TrendingUp, Car,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface VehicleOption {
  _id: string;
  vehicle_name: string;
  plate_number: string;
}

interface FuelLog {
  _id: string;
  vehicle: { _id: string; vehicle_name: string; plate_number: string };
  date: string;
  liters: number;
  cost_per_liter: number;
  odometer_at_fill?: number;
  station_name?: string;
  notes?: string;
  createdAt: string;
}

interface FuelStats {
  totalLiters: number;
  totalCost: number;
  totalFills: number;
  avgCostPerL: number;
  monthlyTrend: { month: string; totalLiters: number; totalCost: number }[];
  byVehicle: { vehicleName: string; plateNumber: string; totalLiters: number; totalCost: number; totalFills: number }[];
}

const emptyForm = {
  vehicle: '',
  date: new Date().toISOString().slice(0, 10),
  liters: '',
  cost_per_liter: '',
  odometer_at_fill: '',
  station_name: '',
  notes: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = (n: number) => n.toLocaleString('id-ID');
const fmtR = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Fuel; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className={clsx('rounded-lg p-2 shrink-0', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FuelPage() {
  const queryClient = useQueryClient();
  const [page, setPage]           = useState(1);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [form, setForm]           = useState(emptyForm);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: vehicleOptions } = useQuery<VehicleOption[]>({
    queryKey: ['vehicles-options'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  const logsParams: Record<string, any> = { page, limit: 15 };
  if (vehicleFilter) logsParams.vehicleId = vehicleFilter;

  const { data: logsData, isLoading: logsLoading } = useQuery<{
    data: FuelLog[]; total: number; totalPages: number;
  }>({
    queryKey: ['fuel-logs', page, vehicleFilter],
    queryFn: async () => {
      const { data } = await api.get('/fuel-logs', { params: logsParams });
      return data;
    },
    placeholderData: (prev) => prev,
  });

  const statsParams: Record<string, any> = {};
  if (vehicleFilter) statsParams.vehicleId = vehicleFilter;

  const { data: stats } = useQuery<FuelStats>({
    queryKey: ['fuel-stats', vehicleFilter],
    queryFn: async () => {
      const { data } = await api.get('/fuel-logs/stats', { params: statsParams });
      return data;
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['fuel-logs'] });
    queryClient.invalidateQueries({ queryKey: ['fuel-stats'] });
  };

  const saveMutation = useMutation({
    mutationFn: (values: typeof form) => {
      const payload = {
        vehicle:        values.vehicle,
        date:           values.date,
        liters:         parseFloat(values.liters),
        cost_per_liter: parseFloat(values.cost_per_liter),
        odometer_at_fill: values.odometer_at_fill ? parseFloat(values.odometer_at_fill) : undefined,
        station_name:   values.station_name || undefined,
        notes:          values.notes || undefined,
      };
      return editId ? api.put(`/fuel-logs/${editId}`, payload) : api.post('/fuel-logs', payload);
    },
    onSuccess: () => {
      toast.success(editId ? 'Fuel log updated' : 'Fuel log added');
      invalidate();
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/fuel-logs/${id}`),
    onSuccess: () => { toast.success('Fuel log deleted'); invalidate(); setDeleteId(null); },
    onError: () => toast.error('Failed to delete'),
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const closeModal = () => { setModalOpen(false); setEditId(null); setForm(emptyForm); };

  const openEdit = (log: FuelLog) => {
    setEditId(log._id);
    setForm({
      vehicle:          log.vehicle._id,
      date:             log.date.slice(0, 10),
      liters:           String(log.liters),
      cost_per_liter:   String(log.cost_per_liter),
      odometer_at_fill: log.odometer_at_fill != null ? String(log.odometer_at_fill) : '',
      station_name:     log.station_name ?? '',
      notes:            log.notes ?? '',
    });
    setModalOpen(true);
  };

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const logs = logsData?.data ?? [];
    const rows = [
      ['Date', 'Vehicle', 'Plate', 'Liters', 'Cost/L (IDR)', 'Total (IDR)', 'Odometer (km)', 'Station', 'Notes'],
      ...logs.map((l) => [
        l.date.slice(0, 10),
        l.vehicle.vehicle_name,
        l.vehicle.plate_number,
        l.liters,
        l.cost_per_liter,
        Math.round(l.liters * l.cost_per_liter),
        l.odometer_at_fill ?? '',
        l.station_name ?? '',
        l.notes ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fuel-logs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const logs      = logsData?.data ?? [];
  const totalPages = logsData?.totalPages ?? 1;

  const chartData = useMemo(() => {
    if (!stats?.monthlyTrend) return [];
    return stats.monthlyTrend.map(({ month, totalCost, totalLiters }) => ({
      month,
      'Cost (K IDR)': Math.round(totalCost / 1000),
      'Liters': Math.round(totalLiters),
    }));
  }, [stats]);

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fuel Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track fuel consumption and costs across your fleet
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Add Fill-up
          </button>
        </div>
      </div>

      {/* Vehicle filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Car className="h-4 w-4 text-gray-400 shrink-0" />
        <button
          onClick={() => { setVehicleFilter(''); setPage(1); }}
          className={clsx(
            'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            !vehicleFilter
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300',
          )}
        >
          All Vehicles
        </button>
        {vehicleOptions?.map((v) => (
          <button
            key={v._id}
            onClick={() => { setVehicleFilter(v._id); setPage(1); }}
            className={clsx(
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              vehicleFilter === v._id
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300',
            )}
          >
            {v.vehicle_name}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Droplets}    label="Total Liters"    value={`${fmt(stats?.totalLiters ?? 0)} L`}  sub={`${stats?.totalFills ?? 0} fill-ups`}          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard icon={DollarSign}  label="Total Cost"      value={fmtR(stats?.totalCost ?? 0)}           sub="all time"                                       color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard icon={TrendingUp}  label="Avg Price / L"   value={fmtR(stats?.avgCostPerL ?? 0)}         sub="per liter"                                      color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        <StatCard icon={Fuel}        label="Avg per Fill-up" value={stats?.totalFills ? `${fmt(Math.round((stats.totalLiters ?? 0) / stats.totalFills))} L` : '—'} sub="average volume" color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
      </div>

      {/* Chart + by-vehicle breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Monthly cost trend */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Monthly Trend (last 6 months)</h3>
          {chartData.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-slate-700" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, backgroundColor: 'var(--tw-bg-opacity,1)', border: '1px solid #e5e7eb' }}
                  formatter={(v, n) => [n === 'Liters' ? `${v} L` : `Rp ${((v as number) * 1000).toLocaleString('id-ID')}`, n as string]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Cost (K IDR)" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Liters"       fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By vehicle */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Top Vehicles by Cost</h3>
          {!stats?.byVehicle?.length ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">No data yet</div>
          ) : (
            <ul className="space-y-2">
              {stats.byVehicle.slice(0, 5).map((v) => {
                const pct = stats.totalCost > 0 ? (v.totalCost / stats.totalCost) * 100 : 0;
                return (
                  <li key={v.plateNumber}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-900 dark:text-white truncate max-w-[70%]">
                        {v.vehicleName} <span className="text-gray-400">({v.plateNumber})</span>
                      </span>
                      <span className="text-gray-500 shrink-0">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {fmt(Math.round(v.totalLiters))} L · {fmtR(Math.round(v.totalCost))}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Fuel log table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-gray-100 px-4 py-3 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Fill-up History</h3>
        </div>

        {logsLoading ? (
          <div className="space-y-1 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10">
            <Fuel className="h-8 w-8 text-gray-300 dark:text-slate-600" />
            <p className="mt-2 text-sm text-gray-400">No fuel logs yet. Add the first fill-up.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-900/40">
                    {['Date', 'Vehicle', 'Liters', 'Cost/L', 'Total Cost', 'Odometer', 'Station', ''].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {new Date(log.date).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-white">{log.vehicle.vehicle_name}</span>
                        <br />
                        <span className="text-xs text-gray-400">{log.vehicle.plate_number}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {log.liters.toLocaleString('id-ID', { maximumFractionDigits: 2 })} L
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {fmtR(log.cost_per_liter)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                        {fmtR(Math.round(log.liters * log.cost_per_liter))}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                        {log.odometer_at_fill != null ? `${fmt(log.odometer_at_fill)} km` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[120px] truncate">
                        {log.station_name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(log)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(log._id)}
                            className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-slate-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Page {page} of {totalPages} · {logsData?.total} entries
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="rounded-lg border p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-700">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="rounded-lg border p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-700">
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
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editId ? 'Edit Fill-up' : 'Add Fill-up'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}
              className="space-y-4 p-5"
            >
              {/* Vehicle */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle *</label>
                <select
                  required
                  value={form.vehicle}
                  onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                  className={inputClass}
                >
                  <option value="">— Select vehicle —</option>
                  {vehicleOptions?.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.vehicle_name} ({v.plate_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Date *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={inputClass}
                />
              </div>

              {/* Liters + Cost per liter */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Liters *</label>
                  <input
                    type="number" required min="0.1" step="0.01"
                    placeholder="e.g. 40"
                    value={form.liters}
                    onChange={(e) => setForm({ ...form, liters: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Price/L (IDR) *</label>
                  <input
                    type="number" required min="0" step="1"
                    placeholder="e.g. 10000"
                    value={form.cost_per_liter}
                    onChange={(e) => setForm({ ...form, cost_per_liter: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Total cost preview */}
              {form.liters && form.cost_per_liter && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-900/20">
                  <span className="text-gray-500 dark:text-gray-400">Total: </span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {fmtR(Math.round(parseFloat(form.liters) * parseFloat(form.cost_per_liter)))}
                  </span>
                </div>
              )}

              {/* Odometer + Station */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Odometer (km)</label>
                  <input
                    type="number" min="0" step="1"
                    placeholder="e.g. 25000"
                    value={form.odometer_at_fill}
                    onChange={(e) => setForm({ ...form, odometer_at_fill: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Station</label>
                  <input
                    type="text"
                    placeholder="e.g. Pertamina Jl. Sudirman"
                    value={form.station_name}
                    onChange={(e) => setForm({ ...form, station_name: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={inputClass}
                  placeholder="Optional notes…"
                />
              </div>

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
                  {editId ? 'Update' : 'Save'}
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
        title="Delete Fuel Log"
        message="Are you sure you want to delete this fuel log entry?"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
