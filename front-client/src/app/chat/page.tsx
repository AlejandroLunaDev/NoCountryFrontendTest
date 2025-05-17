'use client'; // Necesario para hooks como useAuth y useRouter

import { Metadata } from 'next';
import { useRouter } from 'next/navigation'; // Para redirección
import { ChatProvider } from '@/features/chat/providers/chat-provider';
import { ChatInterface } from '@/features/chat/components/chat-interface';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { useAuth } from '@/features/auth/providers/auth-provider'; // Hook de autenticación
import { Button } from '@/components/ui/button'; // Botón de shadcn/ui
import { ChatList } from '@/features/chat/components/chat-list';
import { useEffect } from 'react';

// Metadata no puede estar en un Client Component, la quitamos o movemos
// export const metadata: Metadata = {
// title: 'Chat | No Country',
// description: 'Sistema de chat para comunicación en simulaciones laborales.'
// };

export default function ChatsListPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redireccionar al login si no hay sesión
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirigiendo al login...
  }

  return (
    <div className='flex h-screen'>
      <ChatList />
      <div className='flex-1 hidden lg:flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
        <div className='text-center px-6 py-10'>
          <div className='text-6xl mb-4'>💬</div>
          <h2 className='text-2xl font-bold mb-2'>Tus mensajes</h2>
          <p className='text-gray-500 max-w-md mx-auto mb-8'>
            Selecciona una conversación o inicia un nuevo chat para comenzar a
            comunicarte
          </p>
        </div>
      </div>
    </div>
  );
}
