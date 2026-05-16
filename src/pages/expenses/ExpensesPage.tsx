import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, Fuel, Wrench, Car, Download,
  TrendingUp, ChevronLeft, ChevronRight,
  Plus, Edit2, Trash2, Receipt,
  BadgeDollarSign,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExpenseReport {
  year: number;
  summary: {
    totalFuel: number;
    totalMaintenance: number;
    totalCost: number;
    vehicleCount: number;
  };
  monthlyTrend: { month: string; fuel: number; maintenance: number; total: number }[];
  byVehicle: {
    vehicleId: string;
    vehicleName: string;
    plateNumber: string;
    fuelCost: number;
    fuelLiters: number;
    fuelFills: number;
    maintCost: number;
    maintRecords: number;
    totalCost: number;
  }[];
}

interface CustomExpense {
  _id: string;
  vehicle: string;
  vehicle_name: string;
  plate_number: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  createdAt: string;
}

interface ExpenseStats {
  thisMonth: number;
  thisMonthCount: number;
  thisYear: number;
  thisYearCount: number;
  byCategory: { category: string; total: number; count: number }[];
  trend: { month: string; total: number }[];
}

interface VehicleOption {
  _id: string;
  vehicle_name: string;
  plate_number: string;
}

type ExpenseCategory = 'toll' | 'parking' | 'fine' | 'wash' | 'admin' | 'insurance' | 'other';

interface FormState {
  vehicleId: string;
  category: ExpenseCategory;
  amount: string;
  date: string;
  description: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; color: string; bg: string }> = {
  toll:      { label: 'Toll',        color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  parking:   { label: 'Parking',     color: 'text-slate-700 dark:text-slate-300',   bg: 'bg-slate-100 dark:bg-slate-700'      },
  fine:      { label: 'Traffic Fine', color: 'text-red-700 dark:text-red-400',      bg: 'bg-red-100 dark:bg-red-900/30'       },
  wash:      { label: 'Car Wash',    color: 'text-blue-700 dark:text-blue-400',     bg: 'bg-blue-100 dark:bg-blue-900/30'     },
  admin:     { label: 'Admin/Reg.',  color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  insurance: { label: 'Insurance',   color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  other:     { label: 'Other',       color: 'text-gray-600 dark:text-gray-400',     bg: 'bg-gray-100 dark:bg-slate-700'       },
};

const CATEGORY_CHART_COLOR: Record<ExpenseCategory, string> = {
  toll: '#f97316', parking: '#64748b', fine: '#ef4444',
  wash: '#3b82f6', admin: '#a855f7', insurance: '#6366f1', other: '#9ca3af',
};

const BLANK: FormState = {
  vehicleId: '', category: 'toll', amount: '', date: new Date().toISOString().split('T')[0], description: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtR  = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtM  = (n: number) => `Rp ${Math.round(n / 1000).toLocaleString('id-ID')}K`;
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof DollarSign; label: string; value: string; sub?: string; color: string;
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

// ─── Tab: Annual Report ───────────────────────────────────────────────────────
function AnnualReportTab() {
  const currentYear = new Date().getFullYear();
  const [year, setYear]                 = useState(currentYear);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [sortField, setSortField]       = useState<'totalCost' | 'fuelCost' | 'maintCost'>('totalCost');
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i);

  const { data: vehicleOptions } = useQuery<VehicleOption[]>({
    queryKey: ['vehicles-options'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  const params: Record<string, any> = { year };
  if (vehicleFilter) params.vehicleId = vehicleFilter;

  const { data: report, isLoading } = useQuery<ExpenseReport>({
    queryKey: ['expense-report', year, vehicleFilter],
    queryFn: async () => { const { data } = await api.get('/reports/expenses', { params }); return data; },
    placeholderData: (prev) => prev,
  });

  const chartData = useMemo(() =>
    (report?.monthlyTrend ?? []).map(({ month, fuel, maintenance }) => ({
      month: SHORT_MONTHS[parseInt(month.split('-')[1], 10) - 1],
      'Fuel (K)':  Math.round(fuel / 1000),
      'Maint (K)': Math.round(maintenance / 1000),
    })),
  [report]);

  const sortedVehicles = useMemo(() =>
    [...(report?.byVehicle ?? [])].sort((a, b) => b[sortField] - a[sortField]),
  [report, sortField]);

  const exportCSV = () => {
    const rows = [
      ['Vehicle', 'Plate', 'Fuel Cost (IDR)', 'Fuel Liters', 'Fuel Fill-ups',
       'Maint Cost (IDR)', 'Maint Records', 'Total Cost (IDR)'],
      ...(report?.byVehicle ?? []).map((v) => [
        v.vehicleName, v.plateNumber,
        v.fuelCost, v.fuelLiters, v.fuelFills,
        v.maintCost, v.maintRecords, v.totalCost,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `expenses-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const s = report?.summary;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-slate-600">
          <button onClick={() => setYear((y) => y - 1)}
            className="rounded-l-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 text-sm font-semibold text-gray-900 dark:text-white min-w-[4rem] text-center">{year}</span>
          <button onClick={() => setYear((y) => Math.min(currentYear, y + 1))}
            disabled={year >= currentYear}
            className="rounded-r-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-slate-700">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Car className="h-4 w-4 text-gray-400 shrink-0" />
          <button onClick={() => setVehicleFilter('')}
            className={clsx('rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              !vehicleFilter ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300')}>
            All Vehicles
          </button>
          {vehicleOptions?.map((v) => (
            <button key={v._id} onClick={() => setVehicleFilter(v._id)}
              className={clsx('rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                vehicleFilter === v._id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300')}>
              {v.vehicle_name}
            </button>
          ))}
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={DollarSign} label="Total Fleet Cost"  value={fmtR(s?.totalCost ?? 0)}        sub={`${year}`}
          color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
        <StatCard icon={Fuel}       label="Total Fuel Cost"   value={fmtR(s?.totalFuel ?? 0)}
          sub={`${pct(s?.totalFuel ?? 0, s?.totalCost ?? 0)}% of total`}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard icon={Wrench}     label="Total Maint. Cost" value={fmtR(s?.totalMaintenance ?? 0)}
          sub={`${pct(s?.totalMaintenance ?? 0, s?.totalCost ?? 0)}% of total`}
          color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
        <StatCard icon={TrendingUp} label="Avg Cost/Vehicle"
          value={s?.vehicleCount ? fmtR(Math.round((s.totalCost) / s.vehicleCount)) : '—'}
          sub={`across ${s?.vehicleCount ?? 0} vehicles`}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Monthly Cost Breakdown — {year}</h3>
          <p className="mb-3 text-xs text-gray-400">Amounts in thousands IDR (K)</p>
          {isLoading ? (
            <div className="h-52 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-slate-700" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }}
                  formatter={(v, n) => [`Rp ${((v as number) * 1000).toLocaleString('id-ID')}`, n as string]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Fuel (K)"  stackId="a" fill="#3b82f6" />
                <Bar dataKey="Maint (K)" stackId="a" fill="#f97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Cost Split</h3>
          {s && s.totalCost > 0 ? (
            <div className="space-y-4">
              {[
                { label: 'Fuel',        value: s.totalFuel,        color: 'bg-blue-500' },
                { label: 'Maintenance', value: s.totalMaintenance, color: 'bg-orange-500' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                      <span className={clsx('inline-block h-2.5 w-2.5 rounded-full', color)} /> {label}
                    </span>
                    <span className="text-gray-500">{pct(value, s.totalCost)}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100 dark:bg-slate-700">
                    <div className={clsx('h-3 rounded-full transition-all', color)} style={{ width: `${pct(value, s.totalCost)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{fmtR(value)}</p>
                </div>
              ))}
              <div className="mt-2 rounded-lg bg-gray-50 p-3 dark:bg-slate-900/40">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Fleet Cost {year}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtR(s.totalCost)}</p>
              </div>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">No expense data for {year}</div>
          )}
        </div>
      </div>

      {/* Per-vehicle table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cost per Vehicle</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Sort by:</span>
            {(['totalCost', 'fuelCost', 'maintCost'] as const).map((f) => (
              <button key={f} onClick={() => setSortField(f)}
                className={clsx('rounded-full px-2.5 py-1 font-medium transition-colors',
                  sortField === f ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300')}>
                {f === 'totalCost' ? 'Total' : f === 'fuelCost' ? 'Fuel' : 'Maint.'}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-1 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700" />
            ))}
          </div>
        ) : sortedVehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <DollarSign className="h-8 w-8 text-gray-300 dark:text-slate-600" />
            <p className="mt-2 text-sm text-gray-400">No expense data for {year}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-900/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Vehicle</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-blue-500">Fuel Cost</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Liters / Fills</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-orange-500">Maint. Cost</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Records</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-900 dark:text-white">Total</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {sortedVehicles.map((v) => {
                  const share = pct(v.totalCost, s?.totalCost ?? 0);
                  return (
                    <tr key={v.vehicleId} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{v.vehicleName}</p>
                        <p className="text-xs text-gray-400">{v.plateNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-blue-600 dark:text-blue-400">{fmtR(v.fuelCost)}</td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                        {Math.round(v.fuelLiters).toLocaleString('id-ID')} L / {v.fuelFills}×
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-orange-600 dark:text-orange-400">{fmtR(v.maintCost)}</td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{v.maintRecords}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{fmtR(v.totalCost)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-gray-100 dark:bg-slate-700">
                            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${share}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {s && s.totalCost > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-slate-900/40">
                    <td className="px-4 py-3 text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Fleet Total</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">{fmtR(s.totalFuel)}</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-bold text-orange-600 dark:text-orange-400">{fmtR(s.totalMaintenance)}</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{fmtR(s.totalCost)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">100%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Log Expenses ────────────────────────────────────────────────────────
function LogExpensesTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<CustomExpense | null>(null);
  const [form,      setForm]      = useState<FormState>(BLANK);

  // Filters
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: vehicleOptions } = useQuery<VehicleOption[]>({
    queryKey: ['vehicles-options'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  const { data: stats } = useQuery<ExpenseStats>({
    queryKey: ['custom-expense-stats'],
    queryFn: async () => { const { data } = await api.get('/expenses/stats'); return data; },
  });

  const listParams: Record<string, any> = { page, limit: 25 };
  if (vehicleFilter)  listParams.vehicleId = vehicleFilter;
  if (categoryFilter) listParams.category  = categoryFilter;

  const { data: list, isLoading } = useQuery<{
    data: CustomExpense[]; total: number; page: number; pages: number;
  }>({
    queryKey: ['custom-expenses', vehicleFilter, categoryFilter, page],
    queryFn: async () => { const { data } = await api.get('/expenses', { params: listParams }); return data; },
    placeholderData: (prev) => prev,
  });

  const createMut = useMutation({
    mutationFn: (dto: FormState) => api.post('/expenses', { ...dto, amount: Number(dto.amount) }),
    onSuccess: () => {
      toast.success('Expense logged');
      qc.invalidateQueries({ queryKey: ['custom-expenses'] });
      qc.invalidateQueries({ queryKey: ['custom-expense-stats'] });
      setShowModal(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => api.put(`/expenses/${id}`, dto),
    onSuccess: () => {
      toast.success('Updated');
      qc.invalidateQueries({ queryKey: ['custom-expenses'] });
      qc.invalidateQueries({ queryKey: ['custom-expense-stats'] });
      setShowModal(false);
    },
    onError: () => toast.error('Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['custom-expenses'] });
      qc.invalidateQueries({ queryKey: ['custom-expense-stats'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const openCreate = () => { setEditing(null); setForm(BLANK); setShowModal(true); };
  const openEdit   = (e: CustomExpense) => {
    setEditing(e);
    setForm({
      vehicleId:   e.vehicle,
      category:    e.category,
      amount:      String(e.amount),
      date:        e.date.split('T')[0],
      description: e.description,
    });
    setShowModal(true);
  };

  const handleSave = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.vehicleId) { toast.error('Select a vehicle'); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (editing) {
      updateMut.mutate({ id: editing._id, dto: { ...form, amount: Number(form.amount) } });
    } else {
      createMut.mutate(form);
    }
  };

  // Chart data — 6-month trend
  const trendData = useMemo(() =>
    (stats?.trend ?? []).map((t) => ({
      month: SHORT_MONTHS[parseInt(t.month.split('-')[1], 10) - 1],
      'Total (K)': Math.round(t.total / 1000),
    })),
  [stats]);

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white';

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Log tolls, fines, parking, and other fleet expenses
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> Log Expense
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Receipt}          label="This Month"   value={fmtR(stats?.thisMonth ?? 0)}
          sub={`${stats?.thisMonthCount ?? 0} entries`}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard icon={BadgeDollarSign}   label="This Year"    value={fmtR(stats?.thisYear ?? 0)}
          sub={`${stats?.thisYearCount ?? 0} entries`}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard icon={TrendingUp}        label="Top Category"
          value={stats?.byCategory[0] ? CATEGORY_CONFIG[stats.byCategory[0].category as ExpenseCategory]?.label ?? stats.byCategory[0].category : '—'}
          sub={stats?.byCategory[0] ? fmtR(stats.byCategory[0].total) : undefined}
          color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
        <StatCard icon={Car}              label="Categories"
          value={String(stats?.byCategory.length ?? 0)}
          sub="active this year"
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
      </div>

      {/* Charts */}
      {((stats?.trend.length ?? 0) > 0 || (stats?.byCategory.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* 6-month trend */}
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">6-Month Trend</h3>
            <p className="mb-3 text-xs text-gray-400">Amounts in thousands IDR (K)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData} margin={{ top: 0, right: 0, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-slate-700" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }}
                  formatter={(v, n) => [`Rp ${((v as number) * 1000).toLocaleString('id-ID')}`, n as string]} />
                <Bar dataKey="Total (K)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">By Category (YTD)</h3>
            {stats?.byCategory.length ? (
              <div className="space-y-2.5">
                {stats.byCategory.slice(0, 6).map((c) => {
                  const cfg  = CATEGORY_CONFIG[c.category as ExpenseCategory] ?? CATEGORY_CONFIG.other;
                  const pctV = pct(c.total, stats.thisYear);
                  return (
                    <div key={c.category}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={clsx('font-medium', cfg.color)}>{cfg.label}</span>
                        <span className="text-gray-500">{fmtM(c.total)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${pctV}%`, backgroundColor: CATEGORY_CHART_COLOR[c.category as ExpenseCategory] ?? '#9ca3af' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-gray-400">No data yet</div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Vehicle filter */}
        <select
          value={vehicleFilter}
          onChange={(e) => { setVehicleFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        >
          <option value="">All Vehicles</option>
          {vehicleOptions?.map((v) => (
            <option key={v._id} value={v._id}>{v.vehicle_name} ({v.plate_number})</option>
          ))}
        </select>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Expense list */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-800">
        {isLoading ? (
          <div className="space-y-1 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700" />
            ))}
          </div>
        ) : (list?.data.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Receipt className="h-10 w-10 text-gray-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">No expenses logged yet</p>
            <p className="mt-1 text-xs text-gray-400">Click "Log Expense" to record tolls, fines, and other costs.</p>
            <button onClick={openCreate}
              className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> Log First Expense
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
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Category</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Description</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-900 dark:text-white">Amount</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {list?.data.map((e) => {
                    const cfg = CATEGORY_CONFIG[e.category] ?? CATEGORY_CONFIG.other;
                    return (
                      <tr key={e._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {new Date(e.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-white">{e.vehicle_name}</p>
                          <p className="text-xs text-gray-400">{e.plate_number}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-semibold', cfg.bg, cfg.color)}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                            {e.description || <span className="italic text-gray-300 dark:text-slate-600">—</span>}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          {fmtR(e.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(e)}
                              className="rounded-lg border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { if (confirm('Delete this expense?')) deleteMut.mutate(e._id); }}
                              className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-red-800/40 dark:hover:bg-red-900/20"
                            >
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
        title={editing ? 'Edit Expense' : 'Log Expense'} size="md">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* Vehicle */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Vehicle</label>
            <select
              required
              value={form.vehicleId}
              onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              className={inputClass}
            >
              <option value="">Select vehicle…</option>
              {vehicleOptions?.map((v) => (
                <option key={v._id} value={v._id}>{v.vehicle_name} — {v.plate_number}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(CATEGORY_CONFIG) as [ExpenseCategory, typeof CATEGORY_CONFIG[ExpenseCategory]][]).map(([k, cfg]) => (
                <label
                  key={k}
                  className={clsx(
                    'flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors',
                    form.category === k
                      ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-500',
                  )}
                >
                  <input type="radio" name="category" value={k}
                    checked={form.category === k}
                    onChange={() => setForm({ ...form, category: k })}
                    className="sr-only" />
                  <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-semibold', cfg.bg, cfg.color)}>
                    {cfg.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Amount + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Amount (IDR)</label>
              <input
                required
                type="number"
                min="0"
                step="1000"
                placeholder="e.g. 50000"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Date</label>
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Tol Cipali — Jakarta → Cirebon"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-3 dark:border-slate-700">
            <button type="button" onClick={() => setShowModal(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
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
              {editing ? 'Save Changes' : 'Log Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Tab = 'report' | 'log';

export default function ExpensesPage() {
  const [tab, setTab] = useState<Tab>('report');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Fleet cost overview and custom expense tracking
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-800/60 w-fit">
        {([
          { key: 'report', label: 'Annual Report' },
          { key: 'log',    label: 'Log Expenses'  },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              tab === key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'report' ? <AnnualReportTab /> : <LogExpensesTab />}
    </div>
  );
}
