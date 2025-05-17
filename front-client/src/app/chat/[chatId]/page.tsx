'use client';

import { useParams } from 'next/navigation';
import { ChatWindow } from '@/features/chat/components/chat-window';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ChatList } from '@/features/chat/components/chat-list';

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Redireccionar al login si no hay sesión
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Obtener detalles del chat
  const { data: chat, isLoading } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      const response = await fetch(`/api/chats/${chatId}`);
      if (!response.ok) {
        throw new Error('Error al obtener el chat');
      }
      return response.json();
    },
    enabled: !!chatId && !!user?.id
  });

  // Determinar el nombre del chat
  let chatName = chat?.name || 'Chat';

  if (!chat?.name && chat?.members) {
    // Si no es un grupo, tomar el nombre del otro usuario
    const otherMember = chat.members.find((m: any) => m.userId !== user?.id);
    if (otherMember) {
      chatName = otherMember.name;
    }
  }

  if (authLoading) {
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
      <div className='hidden md:block'>
        <ChatList />
      </div>
      <div className='flex-1'>
        <ChatWindow
          chatId={chatId}
          chatName={chatName}
          isGroup={chat?.isGroup || false}
        />
      </div>
    </div>
  );
}
