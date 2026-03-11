import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  change?: string;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'emerald',
  change,
}: StatsCardProps) {
  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-900/40',
    },
  };

  const c = colorMap[color] ?? colorMap.emerald;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {change && (
            <p
              className={clsx(
                'mt-1 text-xs font-medium',
                change.startsWith('+')
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : change.startsWith('-')
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500',
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className={clsx('rounded-lg p-3', c.iconBg)}>
          <Icon className={clsx('h-6 w-6', c.text)} />
        </div>
      </div>
    </div>
  );
}
