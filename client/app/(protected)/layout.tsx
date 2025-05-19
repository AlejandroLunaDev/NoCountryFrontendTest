'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SocketProvider } from '@/features/chat/providers/socket-provider';
import { PresenceProvider } from '@/features/chat/providers/presence-provider';
import { ChatEventHandler } from '@/features/chat/components/chat-event-handler';
import { NotificationPermission } from '@/features/notifications/components/notification-permission';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Mostrar spinner de carga mientras verificamos la autenticación
  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-screen bg-zinc-900'>
        <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
      </div>
    );
  }

  // Si no hay usuario y no estamos cargando, no renderizar los hijos
  // (la redirección ya se está manejando en el useEffect)
  if (!user && !isLoading) {
    return null;
  }

  // Usuario autenticado, renderizar el layout protegido con todos los providers
  return (
    <SocketProvider>
      <PresenceProvider>
        <ChatEventHandler />
        <NotificationPermission />
        {children}
      </PresenceProvider>
    </SocketProvider>
  );
}
