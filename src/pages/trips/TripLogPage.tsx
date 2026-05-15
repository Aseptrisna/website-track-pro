import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  Route, Car, Clock, Gauge, MapPin, Download,
  ChevronDown, ChevronUp, TrendingUp, Navigation,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface VehicleOption {
  _id: string;
  vehicle_name: string;
  plate_number: string;
}

interface Trip {
  startTime:   string;
  endTime:     string;
  durationMin: number;
  distanceKm:  number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  pointCount:  number;
  startLat:    number;
  startLng:    number;
  endLat:      number;
  endLng:      number;
  path:        [number, number][];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const startIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33], iconAnchor: [10, 33],
});

function endSvgIcon() {
  return L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,.4)"></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// ─── Trip map (shown when expanded) ──────────────────────────────────────────
function TripMap({ trip }: { trip: Trip }) {
  const center: [number, number] = [trip.startLat, trip.startLng];
  return (
    <MapContainer
      center={center}
      zoom={13}
      className="h-56 w-full rounded-lg"
      scrollWheelZoom={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {trip.path.length > 1 && (
        <Polyline positions={trip.path} color="#10b981" weight={3} opacity={0.85} />
      )}
      <Marker position={[trip.startLat, trip.startLng]} icon={startIcon}>
        <Popup>Start: {fmtTime(trip.startTime)}</Popup>
      </Marker>
      <Marker position={[trip.endLat, trip.endLng]} icon={endSvgIcon()}>
        <Popup>End: {fmtTime(trip.endTime)}</Popup>
      </Marker>
    </MapContainer>
  );
}

// ─── Trip Card ────────────────────────────────────────────────────────────────
function TripCard({ trip, index }: { trip: Trip; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const speedColor = trip.maxSpeedKmh > 100 ? 'text-red-500' : trip.maxSpeedKmh > 80 ? 'text-amber-500' : 'text-gray-500';

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-800">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-700/40 text-left"
      >
        {/* Trip number badge */}
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          {/* Date + time range */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {fmtDate(trip.startTime)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {fmtTime(trip.startTime)} → {fmtTime(trip.endTime)}
            </span>
          </div>

          {/* Stats row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Route className="h-3.5 w-3.5" />
              <strong>{trip.distanceKm.toFixed(1)} km</strong>
            </span>
            <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              {fmtDuration(trip.durationMin)}
            </span>
            <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Gauge className="h-3.5 w-3.5" />
              avg {trip.avgSpeedKmh} km/h
            </span>
            <span className={clsx('flex items-center gap-1', speedColor)}>
              <TrendingUp className="h-3.5 w-3.5" />
              max {trip.maxSpeedKmh} km/h
            </span>
            <span className="text-gray-400">{trip.pointCount} pts</span>
          </div>
        </div>

        {/* Expand icon */}
        <span className="mt-1 shrink-0 text-gray-400">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Expanded map */}
      {expanded && (
        <div className="border-t border-gray-100 p-3 dark:border-slate-700">
          <TripMap trip={trip} />
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
            <div className="rounded-lg bg-gray-50 p-2 dark:bg-slate-900/40">
              <p className="text-gray-400">Start</p>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                {trip.startLat.toFixed(5)}, {trip.startLng.toFixed(5)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 dark:bg-slate-900/40">
              <p className="text-gray-400">End</p>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                {trip.endLat.toFixed(5)}, {trip.endLng.toFixed(5)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 dark:bg-slate-900/40">
              <p className="text-gray-400">Duration</p>
              <p className="font-medium text-gray-700 dark:text-gray-300">{fmtDuration(trip.durationMin)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 dark:bg-slate-900/40">
              <p className="text-gray-400">Distance</p>
              <p className="font-medium text-gray-700 dark:text-gray-300">{trip.distanceKm.toFixed(2)} km</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TripLogPage() {
  const today     = new Date().toISOString().slice(0, 10);
  const weekAgo   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [vehicleId, setVehicleId] = useState('');
  const [from, setFrom]           = useState(weekAgo);
  const [to, setTo]               = useState(today);
  const [submitted, setSubmitted] = useState(false);

  const { data: vehicleOptions } = useQuery<VehicleOption[]>({
    queryKey: ['vehicles-options'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  const { data: trips, isLoading, isFetching } = useQuery<Trip[]>({
    queryKey: ['trips', vehicleId, from, to],
    queryFn: async () => {
      const { data } = await api.get(`/gps-data/trips/${vehicleId}`, {
        params: {
          startDate: new Date(from).toISOString(),
          endDate:   new Date(to + 'T23:59:59').toISOString(),
        },
      });
      return data;
    },
    enabled: !!vehicleId && submitted,
    placeholderData: (prev) => prev,
  });

  // ── Summary stats ────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (!trips?.length) return null;
    return {
      totalTrips:    trips.length,
      totalDistKm:   trips.reduce((s, t) => s + t.distanceKm, 0),
      totalDurationMin: trips.reduce((s, t) => s + t.durationMin, 0),
      avgDistKm:     trips.reduce((s, t) => s + t.distanceKm, 0) / trips.length,
      maxSpeedKmh:   Math.max(...trips.map((t) => t.maxSpeedKmh)),
    };
  }, [trips]);

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['#', 'Date', 'Start', 'End', 'Duration', 'Distance (km)', 'Avg Speed (km/h)', 'Max Speed (km/h)', 'Points'],
      ...(trips ?? []).map((t, i) => [
        i + 1,
        fmtDate(t.startTime),
        fmtTime(t.startTime),
        fmtTime(t.endTime),
        fmtDuration(t.durationMin),
        t.distanceKm.toFixed(2),
        t.avgSpeedKmh,
        t.maxSpeedKmh,
        t.pointCount,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'trip-log.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedVehicle = vehicleOptions?.find((v) => v._id === vehicleId);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trip Log</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            GPS-detected trips with distance, duration, and route map
          </p>
        </div>
        {trips && trips.length > 0 && (
          <button onClick={exportCSV}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        )}
      </div>

      {/* Search form */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Vehicle */}
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              <Car className="inline h-3.5 w-3.5 mr-1" />Vehicle
            </label>
            <select
              value={vehicleId}
              onChange={(e) => { setVehicleId(e.target.value); setSubmitted(false); }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="">— Select vehicle —</option>
              {vehicleOptions?.map((v) => (
                <option key={v._id} value={v._id}>{v.vehicle_name} ({v.plate_number})</option>
              ))}
            </select>
          </div>

          {/* From */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">From</label>
            <input type="date" value={from} max={to}
              onChange={(e) => { setFrom(e.target.value); setSubmitted(false); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
          </div>

          {/* To */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">To</label>
            <input type="date" value={to} min={from} max={today}
              onChange={(e) => { setTo(e.target.value); setSubmitted(false); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
          </div>

          <button
            onClick={() => { if (vehicleId) setSubmitted(true); }}
            disabled={!vehicleId || isFetching}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isFetching ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            Detect Trips
          </button>
        </div>
      </div>

      {/* Summary stats (shown when results exist) */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { icon: Route,     label: 'Total Trips',    value: String(summary.totalTrips),                        color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
            { icon: MapPin,    label: 'Total Distance',  value: `${summary.totalDistKm.toFixed(1)} km`,             color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
            { icon: Clock,     label: 'Total Drive Time', value: fmtDuration(summary.totalDurationMin),              color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
            { icon: Navigation, label: 'Avg Trip Dist',  value: `${summary.avgDistKm.toFixed(1)} km`,               color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
            { icon: TrendingUp, label: 'Top Speed',      value: `${summary.maxSpeedKmh} km/h`,                      color: summary.maxSpeedKmh > 100 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className={clsx('rounded-lg p-2 shrink-0', color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-base font-bold text-gray-900 dark:text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trip list */}
      {!submitted && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 dark:border-slate-600 dark:bg-slate-800/50">
          <Route className="h-10 w-10 text-gray-300 dark:text-slate-600" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Select a vehicle and date range, then click Detect Trips</p>
        </div>
      )}

      {submitted && isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-slate-700 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {submitted && !isLoading && trips?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 dark:border-slate-600 dark:bg-slate-800/50">
          <Route className="h-8 w-8 text-gray-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">No trips detected</p>
          <p className="mt-1 text-xs text-gray-400">
            No GPS movement data found for{' '}
            {selectedVehicle ? `${selectedVehicle.vehicle_name} ` : ''}
            between {from} and {to}
          </p>
        </div>
      )}

      {submitted && !isLoading && trips && trips.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 dark:text-slate-500">
            {trips.length} trip{trips.length !== 1 ? 's' : ''} detected for{' '}
            <span className="font-medium text-gray-600 dark:text-gray-300">
              {selectedVehicle?.vehicle_name}
            </span>
            {' '}from {from} to {to}. Click a trip to see the route map.
          </p>
          {trips.map((trip, i) => (
            <TripCard key={i} trip={trip} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
