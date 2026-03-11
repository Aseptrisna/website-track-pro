import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  loading?: boolean;
  actions?: (item: T) => ReactNode;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  total,
  page = 1,
  limit = 10,
  onPageChange,
  loading,
  actions,
}: DataTableProps<T>) {
  const totalPages = total ? Math.ceil(total / limit) : 1;

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  {col.label}
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-slate-700">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 w-24 animate-skeleton rounded bg-gray-200 dark:bg-slate-700" />
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right">
                    <div className="ml-auto h-4 w-16 animate-skeleton rounded bg-gray-200 dark:bg-slate-700" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
        <p className="text-gray-500 dark:text-gray-400">No data found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  {col.label}
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
                  >
                    {col.render
                      ? col.render(item)
                      : (item[col.key] as ReactNode) ?? '—'}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right">{actions(item)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total !== undefined && onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{' '}
            {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className={clsx(
                'rounded-lg p-1.5',
                page <= 1
                  ? 'cursor-not-allowed text-gray-300 dark:text-gray-600'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700',
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-sm text-gray-700 dark:text-gray-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className={clsx(
                'rounded-lg p-1.5',
                page >= totalPages
                  ? 'cursor-not-allowed text-gray-300 dark:text-gray-600'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700',
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
