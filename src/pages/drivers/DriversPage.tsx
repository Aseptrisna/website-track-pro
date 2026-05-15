import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, Search,
  AlertTriangle, CheckCircle, Clock, UserRound,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import api from '../../lib/axios';

interface Driver {
  _id: string;
  name: string;
  license_number: string;
  license_expiry_date?: string;
  phone: string;
  address?: string;
  notes?: string;
  status: string;
  assigned_vehicle?: { _id: string; vehicle_name: string; plate_number: string } | null;
  [key: string]: unknown;
}

interface VehicleOption { _id: string; vehicle_name: string; plate_number: string }

const emptyForm = {
  name: '',
  license_number: '',
  license_expiry_date: '',
  phone: '',
  address: '',
  notes: '',
  status: 'active',
  assigned_vehicle: '',
};

// ─── License expiry helper ────────────────────────────────────────────────────
type ExpiryStatus = 'expired' | 'expiring' | 'ok' | 'none';

function getLicenseStatus(date?: string): ExpiryStatus {
  if (!date) return 'none';
  const now = Date.now();
  const expiry = new Date(date).getTime();
  if (expiry < now) return 'expired';
  if (expiry - now <= 30 * 24 * 60 * 60 * 1000) return 'expiring';
  return 'ok';
}

function LicenseBadge({ date }: { date?: string }) {
  const status = getLicenseStatus(date);
  if (status === 'none') return <span className="text-xs italic text-gray-400">—</span>;

  const cfg = {
    expired:  { icon: AlertTriangle, label: 'Expired',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    expiring: { icon: Clock,         label: 'Expiring',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    ok:       { icon: CheckCircle,   label: 'Valid',     cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  } as const;

  const { icon: Icon, label, cls } = cfg[status];
  const formatted = new Date(date!).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div>
      <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', cls)}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <p className="mt-0.5 text-xs text-gray-400">{formatted}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DriversPage() {
  const queryClient = useQueryClient();
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]       = useState(emptyForm);

  const { data, isLoading } = useQuery<{ data: Driver[]; total: number }>({
    queryKey: ['drivers', page, search],
    queryFn: async () => {
      const { data } = await api.get('/drivers', { params: { page, limit: 10, search } });
      return data;
    },
  });

  const { data: vehicleOptions } = useQuery<VehicleOption[]>({
    queryKey: ['vehicles-options'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['drivers'] });

  const saveMutation = useMutation({
    mutationFn: (values: typeof emptyForm) => {
      const payload: Record<string, unknown> = {
        name: values.name,
        license_number: values.license_number,
        license_expiry_date: values.license_expiry_date || undefined,
        phone: values.phone,
        address: values.address || undefined,
        notes: values.notes || undefined,
        status: values.status,
        assigned_vehicle: values.assigned_vehicle || undefined,
      };
      return editingId ? api.put(`/drivers/${editingId}`, payload) : api.post('/drivers', payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Driver updated' : 'Driver added');
      invalidate();
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/drivers/${id}`),
    onSuccess: () => { toast.success('Driver deleted'); invalidate(); setDeleteId(null); },
    onError: () => toast.error('Failed to delete driver'),
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = (d: Driver) => {
    setEditingId(d._id);
    const vehicleId = d.assigned_vehicle
      ? (typeof d.assigned_vehicle === 'string' ? d.assigned_vehicle : d.assigned_vehicle._id)
      : '';
    setForm({
      name: d.name,
      license_number: d.license_number || '',
      license_expiry_date: d.license_expiry_date ? d.license_expiry_date.slice(0, 10) : '',
      phone: d.phone || '',
      address: d.address || '',
      notes: d.notes || '',
      status: d.status || 'active',
      assigned_vehicle: vehicleId,
    });
    setModalOpen(true);
  };

  const columns: Column<Driver>[] = [
    {
      key: 'name',
      label: 'Driver',
      render: (d) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <UserRound className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{d.name}</p>
            {d.phone && <p className="text-xs text-gray-400">{d.phone}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'license_number',
      label: 'License No.',
      render: (d) => (
        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
          {d.license_number || <span className="italic text-gray-400 font-sans">—</span>}
        </span>
      ),
    },
    {
      key: 'license_expiry_date',
      label: 'License Expiry',
      render: (d) => <LicenseBadge date={d.license_expiry_date} />,
    },
    {
      key: 'assigned_vehicle',
      label: 'Vehicle',
      render: (d) =>
        d.assigned_vehicle && typeof d.assigned_vehicle === 'object' ? (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {d.assigned_vehicle.vehicle_name}
            <br />
            <span className="text-xs text-gray-400">{d.assigned_vehicle.plate_number}</span>
          </span>
        ) : (
          <span className="text-xs italic text-gray-400">Unassigned</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (d) => (
        <span className={clsx(
          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
          d.status === 'active'    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
          d.status === 'on_leave'  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                     'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400',
        )}>
          {d.status?.replace('_', ' ') || 'active'}
        </span>
      ),
    },
  ];

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Drivers</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage drivers and license status</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setModalOpen(true); }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Add Driver
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search drivers..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <DataTable<Driver>
        columns={columns}
        data={data?.data ?? []}
        total={data?.total}
        page={page}
        limit={10}
        onPageChange={setPage}
        loading={isLoading}
        actions={(d) => (
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => setDeleteId(d._id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? 'Edit Driver' : 'Add Driver'}>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">License Number</label>
              <input type="text" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} className={inputClass} placeholder="e.g. SIM-A-123456" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">License Expiry</label>
              <input type="date" value={form.license_expiry_date} onChange={(e) => setForm({ ...form, license_expiry_date: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Assign Vehicle</label>
            <select value={form.assigned_vehicle} onChange={(e) => setForm({ ...form, assigned_vehicle: e.target.value })} className={inputClass}>
              <option value="">— Unassigned —</option>
              {vehicleOptions?.map((v) => <option key={v._id} value={v._id}>{v.vehicle_name} ({v.plate_number})</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} placeholder="Optional" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputClass} resize-none`} placeholder="Optional" />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={closeModal} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button type="submit" disabled={saveMutation.isPending} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {saveMutation.isPending && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Driver"
        message="Are you sure you want to delete this driver?"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
