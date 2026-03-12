import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, Wifi, WifiOff, Link2, LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import api from '../../lib/axios';

interface Device {
  _id: string;
  imei: string;
  device_name: string;
  phone_number: string;
  status: string;
  last_seen: string;
  vehicle_id?: { _id: string; vehicle_name: string; plate_number: string } | string | null;
  [key: string]: unknown;
}

interface VehicleOption {
  _id: string;
  vehicle_name: string;
  plate_number: string;
}

const emptyForm = { imei: '', device_name: '', phone_number: '', vehicle_id: '' };

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery<{ data: Device[]; total: number }>({
    queryKey: ['devices', page, search],
    queryFn: async () => {
      const { data } = await api.get('/devices', { params: { page, limit: 10, search } });
      return data;
    },
  });

  // Fetch vehicles for linking dropdown
  const { data: vehicleOptions } = useQuery<VehicleOption[]>({
    queryKey: ['vehicles-options'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof emptyForm) => {
      const payload = { ...values, vehicle_id: values.vehicle_id || undefined };
      if (editingId) return api.put(`/devices/${editingId}`, payload);
      return api.post('/devices', payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Device updated' : 'Device added');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/devices/${id}`),
    onSuccess: () => {
      toast.success('Device deleted');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete device'),
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = (d: Device) => {
    const linkedVehicleId = d.vehicle_id
      ? typeof d.vehicle_id === 'string' ? d.vehicle_id : d.vehicle_id._id
      : '';
    setEditingId(d._id);
    setForm({
      imei: d.imei,
      device_name: d.device_name,
      phone_number: d.phone_number || '',
      vehicle_id: linkedVehicleId,
    });
    setModalOpen(true);
  };

  const getVehicleLabel = (d: Device) => {
    if (!d.vehicle_id) return null;
    if (typeof d.vehicle_id === 'string') return d.vehicle_id;
    return `${d.vehicle_id.vehicle_name} (${d.vehicle_id.plate_number})`;
  };

  const columns: Column<Device>[] = [
    { key: 'device_name', label: 'Name' },
    { key: 'imei', label: 'IMEI' },
    {
      key: 'vehicle_id',
      label: 'Vehicle',
      render: (d) => {
        const label = getVehicleLabel(d);
        return label ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <LinkIcon className="h-3 w-3" />
            {label}
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">Not linked</span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (d) => (
        <div className="flex items-center gap-1.5">
          {d.status === 'online' ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-gray-400" />
          )}
          <span
            className={`text-xs font-medium capitalize ${
              d.status === 'online'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {d.status || 'offline'}
          </span>
        </div>
      ),
    },
    {
      key: 'last_seen',
      label: 'Last Seen',
      render: (d) =>
        d.last_seen ? new Date(d.last_seen).toLocaleString('id-ID') : '—',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GPS Devices</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your GPS tracking devices
          </p>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setModalOpen(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Add Device
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search devices..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <DataTable<Device>
        columns={columns}
        data={data?.data ?? []}
        total={data?.total}
        page={page}
        limit={10}
        onPageChange={setPage}
        loading={isLoading}
        actions={(d) => (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => openEdit(d)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleteId(d._id)}
              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? 'Edit Device' : 'Add Device'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Device Name</label>
            <input
              type="text"
              required
              value={form.device_name}
              onChange={(e) => setForm({ ...form, device_name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">IMEI</label>
            <input
              type="text"
              required
              value={form.imei}
              onChange={(e) => setForm({ ...form, imei: e.target.value })}
              className={inputClass}
              disabled={!!editingId}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
            <input
              type="text"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                Link to Vehicle
              </span>
            </label>
            <select
              value={form.vehicle_id}
              onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
              className={inputClass}
            >
              <option value="">— No vehicle linked —</option>
              {vehicleOptions?.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.vehicle_name} ({v.plate_number})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Link this device to a vehicle to track its position
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saveMutation.isPending && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Device"
        message="Are you sure you want to delete this device?"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
