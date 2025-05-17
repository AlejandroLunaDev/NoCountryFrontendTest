'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { ChatList } from '@/features/chat/components/chat-list';
import { useEffect } from 'react';
import { Hash, PlusIcon, Settings } from 'lucide-react';
import { NotificationCenter } from '@/features/notifications/components/notification-center';

export function ChatPage() {
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
      <div className='flex items-center justify-center h-screen bg-zinc-900'>
        <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirigiendo al login...
  }

  return (
    <div className='flex h-screen overflow-hidden'>
      {/* Server list sidebar */}
      <div className='w-[72px] bg-zinc-950 flex flex-col items-center py-3 gap-2 select-none'>
        {/* Home button */}
        <Button
          className='h-12 w-12 rounded-[24px] bg-zinc-700 hover:bg-primary hover:rounded-[16px] transition-all duration-200 flex items-center justify-center'
          onClick={() => router.push('/dashboard')}
        >
          <span className='text-white font-bold text-2xl'>NC</span>
        </Button>

        <div className='w-8 h-[2px] bg-zinc-800 rounded-full my-1'></div>

        {/* Server icons */}
        <Button
          className='h-12 w-12 rounded-[24px] bg-zinc-700 hover:bg-emerald-600 hover:rounded-[16px] transition-all duration-200 flex items-center justify-center'
          onClick={() => router.push('/chat')}
        >
          <span className='text-white font-bold'>Chat</span>
        </Button>

        {/* Add server button */}
        <Button className='h-12 w-12 rounded-[24px] bg-zinc-700 hover:bg-green-600 hover:rounded-[16px] transition-all duration-200 flex items-center justify-center mt-2'>
          <PlusIcon className='h-6 w-6 text-green-500 hover:text-white' />
        </Button>

        {/* Notification Center */}
        <div className='mt-2'>
          <NotificationCenter />
        </div>

        {/* Settings */}
        <Button className='h-12 w-12 rounded-[24px] bg-zinc-700 hover:bg-zinc-600 hover:rounded-[16px] transition-all duration-200 flex items-center justify-center mt-auto'>
          <Settings className='h-5 w-5 text-zinc-400 hover:text-white' />
        </Button>
      </div>

      {/* Channel list */}
      <ChatList />

      {/* Empty state */}
      <div className='flex-1 bg-zinc-800 flex flex-col items-center justify-center'>
        <div className='w-20 h-20 rounded-full bg-zinc-700 flex items-center justify-center mb-6'>
          <Hash className='h-10 w-10 text-zinc-400' />
        </div>
        <h2 className='text-2xl font-bold text-white mb-2'>
          Bienvenido a los canales
        </h2>
        <p className='text-zinc-400 max-w-md mx-auto mb-8 text-center px-4'>
          Selecciona un canal o un mensaje directo para comenzar a chatear
        </p>
        <Button className='bg-primary hover:bg-primary/90'>
          Explorar canales
        </Button>
      </div>
    </div>
  );
}
