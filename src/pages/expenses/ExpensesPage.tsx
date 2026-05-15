import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign, Fuel, Wrench, Car, Download,
  TrendingUp, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import clsx from 'clsx';
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
  monthlyTrend: {
    month: string;
    fuel: number;
    maintenance: number;
    total: number;
  }[];
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

interface VehicleOption {
  _id: string;
  vehicle_name: string;
  plate_number: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtR  = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtM  = (n: number) => `Rp ${Math.round(n / 1000).toLocaleString('id-ID')}K`;
const fmt   = (n: number) => n.toLocaleString('id-ID');
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear]                 = useState(currentYear);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [sortField, setSortField]       = useState<'totalCost' | 'fuelCost' | 'maintCost'>('totalCost');

  // Build year options: current year and 3 prior
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
    queryFn: async () => {
      const { data } = await api.get('/reports/expenses', { params });
      return data;
    },
    placeholderData: (prev) => prev,
  });

  // ── Chart data — monthly stacked bar ────────────────────────────────────
  const chartData = useMemo(() =>
    (report?.monthlyTrend ?? []).map(({ month, fuel, maintenance }) => ({
      month: SHORT_MONTHS[parseInt(month.split('-')[1], 10) - 1],
      'Fuel (K)':  Math.round(fuel / 1000),
      'Maint (K)': Math.round(maintenance / 1000),
    })),
  [report]);

  // ── Sorted vehicle table ─────────────────────────────────────────────────
  const sortedVehicles = useMemo(() =>
    [...(report?.byVehicle ?? [])].sort((a, b) => b[sortField] - a[sortField]),
  [report, sortField]);

  // ── CSV export ────────────────────────────────────────────────────────────
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

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expense Report</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total cost of ownership — fuel + maintenance per vehicle
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Year + Vehicle filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Year selector */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-slate-600">
          <button onClick={() => setYear((y) => y - 1)}
            className="rounded-l-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 text-sm font-semibold text-gray-900 dark:text-white min-w-[4rem] text-center">
            {year}
          </span>
          <button onClick={() => setYear((y) => Math.min(currentYear, y + 1))}
            disabled={year >= currentYear}
            className="rounded-r-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-slate-700">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Vehicle filter */}
        <div className="flex flex-wrap gap-2 items-center">
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
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={DollarSign} label="Total Fleet Cost"  value={fmtR(s?.totalCost ?? 0)}        sub={`${year}`}                    color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
        <StatCard icon={Fuel}       label="Total Fuel Cost"   value={fmtR(s?.totalFuel ?? 0)}         sub={`${pct(s?.totalFuel ?? 0, s?.totalCost ?? 0)}% of total`}        color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard icon={Wrench}     label="Total Maint. Cost" value={fmtR(s?.totalMaintenance ?? 0)}  sub={`${pct(s?.totalMaintenance ?? 0, s?.totalCost ?? 0)}% of total`} color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
        <StatCard icon={TrendingUp} label="Avg Cost/Vehicle"  value={s?.vehicleCount ? fmtR(Math.round((s.totalCost) / s.vehicleCount)) : '—'} sub={`across ${s?.vehicleCount ?? 0} vehicles`} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Stacked monthly bar chart */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Monthly Cost Breakdown — {year}
          </h3>
          <p className="mb-3 text-xs text-gray-400">Amounts in thousands IDR (K)</p>
          {isLoading ? (
            <div className="h-52 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-slate-700" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v, n) => [`Rp ${((v as number) * 1000).toLocaleString('id-ID')}`, n as string]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Fuel (K)"  stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Maint (K)" stackId="a" fill="#f97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Fuel vs Maint donut-style breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Cost Split</h3>
          {s && s.totalCost > 0 ? (
            <div className="space-y-4">
              {/* Fuel bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" /> Fuel
                  </span>
                  <span className="text-gray-500">{pct(s.totalFuel, s.totalCost)}%</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100 dark:bg-slate-700">
                  <div className="h-3 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${pct(s.totalFuel, s.totalCost)}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-400">{fmtR(s.totalFuel)}</p>
              </div>

              {/* Maintenance bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" /> Maintenance
                  </span>
                  <span className="text-gray-500">{pct(s.totalMaintenance, s.totalCost)}%</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100 dark:bg-slate-700">
                  <div className="h-3 rounded-full bg-orange-500 transition-all"
                    style={{ width: `${pct(s.totalMaintenance, s.totalCost)}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-400">{fmtR(s.totalMaintenance)}</p>
              </div>

              <div className="mt-2 rounded-lg bg-gray-50 p-3 dark:bg-slate-900/40">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Fleet Cost {year}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtR(s.totalCost)}</p>
              </div>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              No expense data for {year}
            </div>
          )}
        </div>
      </div>

      {/* Per-vehicle table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cost per Vehicle</h3>
          {/* Sort selector */}
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
                      <td className="px-4 py-3 text-right font-medium text-blue-600 dark:text-blue-400">
                        {fmtR(v.fuelCost)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                        {fmt(Math.round(v.fuelLiters))} L / {v.fuelFills}×
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-orange-600 dark:text-orange-400">
                        {fmtR(v.maintCost)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                        {v.maintRecords}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                        {fmtR(v.totalCost)}
                      </td>
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
              {/* Totals row */}
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
