import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MapContainer, TileLayer, Polyline, Marker,
  CircleMarker, useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Play, Square, Trash2, Navigation, Gauge,
  Cpu, MapPin, Clock, Route, Radio,
  AlertTriangle, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DeviceOption {
  _id: string;
  imei: string;
  device_name: string;
  vehicle_id?: { vehicle_name: string; plate_number: string } | null;
}

type LatLng = [number, number];

// ─── Geo helpers ─────────────────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function interpolate(p1: LatLng, p2: LatLng, frac: number): LatLng {
  return [
    p1[0] + (p2[0] - p1[0]) * frac,
    p1[1] + (p2[1] - p1[1]) * frac,
  ];
}

// ─── Custom moving marker ─────────────────────────────────────────────────────
function movingIcon(course: number) {
  return L.divIcon({
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="44" height="44">
        <circle cx="22" cy="22" r="20" fill="#10b981" fill-opacity="0.25" stroke="#10b981" stroke-width="2"/>
        <circle cx="22" cy="22" r="11" fill="#10b981"/>
        <polygon points="22,9 17,24 22,21 27,24" fill="white"
          transform="rotate(${course},22,22)"/>
      </svg>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

// ─── Waypoint click handler (must be a map child) ────────────────────────────
function ClickHandler({
  drawing,
  onAdd,
}: {
  drawing: boolean;
  onAdd: (p: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (drawing) onAdd([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// ─── Preset locations ─────────────────────────────────────────────────────────
const PRESETS: { label: string; center: LatLng }[] = [
  { label: 'Jakarta',   center: [-6.2088, 106.8456] },
  { label: 'Surabaya',  center: [-7.2575, 112.7521] },
  { label: 'Bandung',   center: [-6.9175, 107.6191] },
  { label: 'Medan',     center: [3.5952,  98.6722]  },
  { label: 'Makassar',  center: [-5.1477, 119.4327] },
];

const TICK_MS = 2000; // simulation tick: 2 seconds

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SimulatorPage() {
  const [selectedImei, setSelectedImei] = useState('');
  const [waypoints, setWaypoints]       = useState<LatLng[]>([]);
  const [speed, setSpeed]               = useState(60);
  const [drawing, setDrawing]           = useState(false);
  const [running, setRunning]           = useState(false);
  const [currentPos, setCurrentPos]     = useState<LatLng | null>(null);
  const [currentCourse, setCurrentCourse] = useState(0);
  const [mapCenter, setMapCenter]       = useState<LatLng>([-6.2088, 106.8456]);
  const [mapKey, setMapKey]             = useState(0); // force map remount on center change

  // Stats (shown while running)
  const [elapsed, setElapsed]       = useState(0);
  const [distKm, setDistKm]         = useState(0);
  const [pointsSent, setPointsSent] = useState(0);

  // Simulation state kept in refs (not state → no re-render inside interval)
  const simState = useRef({ segIdx: 0, fraction: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const { data: devices } = useQuery<DeviceOption[]>({
    queryKey: ['devices-sim'],
    queryFn: async () => {
      const { data } = await api.get('/devices', { params: { limit: 100 } });
      return data.data ?? data;
    },
  });

  // ── Route segment distances ────────────────────────────────────────────────
  const segDistances = waypoints.slice(1).map((p, i) =>
    haversineKm(waypoints[i][0], waypoints[i][1], p[0], p[1]),
  );
  const totalDistKm = segDistances.reduce((s, d) => s + d, 0);

  // ── Simulation tick ────────────────────────────────────────────────────────
  const tick = useCallback(async () => {
    const { segIdx, fraction } = simState.current;
    if (segIdx >= waypoints.length - 1) {
      // reached end
      stopSim();
      toast('Simulation complete', { icon: '🏁' });
      return;
    }

    const p1 = waypoints[segIdx];
    const p2 = waypoints[segIdx + 1];
    const segDist = segDistances[segIdx];
    if (segDist === 0) { simState.current.segIdx++; return; }

    // Advance fraction: speed_km/h * tick_s / seg_km
    const advanceFrac = (speed * (TICK_MS / 1000)) / 3600 / segDist;
    const newFrac = fraction + advanceFrac;

    let pos: LatLng;
    let course: number;

    if (newFrac >= 1) {
      // Move to next segment
      pos = p2;
      course = bearing(p1[0], p1[1], p2[0], p2[1]);
      simState.current = { segIdx: segIdx + 1, fraction: 0 };
    } else {
      pos = interpolate(p1, p2, newFrac);
      course = bearing(p1[0], p1[1], p2[0], p2[1]);
      simState.current.fraction = newFrac;
    }

    setCurrentPos(pos);
    setCurrentCourse(Math.round(course));
    setElapsed(Math.round((Date.now() - startTimeRef.current) / 1000));
    setDistKm((prev) => {
      const d = haversineKm(pos[0], pos[1], ...pos); // placeholder
      return Math.round(((prev + advanceFrac * segDist)) * 100) / 100;
    });

    // POST GPS data
    try {
      await api.post('/gps-data', {
        imei:      selectedImei,
        latitude:  pos[0],
        longitude: pos[1],
        speed,
        course:    Math.round(course),
        timestamp: new Date().toISOString(),
      }, { headers: { 'skip-auth': 'true' } });
      setPointsSent((n) => n + 1);
    } catch {
      // silently ignore POST errors during simulation
    }
  }, [waypoints, segDistances, speed, selectedImei]);

  // ── Start ──────────────────────────────────────────────────────────────────
  const startSim = () => {
    if (!selectedImei) { toast.error('Select a device first'); return; }
    if (waypoints.length < 2) { toast.error('Draw at least 2 waypoints on the map'); return; }

    simState.current = { segIdx: 0, fraction: 0 };
    startTimeRef.current = Date.now();
    setElapsed(0);
    setDistKm(0);
    setPointsSent(0);
    setDrawing(false);
    setRunning(true);
    setCurrentPos(waypoints[0]);

    intervalRef.current = setInterval(tick, TICK_MS);
    toast.success('Simulation started');
  };

  // ── Stop ───────────────────────────────────────────────────────────────────
  function stopSim() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
    setCurrentPos(null);
  }

  // Restart tick when speed changes while running
  useEffect(() => {
    if (running && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(tick, TICK_MS);
    }
  }, [tick, running]);

  // Cleanup on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const clearRoute = () => {
    stopSim();
    setWaypoints([]);
    setCurrentPos(null);
    setDrawing(false);
  };

  const applyPreset = (center: LatLng) => {
    clearRoute();
    setMapCenter(center);
    setMapKey((k) => k + 1);
  };

  const selectedDevice = devices?.find((d) => d.imei === selectedImei);
  const canStart = !!selectedImei && waypoints.length >= 2 && !running;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">

      {/* ── Left panel ── */}
      <div className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto">

        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Radio className="h-5 w-5 text-emerald-500" /> GPS Simulator
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Simulate GPS movement to test live tracking and alerts
          </p>
        </div>

        {/* Device selector */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
            <Cpu className="h-3.5 w-3.5" /> Device / IMEI
          </label>
          <select
            value={selectedImei}
            onChange={(e) => setSelectedImei(e.target.value)}
            disabled={running}
            className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white disabled:opacity-50"
          >
            <option value="">— Select device —</option>
            {devices?.map((d) => (
              <option key={d._id} value={d.imei}>
                {d.device_name} ({d.imei.slice(-6)})
              </option>
            ))}
          </select>
          {selectedDevice?.vehicle_id && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              Linked to: {selectedDevice.vehicle_id.vehicle_name} ({selectedDevice.vehicle_id.plate_number})
            </p>
          )}
        </div>

        {/* Speed control */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
              <Gauge className="h-3.5 w-3.5" /> Speed
            </label>
            <span className={clsx(
              'text-sm font-bold',
              speed > 100 ? 'text-red-500' : speed > 80 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400',
            )}>
              {speed} km/h
            </span>
          </div>
          <input
            type="range" min="5" max="130" step="5" value={speed}
            onChange={(e) => setSpeed(+e.target.value)}
            className="w-full accent-emerald-500"
          />
          <div className="mt-1 flex justify-between text-[10px] text-gray-400">
            <span>5</span>
            <span className="text-amber-500">80</span>
            <span className="text-red-500">130</span>
          </div>
          {speed > 80 && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Will trigger speed alert {speed > 100 ? '(critical)' : '(warning)'}
            </p>
          )}
        </div>

        {/* Route controls */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
            <Route className="h-3.5 w-3.5" /> Route
          </label>

          <div className="flex gap-2">
            <button
              onClick={() => setDrawing((v) => !v)}
              disabled={running}
              className={clsx(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors',
                drawing
                  ? 'bg-emerald-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700',
              )}
            >
              <MapPin className="h-3.5 w-3.5" />
              {drawing ? 'Click map…' : 'Draw Route'}
            </button>
            <button
              onClick={clearRoute}
              disabled={running || waypoints.length === 0}
              className="rounded-lg border border-red-200 px-2.5 py-2 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-40 dark:border-red-900/50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {waypoints.length > 0 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {waypoints.length} waypoint{waypoints.length !== 1 ? 's' : ''} ·{' '}
              {totalDistKm.toFixed(2)} km total
            </p>
          )}
          {drawing && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              Click on the map to add waypoints. Min 2 to simulate.
            </p>
          )}
        </div>

        {/* Preset locations */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
            <Navigation className="h-3.5 w-3.5" /> Jump to City
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.center)}
                disabled={running}
                className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-slate-600 dark:text-gray-400 dark:hover:bg-slate-700"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start / Stop */}
        <div className="space-y-2">
          <button
            onClick={startSim}
            disabled={!canStart}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Play className="h-4 w-4" /> Start Simulation
          </button>
          {running && (
            <button
              onClick={stopSim}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
            >
              <Square className="h-4 w-4" /> Stop
            </button>
          )}
        </div>

        {/* Live stats */}
        {running && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-900/10">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Simulation running
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: Clock,        label: 'Elapsed', value: `${elapsed}s` },
                { icon: Route,        label: 'Distance', value: `${distKm.toFixed(1)}km` },
                { icon: Radio,        label: 'Sent',    value: String(pointsSent) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-lg bg-white px-2 py-1.5 dark:bg-slate-800">
                  <Icon className="mx-auto mb-0.5 h-3.5 w-3.5 text-emerald-500" />
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{value}</p>
                  <p className="text-[10px] text-gray-400">{label}</p>
                </div>
              ))}
            </div>
            {currentPos && (
              <p className="mt-2 text-center text-[10px] text-gray-400">
                {currentPos[0].toFixed(5)}, {currentPos[1].toFixed(5)} · {currentCourse}°
              </p>
            )}
          </div>
        )}

        {/* Hint */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900/30 dark:bg-blue-900/10">
          <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mb-1">Live testing</p>
          <ul className="space-y-0.5 text-[11px] text-blue-600 dark:text-blue-400/80">
            <li className="flex items-start gap-1"><ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />Open Live Tracking in another tab</li>
            <li className="flex items-start gap-1"><ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />Draw a route through a geofence zone</li>
            <li className="flex items-start gap-1"><ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />Set speed &gt;80 km/h to trigger alerts</li>
          </ul>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
        <MapContainer
          key={mapKey}
          center={mapCenter}
          zoom={13}
          className="h-full w-full"
          scrollWheelZoom
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <ClickHandler drawing={drawing} onAdd={(p) => setWaypoints((w) => [...w, p])} />

          {/* Planned route */}
          {waypoints.length > 1 && (
            <Polyline
              positions={waypoints}
              color="#6b7280"
              weight={2}
              dashArray="6 4"
              opacity={0.7}
            />
          )}

          {/* Waypoint dots */}
          {waypoints.map((p, i) => (
            <CircleMarker
              key={i}
              center={p}
              radius={i === 0 ? 8 : i === waypoints.length - 1 ? 8 : 5}
              color={i === 0 ? '#10b981' : i === waypoints.length - 1 ? '#ef4444' : '#3b82f6'}
              fillColor={i === 0 ? '#10b981' : i === waypoints.length - 1 ? '#ef4444' : '#3b82f6'}
              fillOpacity={0.9}
              weight={2}
            />
          ))}

          {/* Travelled path */}
          {running && currentPos && waypoints.length > 0 && (
            <Polyline
              positions={[waypoints[0], ...(currentPos ? [currentPos] : [])]}
              color="#10b981"
              weight={3}
              opacity={0.7}
            />
          )}

          {/* Current simulated position */}
          {currentPos && (
            <Marker position={currentPos} icon={movingIcon(currentCourse)} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
