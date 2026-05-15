import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType>({ unreadCount: 0 });

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count');
      return data.count;
    },
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!isAuthenticated) return;

    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const socket = io(`${wsUrl}/tracking`, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('alert', (data: {
      event: string;
      geofence?: string;
      imei?: string;
      speed?: number;
      speedLimit?: number;
    }) => {
      // Refresh badge + NotificationsPage
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });

      // Toast per event type
      switch (data.event) {
        case 'geofence_enter':
          toast(`Entered geofence: ${data.geofence}`, {
            icon: '📍',
            duration: 5000,
          });
          break;
        case 'geofence_exit':
          toast(`Exited geofence: ${data.geofence}`, {
            icon: '🚧',
            duration: 5000,
          });
          break;
        case 'speed_violation':
          toast.error(
            `Speed violation: ${data.speed} km/h (limit ${data.speedLimit} km/h)`,
            { duration: 6000 },
          );
          break;
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, queryClient]);

  return (
    <NotificationContext.Provider value={{ unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
