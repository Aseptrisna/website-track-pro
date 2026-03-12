import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, Link2, LinkIcon, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import api from '../../lib/axios';

interface Vehicle {
  _id: string;
  vehicle_name: string;
  vehicle_type: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  status: string;
  device_id?: { _id: string; device_name: string; imei: string } | string | null;
  [key: string]: unknown;
}

interface DeviceOption {
  _id: string;
  device_name: string;
  imei: string;
}

const vehicleTypes = ['truck', 'van', 'car', 'motorcycle', 'bus', 'pickup'];

const emptyForm = {
  vehicle_name: '',
  vehicle_type: 'truck',
  plate_number: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  device_id: '',
};

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery<{ data: Vehicle[]; total: number }>({
    queryKey: ['vehicles', page, search],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', {
        params: { page, limit: 10, search },
      });
      return data;
    },
  });

  // Fetch devices for linking dropdown
  const { data: deviceOptions } = useQuery<DeviceOption[]>({
    queryKey: ['devices-options'],
    queryFn: async () => {
      const { data } = await api.get('/devices', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof emptyForm) => {
      const payload = { ...values, device_id: values.device_id || undefined };
      if (editingId) {
        return api.put(`/vehicles/${editingId}`, payload);
      }
      return api.post('/vehicles', payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Vehicle updated' : 'Vehicle added');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save vehicle');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => {
      toast.success('Vehicle deleted');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete vehicle'),
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = (v: Vehicle) => {
    const linkedDeviceId = v.device_id
      ? typeof v.device_id === 'string' ? v.device_id : v.device_id._id
      : '';
    setEditingId(v._id);
    setForm({
      vehicle_name: v.vehicle_name,
      vehicle_type: v.vehicle_type,
      plate_number: v.plate_number,
      brand: v.brand || '',
      model: v.model || '',
      year: v.year || new Date().getFullYear(),
      device_id: linkedDeviceId,
    });
    setModalOpen(true);
  };

  const getDeviceLabel = (v: Vehicle) => {
    if (!v.device_id) return null;
    if (typeof v.device_id === 'string') return v.device_id;
    return `${v.device_id.device_name} (${v.device_id.imei})`;
  };

  const columns: Column<Vehicle>[] = [
    { key: 'vehicle_name', label: 'Name' },
    {
      key: 'vehicle_type',
      label: 'Type',
      render: (v) => (
        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium capitalize text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
          {v.vehicle_type}
        </span>
      ),
    },
    { key: 'plate_number', label: 'Plate' },
    {
      key: 'device_id',
      label: 'GPS Device',
      render: (v) => {
        const label = getDeviceLabel(v);
        return label ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            <Cpu className="h-3 w-3" />
            {label}
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">No device</span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
            v.status === 'active'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
          }`}
        >
          {v.status || 'active'}
        </span>
      ),
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Vehicles</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your registered vehicles
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
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search vehicles..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <DataTable<Vehicle>
        columns={columns}
        data={data?.data ?? []}
        total={data?.total}
        page={page}
        limit={10}
        onPageChange={setPage}
        loading={isLoading}
        actions={(v) => (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => openEdit(v)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleteId(v._id)}
              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Vehicle' : 'Add Vehicle'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Vehicle Name
            </label>
            <input
              type="text"
              required
              value={form.vehicle_name}
              onChange={(e) => setForm({ ...form, vehicle_name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type
              </label>
              <select
                value={form.vehicle_type}
                onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                className={inputClass}
              >
                {vehicleTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Plate Number
              </label>
              <input
                type="text"
                required
                value={form.plate_number}
                onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Brand
              </label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Model
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Year
              </label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                GPS Device
              </span>
            </label>
            <select
              value={form.device_id}
              onChange={(e) => setForm({ ...form, device_id: e.target.value })}
              className={inputClass}
            >
              <option value="">— No device linked —</option>
              {deviceOptions?.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.device_name} ({d.imei})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Link a GPS device to enable real-time tracking
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
        title="Delete Vehicle"
        message="Are you sure you want to delete this vehicle? This action cannot be undone."
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
