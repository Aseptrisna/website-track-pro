import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Car, UserRound, LogIn, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import api from '../../lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AssignmentEvent {
  _id:          string;
  vehicle:      string;
  vehicle_name: string;
  plate_number: string;
  driver:       string | null;
  driver_name:  string | null;
  event:        'assigned' | 'unassigned';
  occurred_at:  string;
}

interface PagedResponse {
  data:        AssignmentEvent[];
  total:       number;
  page:        number;
  limit:       number;
  totalPages:  number;
}

interface Vehicle { _id: string; vehicle_name: string; plate_number: string }
interface Driver  { _id: string; name: string }

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)   return 'just now';
  if (min < 60)  return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr  < 24)  return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7)   return `${day}d ago`;
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AssignmentsPage() {
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [driverFilter,  setDriverFilter]  = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Build query params
  const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  if (vehicleFilter) params.set('vehicleId', vehicleFilter);
  if (driverFilter)  params.set('driverId',  driverFilter);

  const { data, isLoading } = useQuery<PagedResponse>({
    queryKey: ['vehicle-assignments', vehicleFilter, driverFilter, page],
    queryFn: async () => {
      const { data } = await api.get(`/vehicle-assignments?${params}`);
      return data;
    },
  });

  // Fetch vehicles + drivers for filter dropdowns
  const { data: vehiclesRes } = useQuery<{ data: Vehicle[] }>({
    queryKey: ['vehicles-all'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles?limit=200');
      return data;
    },
  });

  const { data: driversRes } = useQuery<{ data: Driver[] }>({
    queryKey: ['drivers-all'],
    queryFn: async () => {
      const { data } = await api.get('/drivers?limit=200');
      return data;
    },
  });

  const vehicles = vehiclesRes?.data ?? [];
  const drivers  = driversRes?.data  ?? [];
  const events   = data?.data        ?? [];

  const handleVehicleChange = (v: string) => { setVehicleFilter(v); setPage(1); };
  const handleDriverChange  = (v: string) => { setDriverFilter(v);  setPage(1); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <ClipboardList className="h-6 w-6" /> Assignment History
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track which driver is assigned to each vehicle over time
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={vehicleFilter}
          onChange={(e) => handleVehicleChange(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200"
        >
          <option value="">All Vehicles</option>
          {vehicles.map((v) => (
            <option key={v._id} value={v._id}>
              {v.vehicle_name} — {v.plate_number}
            </option>
          ))}
        </select>

        <select
          value={driverFilter}
          onChange={(e) => handleDriverChange(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200"
        >
          <option value="">All Drivers</option>
          {drivers.map((d) => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>

        {(vehicleFilter || driverFilter) && (
          <button
            onClick={() => { setVehicleFilter(''); setDriverFilter(''); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-400 dark:hover:bg-slate-700"
          >
            Clear filters
          </button>
        )}

        {data && (
          <span className="ml-auto self-center text-sm text-gray-400">
            {data.total} event{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-20 dark:border-slate-600 dark:bg-slate-800/50">
          <ClipboardList className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-400">No assignment events yet.</p>
          <p className="text-xs text-gray-400">Events are recorded when you assign or remove a driver from a vehicle.</p>
        </div>
      ) : (
        <div className="relative">
          {/* vertical line */}
          <div className="absolute left-[19px] top-0 h-full w-px bg-gray-200 dark:bg-slate-700" />

          <ol className="space-y-1">
            {events.map((ev, idx) => {
              const isAssigned = ev.event === 'assigned';
              return (
                <li key={ev._id} className="relative flex gap-4">
                  {/* dot */}
                  <div
                    className={clsx(
                      'z-10 mt-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2',
                      isAssigned
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : 'border-gray-300 bg-white text-gray-400 dark:border-slate-600 dark:bg-slate-800',
                    )}
                  >
                    {isAssigned
                      ? <LogIn  className="h-4 w-4" />
                      : <LogOut className="h-4 w-4" />
                    }
                  </div>

                  {/* card */}
                  <div
                    className={clsx(
                      'mb-1 flex-1 rounded-xl border p-4',
                      isAssigned
                        ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/40 dark:bg-emerald-900/10'
                        : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800',
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        {/* event badge */}
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            isAssigned
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400',
                          )}
                        >
                          {isAssigned ? <LogIn className="h-2.5 w-2.5" /> : <LogOut className="h-2.5 w-2.5" />}
                          {isAssigned ? 'Assigned' : 'Unassigned'}
                        </span>

                        {/* vehicle */}
                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                          <Car className="h-3.5 w-3.5 text-gray-400" />
                          {ev.vehicle_name}
                          <span className="text-xs font-normal text-gray-400">{ev.plate_number}</span>
                        </div>

                        {/* driver */}
                        {ev.driver_name && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                            <UserRound className="h-3.5 w-3.5 text-gray-400" />
                            {isAssigned ? 'Assigned to' : 'Removed from'}&nbsp;
                            <span className="font-medium">{ev.driver_name}</span>
                          </div>
                        )}
                        {!ev.driver_name && !isAssigned && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-400">
                            <UserRound className="h-3.5 w-3.5" />
                            Driver unassigned
                          </div>
                        )}
                      </div>

                      {/* timestamp */}
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400" title={formatDateTime(ev.occurred_at)}>
                          {timeAgo(ev.occurred_at)}
                        </p>
                        <p className="text-[11px] text-gray-400">{formatDateTime(ev.occurred_at)}</p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
