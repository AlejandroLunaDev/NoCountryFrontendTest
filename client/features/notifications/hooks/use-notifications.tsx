'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/features/chat/providers/socket-provider';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { toast } from 'sonner';

// Definimos los tipos de notificaciones según el backend
export enum NotificationType {
  NEW_MESSAGE = 'NEW_MESSAGE',
  USER_JOINED_CHAT = 'USER_JOINED_CHAT',
  CHAT_CREATED = 'CHAT_CREATED',
  SYSTEM = 'SYSTEM'
}

// Interfaz para las notificaciones
export interface Notification {
  id: string;
  type: NotificationType;
  recipientId: string;
  senderId: string;
  chatId?: string;
  messageId?: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  const { socket, status } = useSocket();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar notificaciones no leídas
  const loadUnreadNotifications = useCallback(() => {
    if (!user?.id || status !== 'connected') return;

    setLoading(true);
    socket.emit('get_unread_notifications', user.id);
  }, [socket, user, status]);

  // Marcar una notificación como leída
  const markAsRead = useCallback(
    (notificationId: string) => {
      if (!user?.id || status !== 'connected') return;

      socket.emit('mark_notification_read', {
        notificationId,
        userId: user.id
      });

      // Actualizar el estado local
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
    },
    [socket, user, status]
  );

  // Marcar todas las notificaciones como leídas
  const markAllAsRead = useCallback(() => {
    if (!user?.id || status !== 'connected' || notifications.length === 0)
      return;

    const notificationPromises = notifications
      .filter(notification => !notification.read)
      .map(notification => markAsRead(notification.id));

    Promise.all(notificationPromises);
  }, [socket, user, status, notifications, markAsRead]);

  // Mostrar notificación al usuario
  const displayNotification = useCallback((notification: Notification) => {
    switch (notification.type) {
      case NotificationType.NEW_MESSAGE:
        toast.info('Nuevo mensaje', {
          description: notification.content
        });
        break;
      case NotificationType.USER_JOINED_CHAT:
        toast.success('Nuevo usuario', {
          description: notification.content
        });
        break;
      case NotificationType.CHAT_CREATED:
        toast.success('Nuevo chat', {
          description: notification.content
        });
        break;
      default:
        toast.info('Nueva notificación', {
          description: notification.content
        });
    }
  }, []);

  // Escuchar eventos de WebSocket
  useEffect(() => {
    if (!user?.id || status !== 'connected') return;

    console.log('Setting up notification listeners for user:', user.id);

    // Suscribirse a notificaciones del usuario
    socket.emit('subscribe_user_notifications', user.id);

    // Recibir notificaciones no leídas
    const handleUnreadNotifications = (unreadNotifications: Notification[]) => {
      console.log('Received unread notifications:', unreadNotifications.length);
      setNotifications(unreadNotifications);
      setLoading(false);

      // Display latest notifications if there are any new ones
      const newNotifications = unreadNotifications
        .filter(n => !n.read)
        .slice(0, 3);
      if (newNotifications.length > 0) {
        newNotifications.forEach(notification => {
          displayNotification(notification);
        });
      }
    };

    // Recibir nueva notificación
    const handleNewNotification = (notification: Notification) => {
      console.log('New notification received:', notification);

      // Check if we already have this notification to avoid duplicates
      setNotifications(prev => {
        const exists = prev.some(n => n.id === notification.id);
        if (exists) return prev;
        return [notification, ...prev];
      });

      // Always display the notification
      displayNotification(notification);

      // If it's a message notification, ensure the chat is reloaded
      if (
        notification.type === NotificationType.NEW_MESSAGE &&
        notification.chatId
      ) {
        // This will force a refresh of the chat list if this chat is not in the list
        socket.emit('join_chat', notification.chatId);
      }
    };

    // Actualización de notificación (marcar como leída)
    const handleNotificationUpdated = (data: { id: string; read: boolean }) => {
      setNotifications(prev =>
        prev.map(n => (n.id === data.id ? { ...n, read: data.read } : n))
      );
    };

    // Errores de notificaciones
    const handleNotificationError = (error: { message: string }) => {
      toast.error('Error en notificaciones', {
        description: error.message
      });
    };

    // Registrar eventos
    socket.on('unread_notifications', handleUnreadNotifications);
    socket.on('notification', handleNewNotification);
    socket.on('notification_updated', handleNotificationUpdated);
    socket.on('notification_error', handleNotificationError);

    // Cargar notificaciones no leídas al montar
    loadUnreadNotifications();

    // Limpiar eventos al desmontar
    return () => {
      socket.off('unread_notifications', handleUnreadNotifications);
      socket.off('notification', handleNewNotification);
      socket.off('notification_updated', handleNotificationUpdated);
      socket.off('notification_error', handleNotificationError);
    };
  }, [user, status, socket, loadUnreadNotifications, displayNotification]);

  return {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    loadUnreadNotifications,
    unreadCount: notifications.filter(n => !n.read).length
  };
}
