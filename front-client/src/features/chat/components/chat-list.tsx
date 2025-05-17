'use client';

import { useChats, useCreateChat } from '../hooks/use-chat';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Plus,
  Hash,
  Users,
  Settings,
  AtSign,
  ChevronDown,
  Headphones,
  Mic,
  MessageSquare,
  LogOut,
  UserPlus
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { UserSelectDialog } from './user-select-dialog';
import { Avatar } from '@/components/ui/avatar';
import { AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export function ChatList() {
  const { data: chats, isLoading } = useChats();
  const createChatMutation = useCreateChat();
  const [filter, setFilter] = useState('');
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isGroupChannelsOpen, setIsGroupChannelsOpen] = useState(true);
  const [isPrivateChannelsOpen, setIsPrivateChannelsOpen] = useState(true);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

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

    if (isCreatingGroup) {
      // Add user to group selection
      setSelectedUsers(prev => {
        if (prev.includes(selectedUserId)) return prev;
        return [...prev, selectedUserId];
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

  const handleCreateGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      toast.error('Información incompleta', {
        description: 'Necesitas un nombre de grupo y al menos un usuario'
      });
      return;
    }

    try {
      const newChat = await createChatMutation.mutateAsync({
        userIds: selectedUsers,
        name: groupName,
        type: 'GROUP'
      });

      toast.success('Grupo creado con éxito');
      setIsCreatingGroup(false);
      setGroupName('');
      setSelectedUsers([]);
      router.push(`/chat/${newChat.id}`);
    } catch (error) {
      toast.error('Error al crear grupo', {
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
      toast.error('Error al cerrar sesión');
    }
  };

  // Safely filter chats
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

  // Separate group and private chats
  const groupChats = filteredChats.filter(chat => chat.isGroup);
  const privateChats = filteredChats.filter(chat => !chat.isGroup);

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

        {/* Add Group Chat button */}
        <div className='px-2 mt-2'>
          <Button
            className='w-full bg-zinc-700 hover:bg-zinc-600 text-white'
            size='sm'
            onClick={() => setIsCreatingGroup(true)}
          >
            <UserPlus className='mr-2 h-4 w-4' />
            Crear Grupo
          </Button>
        </div>

        {isCreatingGroup && (
          <div className='p-3 my-2 mx-2 bg-zinc-800 rounded-md'>
            <h3 className='text-sm font-semibold text-white mb-2'>
              Nuevo Grupo
            </h3>
            <Input
              placeholder='Nombre del grupo'
              className='mb-2 bg-zinc-700 border-zinc-600'
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
            <div className='flex flex-wrap gap-1 mb-2'>
              {selectedUsers.length > 0 && (
                <div className='text-xs text-zinc-400 mb-1 w-full'>
                  {selectedUsers.length} usuarios seleccionados
                </div>
              )}
            </div>
            <div className='flex gap-2'>
              <Button
                size='sm'
                variant='ghost'
                className='text-zinc-400'
                onClick={() => {
                  setIsCreatingGroup(false);
                  setGroupName('');
                  setSelectedUsers([]);
                }}
              >
                Cancelar
              </Button>
              <Button
                size='sm'
                className='bg-primary'
                onClick={() => {
                  // Trigger user select dialog
                  const trigger = document.querySelector(
                    '.new-message-trigger'
                  ) as HTMLButtonElement;
                  if (trigger) trigger.click();
                }}
              >
                Añadir Usuarios
              </Button>
              <Button
                size='sm'
                className='bg-green-600 hover:bg-green-700'
                onClick={handleCreateGroupChat}
                disabled={!groupName.trim() || selectedUsers.length === 0}
              >
                Crear
              </Button>
            </div>
          </div>
        )}

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
                // Skeletons for loading state
                <>
                  <Skeleton className='h-8 w-full bg-zinc-800' />
                  <Skeleton className='h-8 w-full bg-zinc-800' />
                </>
              ) : groupChats.length === 0 ? (
                <p className='text-xs italic text-zinc-500 py-1 px-2'>
                  No hay canales
                </p>
              ) : (
                // List of group channels
                groupChats.map(chat => (
                  <Button
                    key={chat.id}
                    variant='ghost'
                    className={cn(
                      'w-full justify-start px-2 py-2 h-auto text-sm font-medium rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700',
                      'relative'
                    )}
                    onClick={() => handleChatSelect(chat.id)}
                  >
                    <Hash className='w-4 h-4 mr-2 flex-shrink-0' />
                    <span className='truncate'>{chat.name || 'Canal'}</span>
                  </Button>
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
              {privateChats.length > 0 ? (
                privateChats.map(chat => {
                  let displayName = chat.name || '';

                  if (!chat.isGroup && !displayName) {
                    const otherMember = chat.members.find(
                      m => m.userId !== user?.id
                    );
                    displayName = otherMember?.name || 'Usuario';
                  }

                  // Get online status
                  const isOnline = chat.members.some(
                    m => m.userId !== user?.id && (m as any).status === 'ONLINE'
                  );

                  // Get initials for avatar
                  const initials = displayName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);

                  return (
                    <Button
                      key={chat.id}
                      variant='ghost'
                      className='w-full justify-start px-2 py-1.5 h-auto text-sm rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700'
                      onClick={() => handleChatSelect(chat.id)}
                    >
                      <div className='flex items-center w-full'>
                        <div className='relative mr-2'>
                          <Avatar className='h-7 w-7'>
                            <AvatarFallback className='bg-zinc-700 text-zinc-300 text-xs'>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <span className='absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-zinc-900'></span>
                          )}
                        </div>
                        <span className='truncate'>{displayName}</span>
                      </div>
                    </Button>
                  );
                })
              ) : (
                <div className='flex items-center justify-between px-1 py-2'>
                  <span className='text-xs text-zinc-500'>
                    No hay mensajes directos
                  </span>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-700'
                    onClick={() => {
                      const trigger = document.querySelector(
                        '.new-message-trigger'
                      ) as HTMLButtonElement;
                      if (trigger) trigger.click();
                    }}
                  >
                    <Plus className='h-4 w-4' />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* New Message Button */}
          <div className='px-2 mt-2'>
            <Button
              variant='ghost'
              className='w-full justify-between px-2 py-1 h-8 text-sm rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700'
              onClick={() => {
                const trigger = document.querySelector(
                  '.new-message-trigger'
                ) as HTMLButtonElement;
                if (trigger) trigger.click();
              }}
            >
              <div className='flex items-center'>
                <AtSign className='h-4 w-4 mr-2' />
                <span>Nuevo mensaje</span>
              </div>
              <Plus className='h-4 w-4' />
            </Button>
          </div>
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
          onSelectUser={handleUserSelect}
          trigger={<button className='new-message-trigger' />}
        />
      </div>
    </div>
  );
}
