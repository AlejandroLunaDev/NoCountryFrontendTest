'use client';

import { useChats, useCreateChat } from '../hooks/use-chat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { UserSelectDialog } from './user-select-dialog';

export function ChatList() {
  const { data: chats, isLoading } = useChats();
  const createChatMutation = useCreateChat();
  const [filter, setFilter] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  const handleChatSelect = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const handleUserSelect = async (selectedUserId: string, userName: string) => {
    if (!user?.id) {
      toast.error('No se puede crear chat', {
        description: 'Necesitas iniciar sesión'
      });
      return;
    }

    try {
      const newChat = await createChatMutation.mutateAsync({
        userIds: [selectedUserId],
        name: userName,
        type: 'INDIVIDUAL'
      });

      toast.success('Chat creado con éxito');
      router.push(`/chat/${newChat.id}`);
    } catch (error) {
      toast.error('Error al crear chat', {
        description: 'Inténtalo nuevamente'
      });
    }
  };

  // Filtrar chats de forma segura
  const filteredChats = Array.isArray(chats)
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

  return (
    <div className='w-full max-w-md flex flex-col h-screen bg-card dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800'>
      <CardHeader className='py-6 px-6 border-b border-gray-200 dark:border-gray-800'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
            Mensajes
          </h2>
          <UserSelectDialog onSelectUser={handleUserSelect} />
        </div>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500' />
          <Input
            placeholder='Buscar conversaciones...'
            className='pl-10 h-10'
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className='flex-1 overflow-y-auto p-0'>
        {isLoading ? (
          <div className='p-6 space-y-4'>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className='flex items-center gap-4 p-3 rounded-lg'>
                <Skeleton className='h-12 w-12 rounded-full' />
                <div className='space-y-2 flex-1'>
                  <Skeleton className='h-4 w-1/3' />
                  <Skeleton className='h-3 w-1/2' />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className='h-full flex flex-col items-center justify-center p-8 text-center'>
            <div className='bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4'>
              <MessageSquare className='h-12 w-12 text-primary' />
            </div>
            <h3 className='text-xl font-medium text-gray-900 dark:text-white'>
              No hay conversaciones
            </h3>
            <p className='text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-xs'>
              {filter
                ? 'No se encontraron resultados'
                : 'Inicia una nueva conversación con el botón "Nuevo chat"'}
            </p>
          </div>
        ) : (
          <div className='p-2'>
            {filteredChats.map(chat => {
              let displayName = chat.name || '';

              if (!chat.isGroup && !displayName) {
                const otherMember = chat.members.find(
                  m => m.userId !== user?.id
                );
                displayName = otherMember?.name || 'Chat';
              }

              return (
                <div
                  key={chat.id}
                  className='flex items-center p-4 my-1 rounded-lg border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors'
                  onClick={() => handleChatSelect(chat.id)}
                >
                  <div className='h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-medium flex-shrink-0'>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className='ml-4 flex-1 min-w-0'>
                    <div className='flex justify-between items-center'>
                      <h3 className='font-semibold text-gray-900 dark:text-white truncate'>
                        {displayName}
                      </h3>
                      {chat.lastMessage && (
                        <span className='text-xs text-gray-500 dark:text-gray-400'>
                          {new Date(
                            chat.lastMessage.createdAt
                          ).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                    <p className='text-sm text-gray-600 dark:text-gray-400 truncate'>
                      {chat.lastMessage?.content || 'Iniciar conversación...'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </div>
  );
}
