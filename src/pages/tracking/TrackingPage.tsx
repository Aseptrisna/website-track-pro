import { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { io, type Socket } from 'socket.io-client';
import { Car, Wifi, WifiOff, Navigation, List, X } from 'lucide-react';
import clsx from 'clsx';
import api from '../../lib/axios';

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

const defaultCenter: [number, number] = [-6.2088, 106.8456]; // Jakarta

const vehicleIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function FlyToVehicle({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 1 });
    }
  }, [position, map]);
  return null;
}

export default function TrackingPage() {
  const [locations, setLocations] = useState<Record<string, VehicleLocation>>({});
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const { data: initialLocations } = useQuery<VehicleLocation[]>({
    queryKey: ['latest-locations'],
    queryFn: async () => {
      const { data } = await api.get('/gps-data/latest');
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: vehicles } = useQuery<Array<{ _id: string; vehicle_name: string; plate_number: string }>>({
    queryKey: ['vehicles-list'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles');
      return data.data ?? data;
    },
  });

  useEffect(() => {
    if (initialLocations) {
      const locMap: Record<string, VehicleLocation> = {};
      initialLocations.forEach((loc) => {
        locMap[loc.vehicle_id || loc.imei] = loc;
      });
      setLocations((prev) => ({ ...prev, ...locMap }));
    }
  }, [initialLocations]);

  // Connect socket and subscribe only to user's vehicles
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const socket = io(wsUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Subscribe to each vehicle individually
      vehicles?.forEach((v) => socket.emit('subscribe_vehicle', v._id));
    });
    socket.on('disconnect', () => setConnected(false));

    // Listen for per-vehicle location updates
    socket.on('vehicle_location', (data: VehicleLocation) => {
      setLocations((prev) => ({
        ...prev,
        [data.vehicle_id || data.imei]: data,
      }));
    });

    // Also listen for global location_update in case worker broadcasts there
    socket.on('location_update', (data: VehicleLocation) => {
      // Only accept if it's one of our vehicles
      if (vehicles?.some((v) => v._id === data.vehicle_id)) {
        setLocations((prev) => ({
          ...prev,
          [data.vehicle_id || data.imei]: data,
        }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [vehicles]);

  const flyToPosition = useCallback((): [number, number] | null => {
    if (!selectedVehicle) return null;
    const loc = locations[selectedVehicle];
    if (!loc) return null;
    return [loc.latitude, loc.longitude];
  }, [selectedVehicle, locations]);

  const vehicleList = Object.values(locations);

  return (
    <div className="relative flex h-[calc(100vh-5rem)] flex-col gap-2 md:flex-row md:gap-4">
      {/* Mobile toggle button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300 md:hidden"
      >
        {sidebarOpen ? <X className="h-4 w-4" /> : <List className="h-4 w-4" />}
        {sidebarOpen ? 'Close' : 'Vehicles'}
        {!sidebarOpen && (
          <span className="flex items-center gap-1">
            {connected ? <Wifi className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3 text-red-500" />}
          </span>
        )}
      </button>

      {/* Sidebar — hidden on mobile, shown on md+ */}
      <div
        className={clsx(
          'shrink-0 overflow-y-auto rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800',
          'absolute inset-x-0 top-12 z-20 mx-2 max-h-[60vh] shadow-xl md:static md:mx-0 md:w-80 md:max-h-none md:shadow-none',
          sidebarOpen ? 'block' : 'hidden md:block',
        )}
      >
        <div className="border-b border-gray-200 p-4 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Vehicles</h2>
            <div className="flex items-center gap-1.5">
              {connected ? (
                <Wifi className="h-4 w-4 text-emerald-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className={clsx('text-xs', connected ? 'text-emerald-500' : 'text-red-500')}>
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {vehicleList.length} vehicle(s) tracked
          </p>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {vehicles?.map((v) => {
            const loc = locations[v._id];
            return (
              <button
                key={v._id}
                onClick={() => {
                  setSelectedVehicle(v._id);
                  setSidebarOpen(false);
                }}
                className={clsx(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50',
                  selectedVehicle === v._id && 'bg-emerald-50 dark:bg-emerald-900/20',
                )}
              >
                <div
                  className={clsx(
                    'rounded-lg p-2',
                    loc ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-gray-100 dark:bg-slate-700',
                  )}
                >
                  <Car className={clsx('h-4 w-4', loc ? 'text-emerald-600' : 'text-gray-400')} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {v.vehicle_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{v.plate_number}</p>
                </div>
                {loc && (
                  <div className="text-right">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {loc.speed?.toFixed(0)} km/h
                    </p>
                    <Navigation
                      className="ml-auto h-3 w-3 text-gray-400"
                      style={{ transform: `rotate(${loc.course ?? 0}deg)` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
          {(!vehicles || vehicles.length === 0) && (
            <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No vehicles registered
            </p>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="min-h-[300px] flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          className="h-full w-full"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyToVehicle position={flyToPosition()} />
          {vehicleList.map((loc) => (
            <Marker
              key={loc.vehicle_id || loc.imei}
              position={[loc.latitude, loc.longitude]}
              icon={vehicleIcon}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{loc.vehicle_name || loc.imei}</p>
                  {loc.plate_number && <p className="text-gray-500">{loc.plate_number}</p>}
                  <p>Speed: {loc.speed?.toFixed(1)} km/h</p>
                  <p>
                    Position: {loc.latitude?.toFixed(5)}, {loc.longitude?.toFixed(5)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(loc.timestamp).toLocaleString('id-ID')}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
