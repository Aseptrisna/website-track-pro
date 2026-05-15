import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Polygon, Popup, useMapEvents } from 'react-leaflet';
import { LatLng } from 'leaflet';
import {
  Plus, Trash2, Pencil, ShieldCheck, ShieldAlert, Package,
  MousePointer2, CheckCheck, X, MapPin,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Geofence {
  _id: string;
  name: string;
  type: 'restricted' | 'operational' | 'delivery_zone';
  polygon_coordinates: [number, number][];
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  restricted:     { label: 'Restricted',     color: '#ef4444', fillColor: '#ef4444', icon: ShieldAlert,  badgeCls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  operational:    { label: 'Operational',    color: '#10b981', fillColor: '#10b981', icon: ShieldCheck,  badgeCls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  delivery_zone:  { label: 'Delivery Zone',  color: '#3b82f6', fillColor: '#3b82f6', icon: Package,      badgeCls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
} as const;

// ─── Drawing handler (inside map context) ─────────────────────────────────────
function DrawingHandler({
  drawing,
  onAddPoint,
  onFinishDraw,
}: {
  drawing: boolean;
  onAddPoint: (latlng: LatLng) => void;
  onFinishDraw: () => void;
}) {
  useMapEvents({
    click(e) {
      if (drawing) onAddPoint(e.latlng);
    },
    dblclick(e) {
      if (drawing) {
        e.originalEvent.preventDefault();
        onFinishDraw();
      }
    },
  });
  return null;
}

// ─── Save Zone Modal ──────────────────────────────────────────────────────────
function SaveModal({
  points,
  editGeofence,
  onSave,
  onCancel,
  isPending,
}: {
  points: [number, number][];
  editGeofence: Geofence | null;
  onSave: (name: string, type: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(editGeofence?.name ?? '');
  const [type, setType] = useState<string>(editGeofence?.type ?? 'operational');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {editGeofence ? 'Edit Geofence' : 'Save Zone'}
        </h3>
        {!editGeofence && (
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            {points.length} vertices drawn
          </p>
        )}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Zone Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Warehouse A"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Zone Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="operational">Operational</option>
              <option value="restricted">Restricted</option>
              <option value="delivery_zone">Delivery Zone</option>
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            disabled={!name.trim() || isPending}
            onClick={() => onSave(name.trim(), type)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GeofencesPage() {
  const queryClient = useQueryClient();

  // Draw state
  const [drawing, setDrawing] = useState(false);
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Edit/delete state
  const [editGeofence, setEditGeofence] = useState<Geofence | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Highlight on hover from list
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: geofences = [], isLoading } = useQuery<Geofence[]>({
    queryKey: ['geofences'],
    queryFn: async () => {
      const { data } = await api.get('/geofences');
      return data;
    },
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['geofences'] });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; type: string; polygon_coordinates: [number, number][] }) =>
      api.post('/geofences', payload),
    onSuccess: () => { toast.success('Geofence created'); invalidate(); resetDraw(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Geofence> }) =>
      api.put(`/geofences/${id}`, payload),
    onSuccess: () => { toast.success('Geofence updated'); invalidate(); setEditGeofence(null); setShowSaveModal(false); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/geofences/${id}`),
    onSuccess: () => { toast.success('Geofence deleted'); invalidate(); setDeleteId(null); },
    onError: () => toast.error('Failed to delete'),
  });

  // ── Drawing logic ────────────────────────────────────────────────────────
  const startDraw = () => {
    setDrawing(true);
    setDraftPoints([]);
    setEditGeofence(null);
  };

  const resetDraw = () => {
    setDrawing(false);
    setDraftPoints([]);
    setShowSaveModal(false);
    setEditGeofence(null);
  };

  const handleAddPoint = useCallback((latlng: LatLng) => {
    setDraftPoints((prev) => [...prev, [latlng.lat, latlng.lng]]);
  }, []);

  const handleFinishDraw = useCallback(() => {
    if (draftPoints.length < 3) {
      toast.error('Draw at least 3 points to create a zone');
      return;
    }
    setDrawing(false);
    setShowSaveModal(true);
  }, [draftPoints.length]);

  const handleSave = (name: string, type: string) => {
    const geofenceType = type as Geofence['type'];
    if (editGeofence) {
      updateMutation.mutate({ id: editGeofence._id, payload: { name, type: geofenceType } });
    } else {
      createMutation.mutate({ name, type: geofenceType, polygon_coordinates: draftPoints });
    }
  };

  const openEdit = (g: Geofence) => {
    setEditGeofence(g);
    setShowSaveModal(true);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row">

      {/* ── Left panel: list ── */}
      <div className="flex w-full flex-col lg:w-80 lg:shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Geofences</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {geofences.length} zone{geofences.length !== 1 ? 's' : ''} defined
            </p>
          </div>
          <button
            onClick={drawing ? resetDraw : startDraw}
            className={clsx(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              drawing
                ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-emerald-600 text-white hover:bg-emerald-700',
            )}
          >
            {drawing ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Draw Zone</>}
          </button>
        </div>

        {/* Drawing tip */}
        {drawing && (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
            <div className="flex items-start gap-2">
              <MousePointer2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="text-xs text-emerald-700 dark:text-emerald-300">
                <p className="font-medium">Drawing mode active</p>
                <p className="mt-0.5">Click on the map to add vertices. Double-click or press Finish to complete.</p>
                <p className="mt-1 font-semibold">{draftPoints.length} point{draftPoints.length !== 1 ? 's' : ''} added</p>
              </div>
            </div>
            {draftPoints.length >= 3 && (
              <button
                onClick={handleFinishDraw}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Finish & Save
              </button>
            )}
          </div>
        )}

        {/* Geofence list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-700" />
            ))
          ) : geofences.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-10 dark:border-slate-600 dark:bg-slate-800/50">
              <MapPin className="h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-400">No zones yet</p>
              <p className="text-xs text-gray-400">Click "Draw Zone" to get started</p>
            </div>
          ) : (
            geofences.map((g) => {
              const cfg = TYPE_CONFIG[g.type] ?? TYPE_CONFIG.operational;
              const Icon = cfg.icon;
              const isHovered = hoveredId === g._id;
              return (
                <div
                  key={g._id}
                  onMouseEnter={() => setHoveredId(g._id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={clsx(
                    'flex items-center gap-3 rounded-xl border p-3 transition-colors',
                    isHovered
                      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                      : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800',
                  )}
                >
                  <div className={clsx('rounded-lg p-2 shrink-0', cfg.badgeCls)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{g.name}</p>
                    <span className={clsx('text-xs font-medium', cfg.badgeCls.replace('bg-', 'text-').split(' ')[1])}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openEdit(g)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                      title="Rename / retype"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(g._id)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Legend */}
        {geofences.length > 0 && (
          <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Legend</p>
            <div className="space-y-1.5">
              {(Object.entries(TYPE_CONFIG) as [string, typeof TYPE_CONFIG['operational']][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: cfg.color, opacity: 0.7 }} />
                    <Icon className="h-3 w-3" style={{ color: cfg.color }} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel: map ── */}
      <div className="relative min-h-[400px] flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
        {drawing && (
          <div className="pointer-events-none absolute inset-0 z-[999] rounded-xl ring-2 ring-emerald-500 ring-inset" />
        )}
        <MapContainer
          center={[-6.2, 106.816]}
          zoom={12}
          className={clsx('h-full w-full', drawing && 'cursor-crosshair')}
          doubleClickZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          <DrawingHandler
            drawing={drawing}
            onAddPoint={handleAddPoint}
            onFinishDraw={handleFinishDraw}
          />

          {/* Saved geofences */}
          {geofences.map((g) => {
            const cfg = TYPE_CONFIG[g.type] ?? TYPE_CONFIG.operational;
            const isHovered = hoveredId === g._id;
            return (
              <Polygon
                key={g._id}
                positions={g.polygon_coordinates as [number, number][]}
                pathOptions={{
                  color: cfg.color,
                  fillColor: cfg.fillColor,
                  fillOpacity: isHovered ? 0.35 : 0.18,
                  weight: isHovered ? 3 : 2,
                  dashArray: g.type === 'restricted' ? '6 4' : undefined,
                }}
                eventHandlers={{
                  mouseover: () => setHoveredId(g._id),
                  mouseout:  () => setHoveredId(null),
                }}
              >
                <Popup>
                  <div className="text-sm font-semibold">{g.name}</div>
                  <div className="text-xs capitalize text-gray-500">{g.type.replace('_', ' ')}</div>
                  <div className="text-xs text-gray-400">{g.polygon_coordinates.length} vertices</div>
                </Popup>
              </Polygon>
            );
          })}

          {/* Draft polygon while drawing */}
          {draftPoints.length >= 2 && (
            <Polygon
              positions={draftPoints as [number, number][]}
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2, weight: 2, dashArray: '6 3' }}
            />
          )}
        </MapContainer>
      </div>

      {/* ── Save / Edit Modal ── */}
      {showSaveModal && (
        <SaveModal
          points={draftPoints}
          editGeofence={editGeofence}
          onSave={handleSave}
          onCancel={resetDraw}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Geofence"
        message="Are you sure you want to delete this zone? Active alerts for this zone will stop working."
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
