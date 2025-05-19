'use client';

import { useEffect } from 'react';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { toast } from 'sonner';

export function NotificationPermission() {
  const { user } = useAuth();

  useEffect(() => {
    // Solo solicitar permisos cuando el usuario está autenticado
    if (user && typeof Notification !== 'undefined') {
      const requestPermission = async () => {
        // Verificar si ya hay permisos
        if (Notification.permission === 'default') {
          console.log('Solicitando permisos para notificaciones...');

          try {
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
              toast.success('Notificaciones activadas', {
                description: 'Te notificaremos cuando recibas nuevos mensajes'
              });

              // Mostrar una notificación de prueba
              setTimeout(() => {
                const testNotification = new Notification(
                  'Notificaciones activadas',
                  {
                    body: 'Ahora recibirás notificaciones de mensajes nuevos',
                    icon: '/favicon.ico'
                  }
                );
              }, 1000);
            } else {
              toast.error('Notificaciones bloqueadas', {
                description:
                  'No podrás recibir notificaciones de mensajes nuevos'
              });
            }
          } catch (error) {
            console.error('Error al solicitar permisos:', error);
          }
        }
      };

      requestPermission();
    }
  }, [user]);

  return null;
}
