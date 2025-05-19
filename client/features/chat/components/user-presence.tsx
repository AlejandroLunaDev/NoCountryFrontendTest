'use client';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSocket } from '../providers/socket-provider';
import { usePresence } from '../providers/presence-provider';
export type PresenceStatus = 'online' | 'offline' | 'idle' | 'typing';
interface UserPresenceProps {
  userId: string;
  chatId: string;
  className?: string;
}
export function UserPresence({ userId, chatId, className }: UserPresenceProps) {
  const [status, setStatus] = useState<PresenceStatus>('offline');
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const { socket } = useSocket();
  const { isUserOnline } = usePresence();

  useEffect(() => {
    if (!socket || !userId) return;

    // Usar el estado de online desde el hook usePresence
    const isOnline = isUserOnline(userId);
    console.log(
      `[UserPresence] User ${userId} online status from hook:`,
      isOnline
    );
    setStatus(isOnline ? 'online' : 'offline');

    // Solicitar el estado inicial del usuario al servidor
    if (chatId) {
      socket.emit('get_user_presence', { userId, chatId });
    }

    // Escuchar actualizaciones de presencia específicas del chat
    const handlePresenceUpdate = (data: {
      userId: string;
      chatId: string;
      status: PresenceStatus;
      lastSeen?: string;
    }) => {
      if (data.userId === userId && (!chatId || data.chatId === chatId)) {
        console.log(
          `[UserPresence] Received presence update for user ${userId}:`,
          data
        );
        setStatus(data.status);
        if (data.lastSeen) {
          setLastSeen(data.lastSeen);
        }
      }
    };

    // Escuchar evento general de presencia
    const handleUserPresenceChanged = (data: {
      userId: string;
      isOnline: boolean;
      lastSeen?: string;
    }) => {
      if (data.userId === userId) {
        console.log(
          `[UserPresence] Global presence change for user ${userId}:`,
          data
        );
        setStatus(data.isOnline ? 'online' : 'offline');
        if (data.lastSeen) {
          setLastSeen(data.lastSeen);
        }
      }
    };

    socket.on('presence_update', handlePresenceUpdate);
    socket.on('user_presence_changed', handleUserPresenceChanged);

    // Limpieza
    return () => {
      socket.off('presence_update', handlePresenceUpdate);
      socket.off('user_presence_changed', handleUserPresenceChanged);
    };
  }, [socket, userId, chatId, isUserOnline]);

  // Formatear el tiempo relativo (ej: "hace 5 minutos")
  const formatLastSeen = () => {
    if (!lastSeen) return 'Desconectado';

    return formatDistanceToNow(new Date(lastSeen), {
      addSuffix: true,
      locale: es
    });
  };

  // Determinar qué texto mostrar
  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'En línea';
      case 'typing':
        return 'Escribiendo...';
      case 'idle':
        return 'Inactivo';
      case 'offline':
        return lastSeen
          ? `Visto por última vez ${formatLastSeen()}`
          : 'Desconectado';
    }
  };

  // Determinar el color del indicador
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'typing':
        return 'bg-blue-500';
      case 'idle':
        return 'bg-yellow-500';
      case 'offline':
      default:
        return 'bg-zinc-500';
    }
  };

  // En caso de que no tengamos estado, no mostrar nada
  if (!userId || !chatId) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('h-2 w-2 rounded-full', getStatusColor())} />
      <span className='text-xs font-medium text-zinc-400'>
        {getStatusText()}
      </span>
    </div>
  );
}
