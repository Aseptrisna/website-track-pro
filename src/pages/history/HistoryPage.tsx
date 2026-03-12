import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import { Calendar, Car, Clock, Navigation } from 'lucide-react';
import api from '../../lib/axios';

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

interface GpsPoint {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
  course: number;
}

const defaultCenter: [number, number] = [-6.2088, 106.8456];

const startIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function HistoryPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

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
          endDate: `${dateTo}T23:59:59.999Z`,
        },
      });
      return data;
    },
    enabled: !!selectedVehicle,
  });

  const routePoints: [number, number][] =
    historyData?.map((p) => [p.latitude, p.longitude]) ?? [];
  const firstPoint = historyData?.[0];
  const lastPoint = historyData?.[historyData.length - 1];

  const totalDistance = historyData
    ? historyData.reduce((sum, p, i) => {
        if (i === 0) return 0;
        const prev = historyData[i - 1];
        const R = 6371;
        const dLat = ((p.latitude - prev.latitude) * Math.PI) / 180;
        const dLon = ((p.longitude - prev.longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((prev.latitude * Math.PI) / 180) *
            Math.cos((p.latitude * Math.PI) / 180) *
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

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Route History</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View past routes and trip history</p>
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
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Calendar className="h-4 w-4" /> To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={inputClass}
          />
        </div>
        </div>
      </div>

      {/* Stats */}
      {historyData && historyData.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 sm:p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Points</p>
            <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">{historyData.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Distance</p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{totalDistance.toFixed(1)} km</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg Speed</p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{avgSpeed.toFixed(1)} km/h</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Max Speed</p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{maxSpeed.toFixed(1)} km/h</p>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="h-[350px] overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 sm:h-[500px]">
        {isLoading && (
          <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-slate-800">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="h-5 w-5 animate-spin" />
              Loading route...
            </div>
          </div>
        )}
        {!isLoading && (
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
            {routePoints.length > 1 && (
              <Polyline positions={routePoints} color="#10b981" weight={4} opacity={0.8} />
            )}
            {firstPoint && (
              <Marker position={[firstPoint.latitude, firstPoint.longitude]} icon={startIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-emerald-600">Start</p>
                    <p>Speed: {firstPoint.speed?.toFixed(1)} km/h</p>
                    <p className="text-xs text-gray-500">
                      {new Date(firstPoint.timestamp).toLocaleString('id-ID')}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
            {lastPoint && lastPoint !== firstPoint && (
              <Marker position={[lastPoint.latitude, lastPoint.longitude]} icon={startIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-red-600">End</p>
                    <p>Speed: {lastPoint.speed?.toFixed(1)} km/h</p>
                    <p className="text-xs text-gray-500">
                      {new Date(lastPoint.timestamp).toLocaleString('id-ID')}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        )}
      </div>

      {!selectedVehicle && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 dark:border-slate-600 dark:bg-slate-800/50">
          <div className="text-center">
            <Navigation className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Select a vehicle to view its route history
            </p>
          </div>
        </div>
      )}

      {selectedVehicle && historyData && historyData.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-gray-500 dark:text-gray-400">No GPS data found for the selected date range</p>
        </div>
      )}
    </div>
  );
}
