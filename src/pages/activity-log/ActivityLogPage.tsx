import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList, Plus, Pencil, Trash2, RefreshCw,
  Car, UserRound, Package, ChevronLeft, ChevronRight,
  ArrowRightLeft, Filter,
} from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LogEntry {
  _id: string;
  user?: { name: string; email: string };
  action: string;
  module: string;
  details?: string;
  createdAt: string;
}

type ActionFilter = 'all' | 'created' | 'updated' | 'deleted' | 'status_changed';
type ModuleFilter = 'all' | 'Vehicles' | 'Drivers' | 'Shipments';

// ─── Config ───────────────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { label: string; cls: string; icon: typeof Plus }> = {
  created:        { label: 'Created',        cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Plus },
  updated:        { label: 'Updated',        cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',           icon: Pencil },
  deleted:        { label: 'Deleted',        cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',               icon: Trash2 },
  status_changed: { label: 'Status Changed', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',       icon: ArrowRightLeft },
};

const MODULE_CONFIG: Record<string, { icon: typeof Car; cls: string }> = {
  Vehicles:  { icon: Car,       cls: 'text-violet-600 dark:text-violet-400' },
  Drivers:   { icon: UserRound, cls: 'text-blue-600 dark:text-blue-400' },
  Shipments: { icon: Package,   cls: 'text-amber-600 dark:text-amber-400' },
};

const MODULES: ModuleFilter[]  = ['all', 'Vehicles', 'Drivers', 'Shipments'];
const ACTIONS: ActionFilter[]  = ['all', 'created', 'updated', 'deleted', 'status_changed'];
const PAGE_SIZE = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ActivityLogPage() {
  const [page, setPage]           = useState(1);
  const [modFilter, setModFilter] = useState<ModuleFilter>('all');
  const [actFilter, setActFilter] = useState<ActionFilter>('all');
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');

  const params: Record<string, any> = { page, limit: PAGE_SIZE };
  if (modFilter !== 'all') params.module = modFilter;
  if (actFilter !== 'all') params.action = actFilter;
  if (from) params.from = from;
  if (to)   params.to   = to;

  const { data, isLoading, refetch, isFetching } = useQuery<{
    data: LogEntry[];
    total: number;
    totalPages: number;
  }>({
    queryKey: ['activity-logs', page, modFilter, actFilter, from, to],
    queryFn: async () => {
      const { data } = await api.get('/activity-logs', { params });
      return data;
    },
    placeholderData: (prev) => prev,
  });

  const totalPages = data?.totalPages ?? 1;
  const logs = data?.data ?? [];

  const resetFilters = () => {
    setModFilter('all');
    setActFilter('all');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const hasFilters = modFilter !== 'all' || actFilter !== 'all' || from || to;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Log</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {data?.total != null ? `${data.total} total events` : 'Track all fleet management activities'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
        >
          <RefreshCw className={clsx('h-4 w-4', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Module</span>
          {MODULES.map((m) => (
            <button
              key={m}
              onClick={() => { setModFilter(m); setPage(1); }}
              className={clsx(
                'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                modFilter === m
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600',
              )}
            >
              {m === 'all' ? 'All' : m}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 pl-6">Action</span>
          {ACTIONS.map((a) => {
            const cfg = a !== 'all' ? ACTION_CONFIG[a] : null;
            return (
              <button
                key={a}
                onClick={() => { setActFilter(a); setPage(1); }}
                className={clsx(
                  'rounded-full px-3 py-1 text-sm font-medium transition-colors capitalize',
                  actFilter === a
                    ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600',
                )}
              >
                {cfg ? cfg.label : 'All'}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 pl-6">Date</span>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="text-sm text-red-500 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Log list */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-800">

        {/* Loading skeletons */}
        {isLoading && (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4 animate-pulse">
                <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-slate-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/5 rounded bg-gray-200 dark:bg-slate-700" />
                  <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-slate-700/60" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12">
            <ClipboardList className="h-10 w-10 text-gray-300 dark:text-slate-600" />
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {hasFilters ? 'No entries match your filters' : 'No activity recorded yet'}
            </p>
            {hasFilters && (
              <button onClick={resetFilters} className="mt-2 text-sm text-emerald-600 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Entries */}
        {!isLoading && logs.length > 0 && (
          <ul className="divide-y divide-gray-100 dark:divide-slate-700">
            {logs.map((log) => {
              const actionCfg  = ACTION_CONFIG[log.action]  ?? { label: log.action, cls: 'bg-gray-100 text-gray-600', icon: ClipboardList };
              const moduleCfg  = MODULE_CONFIG[log.module]  ?? { icon: ClipboardList, cls: 'text-gray-400' };
              const ActionIcon = actionCfg.icon;
              const ModIcon    = moduleCfg.icon;
              const timeAgo    = formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: idLocale });

              return (
                <li key={log._id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  {/* Module icon */}
                  <div className="mt-0.5 shrink-0">
                    <ModIcon className={clsx('h-5 w-5', moduleCfg.cls)} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Module badge */}
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {log.module}
                      </span>
                      {/* Action badge */}
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          actionCfg.cls,
                        )}
                      >
                        <ActionIcon className="h-3 w-3" />
                        {actionCfg.label}
                      </span>
                    </div>
                    {log.details && (
                      <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400 truncate">
                        {log.details}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      {log.user && (
                        <span className="text-xs text-gray-400">{log.user.name}</span>
                      )}
                      <span className="text-xs text-gray-400">{timeAgo}</span>
                      <span className="text-xs text-gray-300 dark:text-slate-600">
                        {new Date(log.createdAt).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-slate-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-700"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
