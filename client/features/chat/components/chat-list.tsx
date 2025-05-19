'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Plus,
  ChevronDown,
  Headphones,
  Mic,
  LogOut
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { UserSelectDialog } from './user-select-dialog';
import { Avatar } from '@/components/ui/avatar';
import { AvatarFallback } from '@/components/ui/avatar';
import { ChatChannelItem } from './chat-channel-item';
import { useChats, useCreateChat } from '../hooks/use-chat.ts';
import type { Chat as ApiChat, Message } from '../lib/api';
import socket from '@/lib/socket';

// Use explicitly extended interface to avoid type errors
interface ExtendedChatMember {
  userId: string;
  name?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
}

export function ChatList() {
  const { data: chats, isLoading, refetch } = useChats();
  const createChatMutation = useCreateChat();
  const [filter, setFilter] = useState('');
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isGroupChannelsOpen, setIsGroupChannelsOpen] = useState(true);
  const [isPrivateChannelsOpen, setIsPrivateChannelsOpen] = useState(true);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Reducir los re-fetches a solo cuando es necesario
  useEffect(() => {
    if (user?.id) {
      refetch();
    }
  }, [user?.id, refetch]); // Solo cuando cambia el usuario, no en cada montaje

  useEffect(() => {
    // Actualizar currentChatId cuando cambia la ruta
    const chatIdFromPath = window.location.pathname.split('/').pop();
    if (chatIdFromPath && chatIdFromPath !== 'chat') {
      setCurrentChatId(chatIdFromPath);
    }
  }, []); // Solo al montar, no es necesario en cada renderizado

  // Memoize filtered chats
  const filteredChats = useMemo(() => {
    return Array.isArray(chats)
      ? chats.filter(chat => {
          if (!filter) return true;
          const searchTerm = filter.toLowerCase();

          const nameMatch = chat.name?.toLowerCase()?.includes(searchTerm);
          const lastMessageMatch = chat.lastMessage?.content
            ?.toLowerCase()
            ?.includes(searchTerm);
          const memberMatch = chat.members?.some(m =>
            m.name?.toLowerCase()?.includes(searchTerm)
          );

          return nameMatch || lastMessageMatch || memberMatch;
        })
      : [];
  }, [chats, filter]);

  // Memoize separated chats
  const { groupChats, privateChats } = useMemo(() => {
    // Verificamos que existan chats primero para evitar errores
    if (
      !filteredChats ||
      !Array.isArray(filteredChats) ||
      filteredChats.length === 0
    ) {
      return { groupChats: [], privateChats: [] };
    }

    // Usamos type en lugar de isGroup para la clasificación
    return {
      groupChats: filteredChats.filter(chat => chat.type === 'GROUP'),
      privateChats: filteredChats.filter(chat => chat.type === 'INDIVIDUAL')
    };
  }, [filteredChats]);

  // Display debug info only in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('ChatList - Current chats:', {
        all: chats,
        groups: groupChats,
        private: privateChats,
        currentId: currentChatId
      });
    }
  }, [chats, groupChats, privateChats, currentChatId]);

  // Escuchar mensajes nuevos para actualizar los contadores de no leídos
  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleNewMessage = (message: Message) => {
      // Si el mensaje no es del usuario actual y no es del chat activo, incrementar contador
      if (message.senderId !== user.id && message.chatId !== currentChatId) {
        setUnreadCounts(prev => ({
          ...prev,
          [message.chatId]: (prev[message.chatId] || 0) + 1
        }));

        // Si estamos en desarrollo, mostrar log de depuración
        if (process.env.NODE_ENV === 'development') {
          console.log('Nuevo mensaje recibido, actualizando contador:', {
            chatId: message.chatId,
            from: message.senderId,
            content: message.content,
            unreadCounts: {
              ...unreadCounts,
              [message.chatId]: (unreadCounts[message.chatId] || 0) + 1
            }
          });
        }
      }
    };

    // Escuchar evento de mensaje recibido
    socket.on('message_received', handleNewMessage);

    return () => {
      socket.off('message_received', handleNewMessage);
    };
  }, [user?.id, currentChatId, unreadCounts]);

  const handleChatSelect = (chatId: string) => {
    router.push(`/chat/${chatId}`);
    setCurrentChatId(chatId);

    // Resetear contador de mensajes no leídos para este chat
    if (unreadCounts[chatId]) {
      setUnreadCounts(prev => ({
        ...prev,
        [chatId]: 0
      }));

      // Informar al servidor que se han leído los mensajes
      if (socket && user?.id) {
        socket.emit('read_chat', {
          chatId,
          userId: user.id
        });
      }
    }
  };

  const handleCreateChat = async (
    isGroup: boolean,
    userIds: string[],
    groupName: string
  ) => {
    if (!user?.id || userIds.length === 0) {
      toast.error('No se puede crear chat', {
        description:
          'Necesitas iniciar sesión y seleccionar al menos un usuario'
      });
      return;
    }

    try {
      const newChat = await createChatMutation.mutateAsync({
        userIds: userIds,
        name: isGroup ? groupName : '',
        type: isGroup ? 'GROUP' : 'INDIVIDUAL'
      });

      toast.success(
        isGroup ? 'Grupo creado con éxito' : 'Chat creado con éxito'
      );
      router.push(`/chat/${newChat.id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Error al crear chat', {
        description: 'Inténtalo nuevamente'
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
      toast.success('Sesión cerrada');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  const getChatDisplayName = (chat: ApiChat): string => {
    // Para chats grupales, SIEMPRE usar el name del chat
    if (chat.type === 'GROUP') {
      return chat.name || 'Grupo sin nombre'; // Si es grupo, SIEMPRE retornar el nombre del grupo
    }

    // Para chats individuales (1 a 1), mostrar el nombre del otro usuario
    if (chat.members) {
      const otherMember = chat.members.find(m => m.userId !== user?.id) as
        | ExtendedChatMember
        | undefined;

      if (otherMember) {
        if (otherMember.user?.name) return otherMember.user.name;
        if (otherMember.user?.email)
          return otherMember.user.email.split('@')[0];
        if (otherMember.name) return otherMember.name;
      }
      return 'Usuario';
    }

    return chat.name || 'Chat';
  };

  return (
    <div className='w-60 flex flex-col bg-zinc-900 overflow-hidden'>
      {/* Server name with dropdown */}
      <div className='h-12 px-4 flex items-center justify-between border-b border-zinc-800 shadow-sm'>
        <h2 className='font-semibold text-white truncate'>No Country</h2>
        <Button variant='ghost' size='icon' className='h-5 w-5 text-zinc-400'>
          <ChevronDown className='h-4 w-4' />
        </Button>
      </div>

      {/* Channels section */}
      <div className='flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700'>
        {/* Search */}
        <div className='p-2'>
          <div className='relative'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-zinc-500' />
            <Input
              placeholder='Buscar'
              className='pl-8 bg-zinc-800 border-zinc-700 text-sm text-zinc-400 focus-visible:ring-zinc-600'
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Nuevo Mensaje Button */}
        <div className='px-2 mt-2'>
          <Button
            className='w-full bg-zinc-700 hover:bg-zinc-600 text-white flex items-center justify-center gap-2'
            size='sm'
            onClick={() => {
              const trigger = document.querySelector(
                '.new-message-trigger'
              ) as HTMLButtonElement;
              if (trigger) trigger.click();
            }}
          >
            <Plus className='h-4 w-4' />
            <span>Nuevo Mensaje</span>
          </Button>
        </div>

        {/* Group Channels */}
        <div className='mt-4'>
          <button
            onClick={() => setIsGroupChannelsOpen(!isGroupChannelsOpen)}
            className='flex items-center px-2 py-1.5 w-full text-left text-xs font-semibold text-zinc-400 hover:text-zinc-300'
          >
            <ChevronDown
              className={`h-3 w-3 mr-1 ${
                isGroupChannelsOpen ? '' : 'transform -rotate-90'
              }`}
            />
            CANALES DE TEXTO
          </button>

          {isGroupChannelsOpen && (
            <div className='mt-1 space-y-0.5 px-2'>
              {isLoading ? (
                <>
                  <Skeleton className='h-8 w-full bg-zinc-800' />
                  <Skeleton className='h-8 w-full bg-zinc-800' />
                </>
              ) : groupChats.length === 0 ? (
                <p className='text-xs italic text-zinc-500 py-1 px-2'>
                  No hay canales
                </p>
              ) : (
                groupChats.map(chat => (
                  <ChatChannelItem
                    key={chat.id}
                    id={chat.id}
                    name={getChatDisplayName(chat)}
                    isGroup={chat.type === 'GROUP'}
                    members={chat.members || []}
                    isActive={currentChatId === chat.id}
                    onClick={() => handleChatSelect(chat.id)}
                    unseenCount={unreadCounts[chat.id] || chat.unreadCount || 0}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Private Messages */}
        <div className='mt-4'>
          <button
            onClick={() => setIsPrivateChannelsOpen(!isPrivateChannelsOpen)}
            className='flex items-center px-2 py-1.5 w-full text-left text-xs font-semibold text-zinc-400 hover:text-zinc-300'
          >
            <ChevronDown
              className={`h-3 w-3 mr-1 ${
                isPrivateChannelsOpen ? '' : 'transform -rotate-90'
              }`}
            />
            MENSAJES DIRECTOS
          </button>

          {isPrivateChannelsOpen && (
            <div className='mt-1 space-y-0.5 px-2'>
              {privateChats
                .filter(chat => chat.type === 'INDIVIDUAL')
                .map(chat => (
                  <ChatChannelItem
                    key={chat.id}
                    id={chat.id}
                    name={getChatDisplayName(chat)}
                    isGroup={chat.type === 'GROUP'}
                    members={chat.members || []}
                    isActive={currentChatId === chat.id}
                    onClick={() => handleChatSelect(chat.id)}
                    unseenCount={unreadCounts[chat.id] || chat.unreadCount || 0}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* User profile section */}
      <div className='h-14 px-2 flex items-center bg-zinc-950'>
        <div className='flex items-center'>
          <Avatar className='h-8 w-8'>
            <AvatarFallback className='bg-primary text-primary-foreground text-xs'>
              {user?.email?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className='ml-2 text-sm font-medium text-white truncate max-w-[90px]'>
            {user?.email?.split('@')[0] || 'Usuario'}
          </div>
        </div>
        <div className='ml-auto flex items-center gap-1.5'>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800'
          >
            <Mic className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800'
          >
            <Headphones className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800'
            onClick={handleLogout}
          >
            <LogOut className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Hidden trigger for user select dialog */}
      <div className='hidden'>
        <UserSelectDialog
          onCreateChat={handleCreateChat}
          onSelectUser={() => {}}
          trigger={<button className='new-message-trigger' />}
        />
      </div>
    </div>
  );
}
