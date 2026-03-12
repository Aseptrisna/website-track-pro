import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { io, type Socket } from 'socket.io-client';
import {
  Car, Wifi, WifiOff, Navigation, List, X, MapPin, Clock, Gauge,
  Satellite, Battery, Signal, ChevronRight, Radio, Eye, EyeOff,
} from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import api from '../../lib/axios';

// ─── Types ───────────────────────────────────────────────────────────────────
interface VehicleLocation {
  vehicle_id: string;
  vehicle_name: string;
  plate_number: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  timestamp: string;
  imei: string;
}

interface DeviceStatus {
  imei: string;
  terminalInfo?: {
    status: boolean;
    ignition: boolean;
    charging: boolean;
    alarmType: string;
    gpsTracking: boolean;
  };
  voltageLevel?: string;
  gsmSigStrength?: string;
  timestamp: string;
}

const defaultCenter: [number, number] = [-6.2088, 106.8456];

// ─── Custom vehicle markers ─────────────────────────────────────────────────
function createVehicleIcon(isMoving: boolean, course: number) {
  const color = isMoving ? '#10b981' : '#6b7280';
  const rotation = course || 0;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
      <circle cx="20" cy="20" r="18" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2"/>
      <circle cx="20" cy="20" r="10" fill="${color}" fill-opacity="0.9"/>
      <polygon points="20,8 16,22 20,19 24,22" fill="white" transform="rotate(${rotation}, 20, 20)"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: 'vehicle-marker-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  });
}

function createSelectedIcon(isMoving: boolean, course: number) {
  const color = isMoving ? '#10b981' : '#6b7280';
  const rotation = course || 0;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" width="52" height="52">
      <circle cx="26" cy="26" r="24" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="2.5" stroke-dasharray="4 2"/>
      <circle cx="26" cy="26" r="16" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
      <circle cx="26" cy="26" r="10" fill="${color}"/>
      <polygon points="26,12 21,28 26,24 31,28" fill="white" transform="rotate(${rotation}, 26, 26)"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: 'vehicle-marker-icon',
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -28],
  });
}

// ─── Map controller ──────────────────────────────────────────────────────────
function MapController({ position, shouldFly }: { position: [number, number] | null; shouldFly: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (position && shouldFly) {
      map.flyTo(position, 16, { duration: 1.2 });
    }
  }, [position, shouldFly, map]);
  return null;
}

// ─── Resize map when layout changes ──────────────────────────────────────────
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

// ─── Fit map to all markers ──────────────────────────────────────────────────
function FitBounds({ locations }: { locations: VehicleLocation[] }) {
  const map = useMap();
  const hasFitted = useRef(false);
  useEffect(() => {
    if (locations.length > 0 && !hasFitted.current) {
      const bounds = L.latLngBounds(locations.map((l) => [l.latitude, l.longitude]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        hasFitted.current = true;
      }
    }
  }, [locations, map]);
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(ts: string) {
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: idLocale });
  } catch {
    return '-';
  }
}

function getBatteryColor(level?: string) {
  if (!level) return 'text-gray-400';
  if (level.includes('very_high') || level.includes('very high')) return 'text-green-500';
  if (level.includes('high')) return 'text-green-400';
  if (level.includes('medium')) return 'text-yellow-500';
  if (level.includes('low')) return 'text-orange-500';
  return 'text-red-500';
}

function getSignalColor(level?: string) {
  if (!level) return 'text-gray-400';
  if (level.includes('strong')) return 'text-green-500';
  if (level.includes('good')) return 'text-blue-500';
  if (level.includes('weak')) return 'text-orange-500';
  return 'text-red-500';
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function TrackingPage() {
  const [locations, setLocations] = useState<Record<string, VehicleLocation>>({});
  const [deviceStatuses, setDeviceStatuses] = useState<Record<string, DeviceStatus>>({});
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [flyTrigger, setFlyTrigger] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  // Fetch initial data
  const { data: initialLocations, isLoading: loadingLocations } = useQuery<VehicleLocation[]>({
    queryKey: ['latest-locations'],
    queryFn: async () => {
      const { data } = await api.get('/gps-data/latest');
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: vehicles } = useQuery<Array<{ _id: string; vehicle_name: string; plate_number: string; vehicle_type: string }>>({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles');
      return data.data ?? data;
    },
  });

  // Seed initial locations
  useEffect(() => {
    if (initialLocations) {
      const locMap: Record<string, VehicleLocation> = {};
      initialLocations.forEach((loc) => {
        locMap[loc.vehicle_id || loc.imei] = loc;
      });
      setLocations((prev) => ({ ...prev, ...locMap }));
    }
  }, [initialLocations]);

  // WebSocket connection
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const socket = io(`${wsUrl}/tracking`, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      vehicles?.forEach((v: any) => socket.emit('subscribe_vehicle', v._id));
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('vehicle_location', (data: VehicleLocation) => {
      setLocations((prev) => ({
        ...prev,
        [data.vehicle_id || data.imei]: data,
      }));
    });

    socket.on('location_update', (data: VehicleLocation) => {
      if (vehicles?.some((v) => v._id === data.vehicle_id)) {
        setLocations((prev) => ({
          ...prev,
          [data.vehicle_id || data.imei]: data,
        }));
      }
    });

    socket.on('device_status', (data: DeviceStatus) => {
      setDeviceStatuses((prev) => ({
        ...prev,
        [data.imei]: data,
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [vehicles]);

  // Computed
  const vehicleList = useMemo(() => Object.values(locations), [locations]);
  const onlineCount = useMemo(() => vehicleList.filter((l) => {
    const age = Date.now() - new Date(l.timestamp).getTime();
    return age < 10 * 60 * 1000; // 10 minutes
  }).length, [vehicleList]);

  const selectedLocation = selectedVehicle ? locations[selectedVehicle] : null;
  const selectedVehicleInfo = vehicles?.find((v) => v._id === selectedVehicle);
  const selectedStatus = selectedLocation?.imei ? deviceStatuses[selectedLocation.imei] : null;

  const handleSelectVehicle = useCallback((id: string) => {
    setSelectedVehicle(id);
    setSidebarOpen(false);
    setShowDetailPanel(true);
    setFlyTrigger((p) => p + 1);
  }, []);

  const flyPosition: [number, number] | null = selectedLocation
    ? [selectedLocation.latitude, selectedLocation.longitude]
    : null;

  return (
    <div className="relative flex h-[calc(100vh-5rem)] flex-col md:flex-row gap-0">
      {/* ── Mobile top bar ── */}
      <div className="flex items-center justify-between gap-2 px-2 py-2 md:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <List className="h-4 w-4" />}
          {sidebarOpen ? 'Tutup' : 'Kendaraan'}
        </button>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className={clsx('h-2 w-2 rounded-full', connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')} />
          <span className="text-gray-600 dark:text-gray-400">{connected ? 'Live' : 'Offline'}</span>
          <span className="text-gray-400">•</span>
          <span className="font-medium text-gray-900 dark:text-white">{onlineCount}/{vehicles?.length || 0}</span>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div
        className={clsx(
          'shrink-0 flex flex-col border-r border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800',
          'absolute inset-x-0 top-14 z-30 mx-2 max-h-[60vh] rounded-xl shadow-2xl md:static md:mx-0 md:w-80 md:max-h-none md:rounded-none md:shadow-none',
          sidebarOpen ? 'block' : 'hidden md:flex',
        )}
      >
        {/* Sidebar header */}
        <div className="border-b border-gray-200 p-4 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Live Tracking</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {onlineCount} online • {(vehicles?.length || 0) - onlineCount} offline
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={clsx(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                connected
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
              )}>
                <div className={clsx('h-1.5 w-1.5 rounded-full', connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')} />
                {connected ? (
                  <><Wifi className="h-3 w-3" /> Live</>
                ) : (
                  <><WifiOff className="h-3 w-3" /> Offline</>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle list */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700/50">
          {loadingLocations && !vehicles?.length && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Radio className="h-8 w-8 animate-pulse mb-2" />
              <p className="text-sm">Memuat data...</p>
            </div>
          )}
          {vehicles?.map((v) => {
            const loc = locations[v._id];
            const isMoving = loc && loc.speed > 0;
            const isRecent = loc && (Date.now() - new Date(loc.timestamp).getTime()) < 10 * 60 * 1000;
            const isSelected = selectedVehicle === v._id;

            return (
              <button
                key={v._id}
                onClick={() => handleSelectVehicle(v._id)}
                className={clsx(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-200',
                  'hover:bg-gray-50 dark:hover:bg-slate-700/50',
                  isSelected && 'bg-emerald-50/80 border-l-4 border-l-emerald-500 dark:bg-emerald-900/20',
                  !isSelected && 'border-l-4 border-l-transparent',
                )}
              >
                {/* Vehicle icon with status */}
                <div className="relative">
                  <div className={clsx(
                    'rounded-xl p-2.5 transition-colors',
                    isRecent
                      ? isMoving
                        ? 'bg-emerald-100 dark:bg-emerald-900/40'
                        : 'bg-blue-100 dark:bg-blue-900/40'
                      : 'bg-gray-100 dark:bg-slate-700',
                  )}>
                    <Car className={clsx(
                      'h-5 w-5',
                      isRecent
                        ? isMoving ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400',
                    )} />
                  </div>
                  {isRecent && (
                    <div className={clsx(
                      'absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-800',
                      isMoving ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500',
                    )} />
                  )}
                </div>

                {/* Vehicle info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {v.vehicle_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{v.plate_number}</p>
                  {loc && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      <Clock className="inline h-2.5 w-2.5 mr-0.5" />
                      {timeAgo(loc.timestamp)}
                    </p>
                  )}
                </div>

                {/* Speed & direction */}
                <div className="flex flex-col items-end gap-1">
                  {loc ? (
                    <>
                      <span className={clsx(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold',
                        isMoving
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400',
                      )}>
                        {loc.speed?.toFixed(0)} km/h
                      </span>
                      <Navigation
                        className={clsx('h-3.5 w-3.5', isMoving ? 'text-emerald-500' : 'text-gray-300')}
                        style={{ transform: `rotate(${loc.course ?? 0}deg)` }}
                      />
                    </>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-400 dark:bg-slate-700">
                      No data
                    </span>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
              </button>
            );
          })}
          {(!vehicles || vehicles.length === 0) && !loadingLocations && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Car className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Belum ada kendaraan</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Map ── */}
      <div className="relative min-h-[300px] flex-1 overflow-hidden md:rounded-none rounded-xl md:border-0 border border-gray-200 dark:border-slate-700">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapResizer />
          <FitBounds locations={vehicleList} />
          <MapController position={flyPosition} shouldFly={flyTrigger > 0} key={flyTrigger} />

          {vehicleList.map((loc) => {
            const id = loc.vehicle_id || loc.imei;
            const isSelected = selectedVehicle === id;
            const isMoving = loc.speed > 0;
            const vInfo = vehicles?.find((v) => v._id === id);

            return (
              <Marker
                key={id}
                position={[loc.latitude, loc.longitude]}
                icon={isSelected
                  ? createSelectedIcon(isMoving, loc.course)
                  : createVehicleIcon(isMoving, loc.course)
                }
                eventHandlers={{
                  click: () => handleSelectVehicle(id),
                }}
              >
                <Popup className="vehicle-popup" maxWidth={280} minWidth={220}>
                  <div className="p-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                      <div className={clsx(
                        'rounded-lg p-1.5',
                        isMoving ? 'bg-emerald-100' : 'bg-gray-100',
                      )}>
                        <Car className={clsx('h-4 w-4', isMoving ? 'text-emerald-600' : 'text-gray-500')} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm leading-tight">
                          {vInfo?.vehicle_name || loc.vehicle_name || loc.imei}
                        </p>
                        {(vInfo?.plate_number || loc.plate_number) && (
                          <p className="text-[11px] text-gray-500">{vInfo?.plate_number || loc.plate_number}</p>
                        )}
                      </div>
                      <span className={clsx(
                        'ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold',
                        isMoving ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500',
                      )}>
                        {isMoving ? 'MOVING' : 'IDLE'}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Gauge className="h-3 w-3 text-blue-500" />
                        <span className="font-semibold">{loc.speed?.toFixed(0)} km/h</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Navigation className="h-3 w-3 text-orange-500" style={{ transform: `rotate(${loc.course}deg)` }} />
                        <span>{loc.course?.toFixed(0)}°</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 col-span-2">
                        <MapPin className="h-3 w-3 text-red-500" />
                        <span>{loc.latitude?.toFixed(6)}, {loc.longitude?.toFixed(6)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400 col-span-2">
                        <Clock className="h-3 w-3" />
                        <span>{timeAgo(loc.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Accuracy circle for selected vehicle */}
          {selectedLocation && (
            <CircleMarker
              center={[selectedLocation.latitude, selectedLocation.longitude]}
              radius={30}
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.06, weight: 1 }}
            />
          )}
        </MapContainer>

        {/* ── Map overlay: Vehicle detail panel ── */}
        {showDetailPanel && selectedLocation && selectedVehicleInfo && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[1000] animate-fade-in-up">
            <div className="rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-md shadow-2xl dark:border-slate-700 dark:bg-slate-800/95 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 pb-3 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'rounded-xl p-2.5',
                    selectedLocation.speed > 0
                      ? 'bg-emerald-100 dark:bg-emerald-900/40'
                      : 'bg-blue-100 dark:bg-blue-900/40',
                  )}>
                    <Car className={clsx(
                      'h-5 w-5',
                      selectedLocation.speed > 0 ? 'text-emerald-600' : 'text-blue-600',
                    )} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {selectedVehicleInfo.vehicle_name}
                    </h3>
                    <p className="text-xs text-gray-500">{selectedVehicleInfo.plate_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                    selectedLocation.speed > 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400',
                  )}>
                    {selectedLocation.speed > 0 ? 'Moving' : 'Idle'}
                  </span>
                  <button
                    onClick={() => setShowDetailPanel(false)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-0 border-b border-gray-100 dark:border-slate-700">
                <div className="flex flex-col items-center py-3 border-r border-gray-100 dark:border-slate-700">
                  <Gauge className="h-4 w-4 text-blue-500 mb-1" />
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedLocation.speed?.toFixed(0)}
                  </span>
                  <span className="text-[10px] text-gray-400">km/h</span>
                </div>
                <div className="flex flex-col items-center py-3 border-r border-gray-100 dark:border-slate-700">
                  <Navigation
                    className="h-4 w-4 text-orange-500 mb-1"
                    style={{ transform: `rotate(${selectedLocation.course}deg)` }}
                  />
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedLocation.course?.toFixed(0)}°
                  </span>
                  <span className="text-[10px] text-gray-400">Arah</span>
                </div>
                <div className="flex flex-col items-center py-3">
                  <Satellite className="h-4 w-4 text-purple-500 mb-1" />
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedLocation.imei ? '🟢' : '⚪'}
                  </span>
                  <span className="text-[10px] text-gray-400">GPS</span>
                </div>
              </div>

              {/* Location details */}
              <div className="p-4 pt-3 space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <MapPin className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {selectedLocation.latitude?.toFixed(6)}, {selectedLocation.longitude?.toFixed(6)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {timeAgo(selectedLocation.timestamp)} • {new Date(selectedLocation.timestamp).toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Device status (if available) */}
                {selectedStatus && (
                  <div className="flex items-center gap-3 pt-2 mt-2 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-1 text-xs">
                      <Battery className={clsx('h-3.5 w-3.5', getBatteryColor(selectedStatus.voltageLevel))} />
                      <span className="text-gray-500 capitalize">{selectedStatus.voltageLevel?.replace(/_/g, ' ') || '-'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Signal className={clsx('h-3.5 w-3.5', getSignalColor(selectedStatus.gsmSigStrength))} />
                      <span className="text-gray-500 capitalize">{selectedStatus.gsmSigStrength?.replace(/_/g, ' ') || '-'}</span>
                    </div>
                    {selectedStatus.terminalInfo?.ignition && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 dark:bg-emerald-900/40 dark:text-emerald-400">
                        IGN ON
                      </span>
                    )}
                    {selectedStatus.terminalInfo?.charging && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 dark:bg-blue-900/40 dark:text-blue-400">
                        Charging
                      </span>
                    )}
                  </div>
                )}

                {selectedLocation.imei && (
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 pt-1">
                    <Radio className="h-3 w-3" />
                    IMEI: {selectedLocation.imei}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Map overlay: Stats badge (top-left) */}
        <div className="absolute top-3 left-3 z-[1000] hidden md:flex items-center gap-2 rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-800/90">
          <div className={clsx('h-2 w-2 rounded-full', connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')} />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {connected ? 'Live' : 'Offline'}
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{onlineCount}</span> / {vehicles?.length || 0} online
          </span>
        </div>

        {/* Map overlay: Toggle detail panel */}
        {selectedVehicle && !showDetailPanel && (
          <button
            onClick={() => setShowDetailPanel(true)}
            className="absolute bottom-4 right-4 z-[1000] flex items-center gap-2 rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm px-4 py-2.5 shadow-lg hover:bg-white transition-colors dark:border-slate-700 dark:bg-slate-800/90 dark:hover:bg-slate-800"
          >
            <Eye className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedVehicleInfo?.vehicle_name}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
