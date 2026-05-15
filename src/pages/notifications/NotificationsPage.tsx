import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, BellOff, Check, CheckCheck, Mail,
  AlertTriangle, Info, CheckCircle, Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  read_status: boolean;
  createdAt: string;
}

type FilterType = 'all' | 'alert' | 'warning' | 'info' | 'success';

// ─── Config ───────────────────────────────────────────────────────────────────
const typeIcons: Record<string, typeof Bell> = {
  alert:   AlertTriangle,
  warning: AlertTriangle,
  info:    Info,
  success: CheckCircle,
  email:   Mail,
};

const typeColors: Record<string, string> = {
  alert:   'text-red-500 bg-red-100 dark:bg-red-900/30',
  warning: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
  info:    'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  success: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30',
  email:   'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
};

const FILTERS: { key: FilterType; label: string; activeClass: string }[] = [
  { key: 'all',     label: 'All',     activeClass: 'bg-gray-800 text-white dark:bg-white dark:text-gray-900' },
  { key: 'alert',   label: 'Alert',   activeClass: 'bg-red-500 text-white' },
  { key: 'warning', label: 'Warning', activeClass: 'bg-yellow-500 text-white' },
  { key: 'info',    label: 'Info',    activeClass: 'bg-blue-500 text-white' },
  { key: 'success', label: 'Success', activeClass: 'bg-emerald-500 text-white' },
];

// ─── Notification Card ────────────────────────────────────────────────────────
function NotifCard({
  n,
  onMarkRead,
  onDelete,
  isUnread,
}: {
  n: Notification;
  onMarkRead?: () => void;
  onDelete: () => void;
  isUnread: boolean;
}) {
  const Icon  = typeIcons[n.type]  || Bell;
  const color = typeColors[n.type] || 'text-gray-500 bg-gray-100 dark:bg-slate-700';

  return (
    <div
      className={clsx(
        'flex items-start gap-3 rounded-xl border p-3 sm:gap-4 sm:p-4',
        isUnread
          ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-900/10'
          : 'border-gray-200 bg-white opacity-70 dark:border-slate-700 dark:bg-slate-800',
      )}
    >
      <div className={clsx('rounded-lg p-2 shrink-0', color)}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 dark:text-white">{n.title}</p>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{n.message}</p>
        <p className="mt-1 text-xs text-gray-400">
          {new Date(n.createdAt).toLocaleString('id-ID')}
        </p>
      </div>

      <div className="flex shrink-0 gap-1">
        {isUnread && onMarkRead && (
          <button
            onClick={onMarkRead}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
            title="Mark as read"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data.data ?? data;
    },
  });

  const { data: unreadCount } = useQuery<number>({
    queryKey: ['unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count');
      return data.count;
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['unread-count'] });
  };

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => { toast.success('All notifications marked as read'); invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => { toast.success('Notification deleted'); invalidate(); },
  });

  const deleteAllReadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(`/notifications/${id}`)));
    },
    onSuccess: () => { toast.success('Read notifications cleared'); invalidate(); },
  });

  // ── Derived ────────────────────────────────────────────────────────────────
  const all   = notifications ?? [];
  const total = all.length;

  // Count per type (across all, for badge numbers)
  const countByType = (type: FilterType) =>
    type === 'all' ? total : all.filter((n) => n.type === type).length;

  // Apply active filter
  const filtered = activeFilter === 'all'
    ? all
    : all.filter((n) => n.type === activeFilter);

  const unread = filtered.filter((n) => !n.read_status);
  const read   = filtered.filter((n) =>  n.read_status);

  // IDs of read notifications under current filter (for bulk delete)
  const readIds = read.map((n) => n._id);

  const isEmpty = !isLoading && filtered.length === 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {typeof unreadCount === 'number' ? `${unreadCount} unread` : '…'} notifications
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {read.length > 0 && (
            <button
              onClick={() => deleteAllReadMutation.mutate(readIds)}
              disabled={deleteAllReadMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
              Clear read
            </button>
          )}
          {unread.length > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label, activeClass }) => {
          const count = countByType(key);
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={clsx(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? activeClass
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600',
              )}
            >
              {label}
              {count > 0 && (
                <span
                  className={clsx(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                    isActive
                      ? 'bg-white/30 text-white'
                      : 'bg-gray-300 text-gray-700 dark:bg-slate-600 dark:text-gray-300',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-slate-700 dark:bg-slate-800"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 dark:border-slate-600 dark:bg-slate-800/50 sm:p-16">
          <BellOff className="h-10 w-10 text-gray-400" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {activeFilter === 'all' ? 'No notifications yet' : `No ${activeFilter} notifications`}
          </p>
          {activeFilter !== 'all' && (
            <button
              onClick={() => setActiveFilter('all')}
              className="mt-2 text-sm text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Show all
            </button>
          )}
        </div>
      )}

      {/* Unread section */}
      {unread.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Unread · {unread.length}
          </h3>
          {unread.map((n) => (
            <NotifCard
              key={n._id}
              n={n}
              isUnread
              onMarkRead={() => markReadMutation.mutate(n._id)}
              onDelete={() => deleteMutation.mutate(n._id)}
            />
          ))}
        </div>
      )}

      {/* Read section */}
      {read.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Read · {read.length}
          </h3>
          {read.map((n) => (
            <NotifCard
              key={n._id}
              n={n}
              isUnread={false}
              onDelete={() => deleteMutation.mutate(n._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
