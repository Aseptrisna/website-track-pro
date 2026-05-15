import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, Search, Package,
  ArrowRight, Truck, Clock, CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Shipment {
  _id: string;
  shipment_code: string;
  origin: string;
  destination: string;
  product?: string;
  quantity?: number;
  departure_time?: string;
  arrival_time?: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  vehicle?: { _id: string; vehicle_name: string; plate_number: string } | null;
  driver?: { _id: string; name: string } | null;
  createdAt?: string;
  [key: string]: unknown;
}

interface VehicleOption { _id: string; vehicle_name: string; plate_number: string }
interface DriverOption  { _id: string; name: string }

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:    { label: 'Pending',    icon: Clock,         cls: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400' },
  in_transit: { label: 'In Transit', icon: Truck,         cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  delivered:  { label: 'Delivered',  icon: CheckCircle2,  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  cancelled:  { label: 'Cancelled',  icon: XCircle,       cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
} as const;

type FilterStatus = 'all' | keyof typeof STATUS_CFG;

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'pending',    label: 'Pending' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered',  label: 'Delivered' },
  { key: 'cancelled',  label: 'Cancelled' },
];

const NEXT_STATUS: Partial<Record<keyof typeof STATUS_CFG, keyof typeof STATUS_CFG>> = {
  pending:    'in_transit',
  in_transit: 'delivered',
};

const emptyForm = {
  shipment_code: '',
  origin: '',
  destination: '',
  product: '',
  quantity: '' as string | number,
  departure_time: '',
  arrival_time: '',
  status: 'pending' as keyof typeof STATUS_CFG,
  vehicle: '',
  driver: '',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: keyof typeof STATUS_CFG }) {
  const { label, icon: Icon, cls } = STATUS_CFG[status] ?? STATUS_CFG.pending;
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', cls)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ShipmentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<FilterStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]       = useState(emptyForm);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<{ data: Shipment[]; total: number }>({
    queryKey: ['shipments', page, search, filter],
    queryFn: async () => {
      const { data } = await api.get('/shipments', {
        params: { page, limit: 10, search: search || undefined, status: filter === 'all' ? undefined : filter },
      });
      return data;
    },
  });

  const { data: vehicles } = useQuery<VehicleOption[]>({
    queryKey: ['vehicles-options'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  const { data: drivers } = useQuery<DriverOption[]>({
    queryKey: ['drivers-options'],
    queryFn: async () => {
      const { data } = await api.get('/drivers', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['shipments'] });

  const saveMutation = useMutation({
    mutationFn: (values: typeof emptyForm) => {
      const payload: Record<string, unknown> = {
        shipment_code:  values.shipment_code,
        origin:         values.origin,
        destination:    values.destination,
        product:        values.product || undefined,
        quantity:       values.quantity !== '' ? Number(values.quantity) : undefined,
        departure_time: values.departure_time || undefined,
        arrival_time:   values.arrival_time || undefined,
        status:         values.status,
        vehicle:        values.vehicle || undefined,
        driver:         values.driver || undefined,
      };
      return editingId ? api.put(`/shipments/${editingId}`, payload) : api.post('/shipments', payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Shipment updated' : 'Shipment created');
      invalidate();
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/shipments/${id}`, { status }),
    onSuccess: (_d, { status }) => {
      toast.success(`Marked as ${STATUS_CFG[status as keyof typeof STATUS_CFG]?.label ?? status}`);
      invalidate();
    },
    onError: () => toast.error('Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/shipments/${id}`),
    onSuccess: () => { toast.success('Shipment deleted'); invalidate(); setDeleteId(null); },
    onError: () => toast.error('Failed to delete'),
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = (s: Shipment) => {
    setEditingId(s._id);
    const vehicleId = s.vehicle ? (typeof s.vehicle === 'string' ? s.vehicle : s.vehicle._id) : '';
    const driverId  = s.driver  ? (typeof s.driver  === 'string' ? s.driver  : s.driver._id)  : '';
    setForm({
      shipment_code:  s.shipment_code,
      origin:         s.origin,
      destination:    s.destination,
      product:        s.product ?? '',
      quantity:       s.quantity ?? '',
      departure_time: s.departure_time ? s.departure_time.slice(0, 16) : '',
      arrival_time:   s.arrival_time   ? s.arrival_time.slice(0, 16)   : '',
      status:         s.status,
      vehicle:        vehicleId,
      driver:         driverId,
    });
    setModalOpen(true);
  };

  const autoCode = () => {
    const now = new Date();
    const code = `SHP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000) + 1000}`;
    setForm((f) => ({ ...f, shipment_code: code }));
  };

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns: Column<Shipment>[] = [
    {
      key: 'shipment_code',
      label: 'Shipment',
      render: (s) => (
        <div>
          <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{s.shipment_code}</p>
          {s.product && <p className="text-xs text-gray-400">{s.product}{s.quantity ? ` · ${s.quantity} pcs` : ''}</p>}
        </div>
      ),
    },
    {
      key: 'origin',
      label: 'Route',
      render: (s) => (
        <div className="flex items-center gap-1.5 text-sm">
          <span className="max-w-[80px] truncate text-gray-600 dark:text-gray-300">{s.origin}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="max-w-[80px] truncate text-gray-600 dark:text-gray-300">{s.destination}</span>
        </div>
      ),
    },
    {
      key: 'vehicle',
      label: 'Vehicle',
      render: (s) => s.vehicle && typeof s.vehicle === 'object' ? (
        <span className="text-sm text-gray-700 dark:text-gray-300">{s.vehicle.vehicle_name}<br /><span className="text-xs text-gray-400">{s.vehicle.plate_number}</span></span>
      ) : <span className="text-xs italic text-gray-400">—</span>,
    },
    {
      key: 'driver',
      label: 'Driver',
      render: (s) => s.driver && typeof s.driver === 'object'
        ? <span className="text-sm text-gray-700 dark:text-gray-300">{s.driver.name}</span>
        : <span className="text-xs italic text-gray-400">—</span>,
    },
    {
      key: 'departure_time',
      label: 'Departure',
      render: (s) => <span className="text-xs text-gray-500">{fmtDate(s.departure_time)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (s) => <StatusBadge status={s.status} />,
    },
  ];

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white';

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shipments</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track and manage delivery shipments</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setModalOpen(true); }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 sm:w-auto"
        >
          <Plus className="h-4 w-4" /> New Shipment
        </button>
      </div>

      {/* Filter + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search code, origin, destination..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setPage(1); }}
              className={clsx(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                filter === key
                  ? key === 'all'
                    ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900'
                    : STATUS_CFG[key as keyof typeof STATUS_CFG]?.cls
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <DataTable<Shipment>
        columns={columns}
        data={data?.data ?? []}
        total={data?.total}
        page={page}
        limit={10}
        onPageChange={setPage}
        loading={isLoading}
        actions={(s) => {
          const next = NEXT_STATUS[s.status];
          return (
            <div className="flex items-center justify-end gap-1">
              {next && (
                <button
                  onClick={() => statusMutation.mutate({ id: s._id, status: next })}
                  disabled={statusMutation.isPending}
                  title={`Mark as ${STATUS_CFG[next].label}`}
                  className={clsx(
                    'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
                    STATUS_CFG[next].cls,
                    'hover:opacity-80',
                  )}
                >
                  {statusMutation.isPending
                    ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    : <RefreshCw className="h-3 w-3" />}
                  {STATUS_CFG[next].label}
                </button>
              )}
              <button
                onClick={() => openEdit(s)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeleteId(s._id)}
                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        }}
      />

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? 'Edit Shipment' : 'New Shipment'}>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">

          {/* Shipment code */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Shipment Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={form.shipment_code}
                onChange={(e) => setForm({ ...form, shipment_code: e.target.value })}
                placeholder="e.g. SHP-2025001"
                className={clsx(inputClass, 'flex-1 font-mono')}
              />
              {!editingId && (
                <button type="button" onClick={autoCode} className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-400 dark:hover:bg-slate-700">
                  Auto
                </button>
              )}
            </div>
          </div>

          {/* Route */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Origin</label>
              <input type="text" required value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Destination</label>
              <input type="text" required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className={inputClass} />
            </div>
          </div>

          {/* Product */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Product / Cargo</label>
              <input type="text" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className={inputClass} placeholder="Optional" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
              <input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputClass} placeholder="Optional" />
            </div>
          </div>

          {/* Vehicle + Driver */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle</label>
              <select value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} className={inputClass}>
                <option value="">— None —</option>
                {vehicles?.map((v) => <option key={v._id} value={v._id}>{v.vehicle_name} ({v.plate_number})</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Driver</label>
              <select value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} className={inputClass}>
                <option value="">— None —</option>
                {drivers?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Departure Time</label>
              <input type="datetime-local" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Arrival Time</label>
              <input type="datetime-local" value={form.arrival_time} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })} className={inputClass} />
            </div>
          </div>

          {/* Status (edit only) */}
          {editingId && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as keyof typeof STATUS_CFG })} className={inputClass}>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={closeModal} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button type="submit" disabled={saveMutation.isPending} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {saveMutation.isPending && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              <Package className="h-4 w-4" />
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Shipment"
        message="Are you sure you want to delete this shipment?"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
