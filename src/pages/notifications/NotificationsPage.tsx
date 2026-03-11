import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Check, CheckCheck, Mail, AlertTriangle, Info } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../../lib/axios';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  read_status: boolean;
  timestamp: string;
}

const typeIcons: Record<string, typeof Bell> = {
  alert: AlertTriangle,
  info: Info,
  email: Mail,
};

const typeColors: Record<string, string> = {
  alert: 'text-red-500 bg-red-100 dark:bg-red-900/30',
  info: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  email: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();

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
      return data.count ?? data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const unread = notifications?.filter((n) => !n.read_status) ?? [];
  const read = notifications?.filter((n) => n.read_status) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {typeof unreadCount === 'number' ? `${unreadCount} unread` : '...'} notifications
          </p>
        </div>
        {unread.length > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-skeleton rounded-xl border border-gray-200 bg-gray-100 dark:border-slate-700 dark:bg-slate-800"
            />
          ))}
        </div>
      )}

      {!isLoading && notifications?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 dark:border-slate-600 dark:bg-slate-800/50 sm:p-16">
          <BellOff className="h-10 w-10 text-gray-400" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
        </div>
      )}

      {/* Unread */}
      {unread.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Unread
          </h3>
          {unread.map((n) => {
            const Icon = typeIcons[n.type] || Bell;
            const color = typeColors[n.type] || 'text-gray-500 bg-gray-100 dark:bg-slate-700';
            return (
              <div
                key={n._id}
                className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/10 sm:gap-4 sm:p-4"
              >
                <div className={clsx('rounded-lg p-2', color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{n.title}</p>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(n.timestamp).toLocaleString('id-ID')}
                  </p>
                </div>
                <button
                  onClick={() => markReadMutation.mutate(n._id)}
                  className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  title="Mark as read"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Read */}
      {read.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Read
          </h3>
          {read.map((n) => {
            const Icon = typeIcons[n.type] || Bell;
            const color = typeColors[n.type] || 'text-gray-500 bg-gray-100 dark:bg-slate-700';
            return (
              <div
                key={n._id}
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 opacity-70 dark:border-slate-700 dark:bg-slate-800 sm:gap-4 sm:p-4"
              >
                <div className={clsx('rounded-lg p-2', color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{n.title}</p>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(n.timestamp).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
