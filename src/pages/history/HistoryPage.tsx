import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import {
  Calendar, Car, Clock, Navigation, Play, Pause,
  SkipBack, SkipForward, Square, Gauge, MapPin,
  FileText, Download,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../../lib/axios';
import { exportTripCSV, exportTripPDF } from '../../lib/exportTrip';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GpsPoint {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
  course: number;
}

const defaultCenter: [number, number] = [-6.2088, 106.8456];
const SPEEDS = [1, 2, 5, 10];
const BASE_INTERVAL_MS = 800;

// ─── Icons ────────────────────────────────────────────────────────────────────
const startIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

function createVehicleIcon(isMoving: boolean, course: number) {
  const color = isMoving ? '#10b981' : '#6b7280';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="44" height="44">
      <circle cx="22" cy="22" r="20" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2.5"/>
      <circle cx="22" cy="22" r="11" fill="${color}" fill-opacity="0.95"/>
      <polygon points="22,9 17,24 22,21 27,24" fill="white" transform="rotate(${course || 0}, 22, 22)"/>
    </svg>`;
  return L.divIcon({
    html: svg, className: '',
    iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -24],
  });
}

// ─── Speed colour helper ──────────────────────────────────────────────────────
function getSpeedColor(speed: number): string {
  if (speed < 20)  return '#22c55e'; // green  — slow
  if (speed < 50)  return '#eab308'; // yellow — moderate
  if (speed < 80)  return '#f97316'; // orange — fast
  return '#ef4444';                  // red    — very fast
}

// ─── Map helpers ──────────────────────────────────────────────────────────────
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const obs = new ResizeObserver(() => map.invalidateSize());
    obs.observe(map.getContainer());
    return () => obs.disconnect();
  }, [map]);
  return null;
}

function FitRoute({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (points.length > 0 && !fitted.current) {
      const bounds = L.latLngBounds(points);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        fitted.current = true;
      }
    }
  }, [points, map]);
  useEffect(() => { fitted.current = false; }, [points]);
  return null;
}

function PlaybackFollower({ point, follow }: { point: [number, number]; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (follow) map.panTo(point, { animate: true, duration: 0.3 });
  }, [point, follow, map]);
  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: vehicles } = useQuery<Array<{ _id: string; vehicle_name: string; plate_number: string }>>({
    queryKey: ['vehicles-for-history'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles');
      return data.data ?? data;
    },
  });

  const { data: historyData, isLoading } = useQuery<GpsPoint[]>({
    queryKey: ['gps-history', selectedVehicle, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await api.get(`/gps-data/vehicle-history/${selectedVehicle}`, {
        params: {
          startDate: `${dateFrom}T00:00:00.000Z`,
          endDate:   `${dateTo}T23:59:59.999Z`,
        },
      });
      return data;
    },
    enabled: !!selectedVehicle,
  });

  // Reset playback when data changes
  useEffect(() => {
    setIsPlaying(false);
    setPlaybackIndex(0);
  }, [historyData]);

  // ── Playback engine ────────────────────────────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying || !historyData) return;

    intervalRef.current = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev >= historyData.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, BASE_INTERVAL_MS / playbackSpeed);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, playbackSpeed, historyData]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    if (!historyData?.length) return;
    if (playbackIndex >= historyData.length - 1) setPlaybackIndex(0);
    setIsPlaying(true);
  }, [historyData, playbackIndex]);

  const handlePause  = useCallback(() => setIsPlaying(false), []);
  const handleStop   = useCallback(() => { setIsPlaying(false); setPlaybackIndex(0); }, []);
  const handleSkipStart = useCallback(() => { setIsPlaying(false); setPlaybackIndex(0); }, []);
  const handleSkipEnd   = useCallback(() => {
    if (!historyData) return;
    setIsPlaying(false);
    setPlaybackIndex(historyData.length - 1);
  }, [historyData]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaybackIndex(Number(e.target.value));
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const routePoints: [number, number][] = historyData?.map((p) => [p.latitude, p.longitude]) ?? [];
  const firstPoint  = historyData?.[0];
  const lastPoint   = historyData?.[historyData.length - 1];
  const currentPoint = historyData?.[playbackIndex];

  const playedRoute    = routePoints.slice(0, playbackIndex + 1);
  const remainingRoute = routePoints.slice(playbackIndex);

  const hasData = !!historyData && historyData.length > 0;
  const isAtStart = playbackIndex === 0;
  const isAtEnd   = !!historyData && playbackIndex >= historyData.length - 1;
  const progress  = hasData ? (playbackIndex / (historyData.length - 1)) * 100 : 0;

  const totalDistance = historyData
    ? historyData.reduce((sum, p, i) => {
        if (i === 0) return 0;
        const prev = historyData[i - 1];
        const R = 6371;
        const dLat = ((p.latitude  - prev.latitude)  * Math.PI) / 180;
        const dLon = ((p.longitude - prev.longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((prev.latitude * Math.PI) / 180) *
            Math.cos((p.latitude  * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        return sum + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }, 0)
    : 0;

  const avgSpeed = historyData?.length
    ? historyData.reduce((s, p) => s + (p.speed || 0), 0) / historyData.length
    : 0;

  const maxSpeed = historyData?.length
    ? Math.max(...historyData.map((p) => p.speed || 0))
    : 0;

  // ── Export handlers ────────────────────────────────────────────────────────
  const selectedVehicleObj = vehicles?.find((v) => v._id === selectedVehicle);
  const vehicleName = selectedVehicleObj
    ? `${selectedVehicleObj.vehicle_name} (${selectedVehicleObj.plate_number})`
    : 'Unknown Vehicle';

  const handleExportCSV = useCallback(() => {
    if (!historyData?.length) return;
    exportTripCSV(historyData, { vehicleName, dateFrom, dateTo, totalDistance, avgSpeed, maxSpeed });
  }, [historyData, vehicleName, dateFrom, dateTo, totalDistance, avgSpeed, maxSpeed]);

  const handleExportPDF = useCallback(() => {
    if (!historyData?.length) return;
    exportTripPDF(historyData, { vehicleName, dateFrom, dateTo, totalDistance, avgSpeed, maxSpeed });
  }, [historyData, vehicleName, dateFrom, dateTo, totalDistance, avgSpeed, maxSpeed]);

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Route History</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View and replay past routes</p>
        </div>
        {hasData && (
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="w-full sm:min-w-[200px] sm:flex-1">
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Car className="h-4 w-4" /> Vehicle
          </label>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className={inputClass}
          >
            <option value="">Select vehicle...</option>
            {vehicles?.map((v) => (
              <option key={v._id} value={v._id}>
                {v.vehicle_name} ({v.plate_number})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Calendar className="h-4 w-4" /> From
            </label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Calendar className="h-4 w-4" /> To
            </label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Stats */}
      {hasData && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
          {[
            { label: 'Total Points', value: historyData.length.toString() },
            { label: 'Distance',     value: `${totalDistance.toFixed(1)} km` },
            { label: 'Avg Speed',    value: `${avgSpeed.toFixed(1)} km/h` },
            { label: 'Max Speed',    value: `${maxSpeed.toFixed(1)} km/h` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 sm:p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="h-[380px] sm:h-[460px]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-slate-800">
              <div className="flex items-center gap-2 text-gray-500">
                <Clock className="h-5 w-5 animate-spin" />
                Loading route...
              </div>
            </div>
          ) : (
            <MapContainer
              center={firstPoint ? [firstPoint.latitude, firstPoint.longitude] : defaultCenter}
              zoom={firstPoint ? 14 : 12}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapResizer />
              {routePoints.length > 1 && <FitRoute points={routePoints} />}

              {/* ── Speed-coloured full route (always visible) ── */}
              {historyData && historyData.length > 1 && historyData.map((pt, i) => {
                if (i === 0) return null;
                const prev = historyData[i - 1];
                const color = getSpeedColor(pt.speed ?? 0);
                // dim segments that are "ahead" during playback
                const isPast = i <= playbackIndex;
                const opacity = (playbackIndex > 0 && !isPast) ? 0.25 : 0.9;
                return (
                  <Polyline
                    key={i}
                    positions={[
                      [prev.latitude, prev.longitude],
                      [pt.latitude,   pt.longitude],
                    ]}
                    color={color}
                    weight={5}
                    opacity={opacity}
                  />
                );
              })}

              {/* Playback progress stroke — bright white outline on top */}
              {playedRoute.length > 1 && playbackIndex > 0 && (
                <Polyline positions={playedRoute} color="#ffffff" weight={7} opacity={0.3} />
              )}

              {/* Start marker */}
              {firstPoint && (
                <Marker position={[firstPoint.latitude, firstPoint.longitude]} icon={startIcon}>
                  <Popup>
                    <p className="font-semibold text-emerald-600">Start</p>
                    <p className="text-sm">Speed: {firstPoint.speed?.toFixed(1)} km/h</p>
                    <p className="text-xs text-gray-500">{new Date(firstPoint.timestamp).toLocaleString('id-ID')}</p>
                  </Popup>
                </Marker>
              )}

              {/* End marker */}
              {lastPoint && lastPoint !== firstPoint && (
                <Marker position={[lastPoint.latitude, lastPoint.longitude]} icon={startIcon}>
                  <Popup>
                    <p className="font-semibold text-red-600">End</p>
                    <p className="text-sm">Speed: {lastPoint.speed?.toFixed(1)} km/h</p>
                    <p className="text-xs text-gray-500">{new Date(lastPoint.timestamp).toLocaleString('id-ID')}</p>
                  </Popup>
                </Marker>
              )}

              {/* Playback vehicle marker */}
              {currentPoint && playbackIndex > 0 && (
                <>
                  <Marker
                    position={[currentPoint.latitude, currentPoint.longitude]}
                    icon={createVehicleIcon(currentPoint.speed > 2, currentPoint.course)}
                  >
                    <Popup>
                      <p className="font-semibold">Playback Position</p>
                      <p className="text-sm">Speed: {currentPoint.speed?.toFixed(1)} km/h</p>
                      <p className="text-xs text-gray-500">{new Date(currentPoint.timestamp).toLocaleString('id-ID')}</p>
                    </Popup>
                  </Marker>
                  <PlaybackFollower
                    point={[currentPoint.latitude, currentPoint.longitude]}
                    follow={isPlaying}
                  />
                </>
              )}
            </MapContainer>
          )}
        </div>

        {/* Speed legend */}
        {hasData && (
          <div className="flex items-center gap-3 border-t border-gray-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
            <span className="text-xs text-gray-500 dark:text-gray-400">Speed:</span>
            {[
              { color: '#22c55e', label: '< 20 km/h' },
              { color: '#eab308', label: '20–50' },
              { color: '#f97316', label: '50–80' },
              { color: '#ef4444', label: '> 80 km/h' },
            ].map((s) => (
              <span key={s.label} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                <span className="inline-block h-2 w-5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        )}

        {/* Playback controls */}
        {hasData && (
          <div className="border-t border-gray-200 bg-white px-4 pb-4 pt-3 dark:border-slate-700 dark:bg-slate-800">
            {/* Progress bar */}
            <div className="mb-3">
              <input
                type="range"
                min={0}
                max={historyData.length - 1}
                value={playbackIndex}
                onChange={handleSeek}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-emerald-500 dark:bg-slate-600"
              />
              <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                <span>{firstPoint ? new Date(firstPoint.timestamp).toLocaleTimeString('id-ID') : '--:--'}</span>
                <span className="font-medium text-emerald-600">{Math.round(progress)}%</span>
                <span>{lastPoint ? new Date(lastPoint.timestamp).toLocaleTimeString('id-ID') : '--:--'}</span>
              </div>
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Transport buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSkipStart}
                  disabled={isAtStart}
                  title="Skip to start"
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-slate-700"
                >
                  <SkipBack className="h-4 w-4" />
                </button>

                {isPlaying ? (
                  <button
                    onClick={handlePause}
                    title="Pause"
                    className="rounded-lg bg-emerald-500 p-2 text-white hover:bg-emerald-600"
                  >
                    <Pause className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={handlePlay}
                    disabled={isAtEnd}
                    title="Play"
                    className="rounded-lg bg-emerald-500 p-2 text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    <Play className="h-5 w-5" />
                  </button>
                )}

                <button
                  onClick={handleStop}
                  title="Stop & reset"
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <Square className="h-4 w-4" />
                </button>

                <button
                  onClick={handleSkipEnd}
                  disabled={isAtEnd}
                  title="Skip to end"
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-slate-700"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>

              {/* Speed selector */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Speed:</span>
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={clsx(
                      'rounded px-2 py-1 text-xs font-semibold transition-colors',
                      playbackSpeed === s
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600',
                    )}
                  >
                    {s}×
                  </button>
                ))}
              </div>

              {/* Point counter */}
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {playbackIndex + 1} / {historyData.length}
              </span>
            </div>

            {/* Current point info */}
            {currentPoint && (
              <div className="mt-3 flex flex-wrap gap-4 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-slate-700/50">
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <Clock className="h-3.5 w-3.5 text-emerald-500" />
                  {new Date(currentPoint.timestamp).toLocaleString('id-ID')}
                </span>
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <Gauge className="h-3.5 w-3.5 text-emerald-500" />
                  {currentPoint.speed?.toFixed(1)} km/h
                </span>
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                  {currentPoint.latitude.toFixed(5)}, {currentPoint.longitude.toFixed(5)}
                </span>
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <Navigation className="h-3.5 w-3.5 text-emerald-500" />
                  {currentPoint.course}°
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty states */}
      {!selectedVehicle && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 dark:border-slate-600 dark:bg-slate-800/50">
          <div className="text-center">
            <Navigation className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Select a vehicle to view its route history</p>
          </div>
        </div>
      )}

      {selectedVehicle && !isLoading && historyData?.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-gray-500 dark:text-gray-400">No GPS data found for the selected date range</p>
        </div>
      )}
    </div>
  );
}
