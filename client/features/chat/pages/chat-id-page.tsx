'use client';

import { useParams } from 'next/navigation';
import { ChatWindow } from '@/features/chat/components/chat-window';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { ChatList } from '@/features/chat/components/chat-list';
import { Button } from '@/components/ui/button';
import { PlusIcon, Settings, AlertCircle } from 'lucide-react';
import { useSocket } from '@/features/chat/providers/socket-provider';
import socket from '@/lib/socket';
import type { Message, Chat } from '@/features/chat/lib/api';

export function ChatIdPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status } = useSocket();
  const [isLoading, setIsLoading] = useState(false);

  // Implementamos la funcionalidad de useHandleDeletedChats directamente
  useEffect(() => {
    if (!socket || !user?.id || status !== 'connected') return;

    // When a new message is received, check if the chat exists
    const handleNewMessage = (message: Message) => {
      console.log('Checking if chat exists for message:', message);

      // Get current chats
      const currentChats =
        queryClient.getQueryData<Chat[]>(['chats', user.id]) || [];

      // If chat doesn't exist in our list, we need to fetch it
      if (!currentChats.some(chat => chat.id === message.chatId)) {
        console.log('Message for deleted chat detected, will refetch chats');

        // Forzar una recarga de la lista de chats para que aparezca de nuevo
        queryClient.invalidateQueries({ queryKey: ['chats', user.id] });

        // Si es para el chat actual, refrescar también los datos del chat
        if (message.chatId === chatId) {
          queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
        }

        // También actualizar la caché con el nuevo mensaje
        queryClient.setQueryData(
          ['messages', message.chatId],
          (oldData: Message[] = []) => {
            if (!oldData.some(m => m.id === message.id)) {
              return [...oldData, message];
            }
            return oldData;
          }
        );

        // Unirse explícitamente a este chat
        socket.emit('join_chat', message.chatId);
      }
    };

    socket.on('message_received', handleNewMessage);

    // Also listen for explicit chat_restored events
    socket.on('chat_restored', (restoredChatId: string) => {
      console.log('Chat restored event received for:', restoredChatId);

      // Actualizar la lista de chats
      queryClient.invalidateQueries({ queryKey: ['chats', user.id] });

      // Si es el chat actual, refrescar los datos
      if (restoredChatId === chatId) {
        queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
      }
    });

    return () => {
      socket.off('message_received', handleNewMessage);
      socket.off('chat_restored');
    };
  }, [socket, status, user?.id, queryClient, router, chatId]);

  // Redirect to login if no session
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Get chat details
  const {
    data: chat,
    error,
    isRefetching,
    isPending
  } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      try {
        // First check if we already have this chat data in cache
        const cachedChat = queryClient.getQueryData<Chat>(['chat', chatId]);
        if (cachedChat) {
          // Si ya tenemos el chat en caché, no mostramos loading
          setIsLoading(false);
          return cachedChat;
        }

        // Si no tenemos caché, obtenemos los datos pero mostramos un skeleton durante carga
        setIsLoading(true);

        const response = await fetch(`/api/chats/${chatId}`);

        if (!response.ok) {
          console.error(`Error response from server: ${response.status}`);

          // Intento de recuperación
          socket.emit('join_chat', {
            chatId,
            userId: user?.id
          });

          // Si es un 404, mostramos un error más amigable
          if (response.status === 404) {
            throw new Error('El chat no existe o ha sido eliminado');
          }

          throw new Error(`Error al obtener el chat: ${response.status}`);
        }

        const result = await response.json();
        return result;
      } catch (error) {
        console.error(
          'Error obteniendo el chat, intentando recuperación automática:',
          error
        );

        // Intentamos recuperar el chat invalidando la caché
        queryClient.invalidateQueries({ queryKey: ['chats', user?.id] });

        throw error;
      } finally {
        // Quitar estado de carga inmediatamente
        setIsLoading(false);
      }
    },
    enabled: !!chatId && !!user?.id,
    retry: 1, // Reducimos a 1 solo reintento para evitar esperas largas
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000), // Reduced delay
    staleTime: 60000, // Datos frescos por 1 minuto
    placeholderData: () => {
      // Buscar el chat en la lista de chats para tener datos inmediatos
      const chats = queryClient.getQueryData<Chat[]>(['chats', user?.id]);
      if (chats) {
        const foundChat = chats.find(c => c.id === chatId);
        if (foundChat) {
          return foundChat;
        }
      }
      return undefined;
    },
    refetchOnWindowFocus: false // No refrescar al obtener el foco
  });

  // Efecto para manejar el error de manera silenciosa
  useEffect(() => {
    if (error) {
      console.error(
        'Error obteniendo el chat, reintentando en segundo plano:',
        error
      );
      // Programar un reintento después de un tiempo
      const timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [error, chatId, queryClient]);

  // Determinar nombre del chat - optimizado con useMemo
  const chatName = useMemo(() => {
    if (!chat) return 'Chat';

    if (chat.name) return chat.name;

    if (chat.members) {
      const otherMember = chat.members.find(
        (m: { userId: string }) => m.userId !== user?.id
      );
      if (otherMember) {
        return otherMember.name;
      }
    }

    return 'Chat';
  }, [chat, user]);

  // Mostrar skeleton UI durante la carga en lugar de spinner completo
  if (authLoading) {
    return (
      <div className='flex items-center justify-center h-screen bg-zinc-900'>
        <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirecting to login...
  }

  // En lugar de un spinner de pantalla completa, continuamos renderizando la UI
  // con un estado de esqueleto
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

        {/* Settings */}
        <Button className='h-12 w-12 rounded-[24px] bg-zinc-700 hover:bg-zinc-600 hover:rounded-[16px] transition-all duration-200 flex items-center justify-center mt-auto'>
          <Settings className='h-5 w-5 text-zinc-400 hover:text-white' />
        </Button>
      </div>

      {/* Channel list */}
      <ChatList />

      {/* Chat area - Mostrar área de chat siempre, incluso durante carga */}
      <div className='flex-1'>
        {error && !chat ? (
          // Error message
          <div className='flex-1 flex flex-col items-center justify-center bg-zinc-900 text-center p-4'>
            <AlertCircle className='h-16 w-16 text-red-500 mb-4' />
            <h2 className='text-xl font-bold text-white mb-2'>
              Error al cargar el chat
            </h2>
            <p className='text-zinc-400 mb-6 max-w-md'>
              No pudimos cargar este chat. Puede que haya sido eliminado o que
              no tengas acceso.
            </p>
            <div className='flex gap-4'>
              <Button
                variant='outline'
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ['chat', chatId] })
                }
              >
                Intentar de nuevo
              </Button>
              <Button onClick={() => router.push('/chat')}>
                Volver a chats
              </Button>
            </div>
          </div>
        ) : (
          <ChatWindow
            chatId={chatId}
            chatName={chatName}
            isGroup={chat?.isGroup || false}
            isLoading={isLoading || isPending || isRefetching}
          />
        )}
      </div>
    </div>
  );
}
