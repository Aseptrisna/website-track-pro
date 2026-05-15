import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileWarning,
  FileText,
  ClipboardList,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Car,
} from 'lucide-react';
import api from '../../lib/axios';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

// ── Types ─────────────────────────────────────────────────────────────────────

type DocStatus = 'expired' | 'warning' | 'ok' | 'unknown';

interface DocInfo {
  status: DocStatus;
  daysLeft: number | null;
  expiry: string | null;
}

interface ServiceInfo {
  nextDate: string | null;
  dateStatus: DocStatus;
  dateDaysLeft: number | null;
  nextKm: number | null;
  currentOdometer: number;
  kmStatus: DocStatus;
  kmLeft: number | null;
}

interface VehicleCompliance {
  _id: string;
  vehicle_name: string;
  plate_number: string;
  vehicle_type: string;
  status: string;
  stnk: DocInfo;
  kir: DocInfo;
  insurance: DocInfo;
  service: ServiceInfo;
  overallStatus: DocStatus;
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DocStatus, {
  label: string;
  icon: React.FC<{ className?: string }>;
  pill: string;
  row: string;
  text: string;
}> = {
  expired: {
    label: 'Expired',
    icon: XCircle,
    pill: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    row: 'bg-red-50/50 dark:bg-red-900/10',
    text: 'text-red-600 dark:text-red-400',
  },
  warning: {
    label: 'Expiring Soon',
    icon: AlertTriangle,
    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    row: 'bg-amber-50/50 dark:bg-amber-900/10',
    text: 'text-amber-600 dark:text-amber-400',
  },
  ok: {
    label: 'OK',
    icon: CheckCircle2,
    pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    row: '',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  unknown: {
    label: 'Not Set',
    icon: HelpCircle,
    pill: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400',
    row: '',
    text: 'text-gray-400',
  },
};

// Document column definitions
const DOC_COLS: {
  key: keyof Pick<VehicleCompliance, 'stnk' | 'kir' | 'insurance'>;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { key: 'stnk',      label: 'STNK',      icon: FileText },
  { key: 'kir',       label: 'KIR',        icon: ClipboardList },
  { key: 'insurance', label: 'Insurance',  icon: ShieldCheck },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusIcon({ status, className = 'h-4 w-4' }: { status: DocStatus; className?: string }) {
  const cfg = STATUS_CONFIG[status];
  return <cfg.icon className={`${className} ${cfg.text}`} />;
}

function DaysLabel({ daysLeft, status }: { daysLeft: number | null; status: DocStatus }) {
  if (daysLeft === null) return <span className="text-xs text-gray-400">—</span>;
  if (status === 'expired') {
    return <span className="text-xs font-semibold text-red-600 dark:text-red-400">{Math.abs(daysLeft)}d ago</span>;
  }
  return (
    <span className={`text-xs font-semibold ${STATUS_CONFIG[status].text}`}>
      {daysLeft}d left
    </span>
  );
}

function ExpiryDate({ expiry }: { expiry: string | null }) {
  if (!expiry) return <span className="text-xs text-gray-400">Not set</span>;
  return (
    <span className="text-xs text-gray-500 dark:text-gray-400">
      {format(parseISO(expiry), 'd MMM yyyy', { locale: id })}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type SortKey = 'name' | 'status';
type FilterStatus = 'all' | DocStatus;

export default function CompliancePage() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data = [], isLoading, refetch, isFetching } = useQuery<VehicleCompliance[]>({
    queryKey: ['compliance'],
    queryFn: () => api.get('/vehicles/compliance').then((r: any) => r.data),
  });

  // Summary counts
  const counts = useMemo(() => {
    const c = { expired: 0, warning: 0, ok: 0, unknown: 0 };
    for (const v of data) c[v.overallStatus]++;
    return c;
  }, [data]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = filterStatus === 'all' ? data : data.filter((v) => v.overallStatus === filterStatus);
    const statusOrder: Record<DocStatus, number> = { expired: 0, warning: 1, ok: 2, unknown: 3 };
    list = [...list].sort((a, b) => {
      if (sortKey === 'status') {
        const diff = statusOrder[a.overallStatus] - statusOrder[b.overallStatus];
        return sortAsc ? diff : -diff;
      }
      const diff = a.vehicle_name.localeCompare(b.vehicle_name);
      return sortAsc ? diff : -diff;
    });
    return list;
  }, [data, filterStatus, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((p) => !p);
    else { setSortKey(key); setSortAsc(true); }
  }

  function exportCSV() {
    const header = ['Vehicle', 'Plate', 'Type', 'Status', 'STNK Expiry', 'STNK Status', 'KIR Expiry', 'KIR Status', 'Insurance Expiry', 'Insurance Status', 'Next Service Date', 'Service Date Status', 'Next Service KM', 'Current Odometer', 'KM Status'];
    const rows = data.map((v) => [
      v.vehicle_name,
      v.plate_number,
      v.vehicle_type,
      v.overallStatus,
      v.stnk.expiry ? format(parseISO(v.stnk.expiry), 'yyyy-MM-dd') : '',
      v.stnk.status,
      v.kir.expiry ? format(parseISO(v.kir.expiry), 'yyyy-MM-dd') : '',
      v.kir.status,
      v.insurance.expiry ? format(parseISO(v.insurance.expiry), 'yyyy-MM-dd') : '',
      v.insurance.status,
      v.service.nextDate ? format(parseISO(v.service.nextDate), 'yyyy-MM-dd') : '',
      v.service.dateStatus,
      v.service.nextKm ?? '',
      v.service.currentOdometer,
      v.service.kmStatus,
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortAsc ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
    ) : null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <FileWarning className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Compliance</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Document &amp; service schedule status for all vehicles
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['expired', 'warning', 'ok', 'unknown'] as const).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
              className={`rounded-xl border p-4 text-left transition-all ${
                filterStatus === s
                  ? 'ring-2 ring-offset-1 ' + (s === 'expired' ? 'ring-red-500' : s === 'warning' ? 'ring-amber-500' : s === 'ok' ? 'ring-emerald-500' : 'ring-gray-400')
                  : 'hover:shadow-sm'
              } border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800`}
            >
              <div className="flex items-center justify-between">
                <StatusIcon status={s} className="h-5 w-5" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{counts[s]}</span>
              </div>
              <div className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-400">{cfg.label}</div>
              <div className="text-xs text-gray-400">{s === 'unknown' ? 'Docs not entered' : 'vehicle(s)'}</div>
            </button>
          );
        })}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Filter:</span>
        {(['all', 'expired', 'warning', 'ok', 'unknown'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterStatus === s
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
            }`}
          >
            {s === 'all' ? `All (${data.length})` : `${STATUS_CONFIG[s].label} (${counts[s]})`}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Sort by:</span>
          <button
            onClick={() => toggleSort('status')}
            className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors hover:bg-gray-100 dark:hover:bg-slate-700 ${sortKey === 'status' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
          >
            Status <SortIcon k="status" />
          </button>
          <button
            onClick={() => toggleSort('name')}
            className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors hover:bg-gray-100 dark:hover:bg-slate-700 ${sortKey === 'name' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
          >
            Name <SortIcon k="name" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {/* Column header */}
        <div className="grid grid-cols-[1fr_120px_120px_120px_120px_100px] gap-0 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:bg-slate-700/50 dark:text-gray-400 max-md:hidden">
          <div>Vehicle</div>
          <div className="text-center">STNK</div>
          <div className="text-center">KIR</div>
          <div className="text-center">Insurance</div>
          <div className="text-center">Service</div>
          <div className="text-center">Overall</div>
        </div>

        {isLoading ? (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100 dark:bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-100 dark:bg-slate-700" />
                  <div className="h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Car className="mb-3 h-12 w-12 opacity-30" />
            <p className="font-medium">No vehicles match this filter</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-700">
            {filtered.map((v) => {
              const isExpanded = expandedId === v._id;
              const overallCfg = STATUS_CONFIG[v.overallStatus];

              return (
                <li key={v._id} className={overallCfg.row}>
                  {/* Main row */}
                  <div
                    className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-slate-700/30 md:grid-cols-[1fr_120px_120px_120px_120px_100px]"
                    onClick={() => setExpandedId(isExpanded ? null : v._id)}
                  >
                    {/* Vehicle info */}
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700">
                        <Car className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900 dark:text-white text-sm">
                          {v.vehicle_name}
                        </div>
                        <div className="text-xs text-gray-400">{v.plate_number}</div>
                      </div>
                    </div>

                    {/* Document cells — hidden on mobile */}
                    {DOC_COLS.map((col) => {
                      const doc = v[col.key];
                      return (
                        <div key={col.key} className="hidden flex-col items-center gap-0.5 md:flex">
                          <StatusIcon status={doc.status} />
                          <DaysLabel daysLeft={doc.daysLeft} status={doc.status} />
                        </div>
                      );
                    })}

                    {/* Service cell */}
                    <div className="hidden flex-col items-center gap-0.5 md:flex">
                      <StatusIcon
                        status={
                          v.service.dateStatus === 'expired' || v.service.kmStatus === 'expired'
                            ? 'expired'
                            : v.service.dateStatus === 'warning' || v.service.kmStatus === 'warning'
                            ? 'warning'
                            : v.service.dateStatus === 'ok' || v.service.kmStatus === 'ok'
                            ? 'ok'
                            : 'unknown'
                        }
                      />
                      {v.service.dateDaysLeft !== null ? (
                        <DaysLabel daysLeft={v.service.dateDaysLeft} status={v.service.dateStatus} />
                      ) : v.service.kmLeft !== null ? (
                        <span className={`text-xs font-semibold ${STATUS_CONFIG[v.service.kmStatus].text}`}>
                          {v.service.kmLeft >= 0 ? `${v.service.kmLeft.toLocaleString()} km` : `${Math.abs(v.service.kmLeft).toLocaleString()} km over`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>

                    {/* Overall + expand */}
                    <div className="flex items-center justify-between gap-2 md:justify-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${overallCfg.pill}`}>
                        {overallCfg.label}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-700/20">
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {/* STNK */}
                        <DocDetailCard
                          icon={FileText}
                          title="STNK"
                          status={v.stnk.status}
                          expiry={v.stnk.expiry}
                          daysLeft={v.stnk.daysLeft}
                        />
                        {/* KIR */}
                        <DocDetailCard
                          icon={ClipboardList}
                          title="KIR"
                          status={v.kir.status}
                          expiry={v.kir.expiry}
                          daysLeft={v.kir.daysLeft}
                        />
                        {/* Insurance */}
                        <DocDetailCard
                          icon={ShieldCheck}
                          title="Insurance"
                          status={v.insurance.status}
                          expiry={v.insurance.expiry}
                          daysLeft={v.insurance.daysLeft}
                        />
                        {/* Service */}
                        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
                          <div className="mb-2 flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-gray-500" />
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Service</span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Next date:</span>
                              <div className="flex items-center gap-1">
                                <StatusIcon status={v.service.dateStatus} className="h-3.5 w-3.5" />
                                {v.service.nextDate
                                  ? <ExpiryDate expiry={v.service.nextDate} />
                                  : <span className="text-gray-400">Not set</span>
                                }
                              </div>
                            </div>
                            {v.service.dateDaysLeft !== null && (
                              <DaysLabel daysLeft={v.service.dateDaysLeft} status={v.service.dateStatus} />
                            )}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Next KM:</span>
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {v.service.nextKm != null
                                  ? v.service.nextKm.toLocaleString() + ' km'
                                  : '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Odometer:</span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {v.service.currentOdometer.toLocaleString()} km
                              </span>
                            </div>
                            {v.service.kmLeft !== null && (
                              <div className="flex items-center gap-1">
                                <StatusIcon status={v.service.kmStatus} className="h-3.5 w-3.5" />
                                <span className={`text-xs font-semibold ${STATUS_CONFIG[v.service.kmStatus].text}`}>
                                  {v.service.kmLeft >= 0
                                    ? `${v.service.kmLeft.toLocaleString()} km left`
                                    : `${Math.abs(v.service.kmLeft).toLocaleString()} km overdue`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate('/app/vehicles'); }}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Update Documents →
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-semibold text-gray-600 dark:text-gray-300">Legend:</span>
        {(['expired', 'warning', 'ok', 'unknown'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <StatusIcon status={s} className="h-3.5 w-3.5" />
            {STATUS_CONFIG[s].label}
            {s === 'expired' && ' (past due)'}
            {s === 'warning' && ' (≤30 days / ≤1000 km)'}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── DocDetailCard ─────────────────────────────────────────────────────────────

function DocDetailCard({
  icon: Icon,
  title,
  status,
  expiry,
  daysLeft,
}: {
  icon: React.FC<{ className?: string }>;
  title: string;
  status: DocStatus;
  expiry: string | null;
  daysLeft: number | null;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500" />
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{title}</span>
        <StatusIcon status={status} className="ml-auto h-4 w-4" />
      </div>
      <ExpiryDate expiry={expiry} />
      <div className="mt-1">
        <DaysLabel daysLeft={daysLeft} status={status} />
      </div>
    </div>
  );
}
