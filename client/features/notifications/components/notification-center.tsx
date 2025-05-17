'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '../hooks/use-notifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Notification, NotificationType } from '../hooks/use-notifications';
import { MessageSquare, UserPlus, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function NotificationCenter() {
  const { notifications, loading, markAsRead, markAllAsRead, unreadCount } =
    useNotifications();
  const [open, setOpen] = useState(false);

  // Debug notifications
  useEffect(() => {
    console.log('Notifications status:', {
      count: notifications.length,
      unreadCount
    });
  }, [notifications, unreadCount]);

  // Dar formato a la fecha relativa (ej: "hace 5 minutos")
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: es
    });
  };

  // Obtener icono según el tipo de notificación
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.NEW_MESSAGE:
        return <MessageSquare className='h-5 w-5 text-blue-500' />;
      case NotificationType.USER_JOINED_CHAT:
        return <UserPlus className='h-5 w-5 text-green-500' />;
      case NotificationType.CHAT_CREATED:
        return <Users className='h-5 w-5 text-purple-500' />;
      default:
        return <Bell className='h-5 w-5 text-gray-500' />;
    }
  };

  // Mostrar color de fondo según el tipo
  const getBackgroundColor = (type: NotificationType, read: boolean) => {
    if (read) return 'bg-zinc-900';

    switch (type) {
      case NotificationType.NEW_MESSAGE:
        return 'bg-blue-500/10';
      case NotificationType.USER_JOINED_CHAT:
        return 'bg-green-500/10';
      case NotificationType.CHAT_CREATED:
        return 'bg-purple-500/10';
      default:
        return 'bg-zinc-800';
    }
  };

  // Manejar clic en notificación
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    // Aquí podríamos implementar navegación según el tipo de notificación
    // Por ejemplo, ir al chat si es un mensaje nuevo
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative'
          aria-label='Notificaciones'
        >
          <Bell className='h-5 w-5' />
          {unreadCount > 0 && (
            <span className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white'>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80 p-0' align='end'>
        <div className='flex items-center justify-between px-4 py-3 border-b border-zinc-700'>
          <h3 className='font-medium'>Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant='ghost'
              size='sm'
              className='text-xs text-zinc-400 hover:text-white'
              onClick={() => {
                markAllAsRead();
              }}
            >
              Marcar todas como leídas
            </Button>
          )}
        </div>
        <ScrollArea className='h-80'>
          {loading ? (
            // Estado de carga
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className='flex items-start gap-3 p-3 border-b border-zinc-800'
              >
                <Skeleton className='h-9 w-9 rounded-full' />
                <div className='flex-1 space-y-2'>
                  <Skeleton className='h-4 w-full' />
                  <Skeleton className='h-3 w-3/4' />
                </div>
              </div>
            ))
          ) : notifications.length === 0 ? (
            // Sin notificaciones
            <div className='flex flex-col items-center justify-center h-full p-4 text-center'>
              <Bell className='h-12 w-12 text-zinc-700 mb-2' />
              <p className='text-zinc-500'>No tienes notificaciones</p>
            </div>
          ) : (
            // Lista de notificaciones
            notifications.map(notification => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer ${getBackgroundColor(
                  notification.type,
                  notification.read
                )} ${notification.read ? 'opacity-70' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className='h-9 w-9 rounded-full flex items-center justify-center bg-zinc-800'>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className='flex-1'>
                  <p className='text-sm text-white'>{notification.content}</p>
                  <p className='text-xs text-zinc-500 mt-1'>
                    {formatDate(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && (
                  <div className='h-2 w-2 rounded-full bg-blue-500 mt-1'></div>
                )}
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
