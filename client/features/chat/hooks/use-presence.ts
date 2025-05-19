'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '../providers/socket-provider';
import { useAuth } from '@/features/auth/providers/auth-provider';
import socket from '@/lib/socket';

// Mapa global de usuarios online
const onlineUsers = new Map<string, boolean>();

export function usePresence() {
  const { status } = useSocket();
  const { user } = useAuth();
  const [onlineStatus, setOnlineStatus] = useState<Map<string, boolean>>(
    new Map()
  );

  // Función para actualizar el estado de forma forzada
  const forceUpdateOnlineStatus = () => {
    setOnlineStatus(new Map(onlineUsers));
    console.log('FORZANDO ACTUALIZACIÓN:', Array.from(onlineUsers.entries()));
  };

  useEffect(() => {
    if (status !== 'connected' || !socket || !user?.id) return;

    // Marcar usuario actual como online
    onlineUsers.set(user.id, true);
    forceUpdateOnlineStatus();

    // Notificar que estamos online
    socket.emit('update_presence', {
      userId: user.id,
      isOnline: true
    });

    // Manejar cambios de presencia
    const handlePresenceChange = (data: {
      userId: string;
      isOnline: boolean;
    }) => {
      if (data.userId && typeof data.isOnline === 'boolean') {
        console.log(
          `⚠️ ACTUALIZANDO ESTADO DE ${data.userId}: ${data.isOnline}`
        );
        onlineUsers.set(data.userId, data.isOnline);
        forceUpdateOnlineStatus();
      }
    };

    // Manejador específico para user_presence_status
    const handleUserPresenceStatus = (data: {
      userId: string;
      chatId: string;
      isOnline: boolean;
      lastSeen?: string;
    }) => {
      if (data.userId && typeof data.isOnline === 'boolean') {
        console.log(
          `🟢 PRESENCIA EXPLÍCITA: ${data.userId} está ${
            data.isOnline ? 'ONLINE' : 'OFFLINE'
          }`
        );
        onlineUsers.set(data.userId, data.isOnline);
        forceUpdateOnlineStatus();
      }
    };

    // Suscribirse a eventos de presencia
    socket.on('user_presence_changed', handlePresenceChange);
    socket.on('user_presence_status', handleUserPresenceStatus);

    // Solicitar estado de todos los usuarios al iniciar
    socket.emit('get_all_online_users');

    // Limpiar al desmontar
    return () => {
      socket.off('user_presence_changed', handlePresenceChange);
      socket.off('user_presence_status', handleUserPresenceStatus);

      if (socket.connected) {
        socket.emit('update_presence', {
          userId: user.id,
          isOnline: false
        });
      }
    };
  }, [status, user?.id]);

  // Función para verificar si un usuario está en línea - con log explícito
  const isUserOnline = (userId: string): boolean => {
    if (!userId) return false;
    const isOnline = onlineUsers.get(userId) === true;
    console.log(`👁️ CONSULTANDO ONLINE: ${userId} => ${isOnline}`);
    return isOnline;
  };

  return {
    onlineUsers: onlineStatus,
    isUserOnline,
    updatePresence: () => {
      if (status === 'connected' && socket && user?.id) {
        socket.emit('update_presence', {
          userId: user.id,
          isOnline: true
        });
      }
    }
  };
}
