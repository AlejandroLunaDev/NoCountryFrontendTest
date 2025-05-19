import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { usePresence } from '../providers/presence-provider';
import type { ChatMember } from '../lib/api';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { AddMemberDialog } from './add-member-dialog';
import { useSocket } from '../providers/socket-provider';

interface ExtendedChatMember extends ChatMember {
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
}

interface ChatMembersSidebarProps {
  members: ExtendedChatMember[];
  isVisible: boolean;
  chatId: string;
}

export function ChatMembersSidebar({
  members,
  isVisible,
  chatId
}: ChatMembersSidebarProps) {
  const { user } = useAuth();
  const { onlineUsers } = usePresence();
  const [membersList, setMembersList] = useState<ExtendedChatMember[]>([]);
  const { socket, status } = useSocket();

  // Actualizar los miembros cuando cambia la prop
  useEffect(() => {
    if (members && Array.isArray(members)) {
      setMembersList(members);
    }
  }, [members]);

  // Escuchar eventos de socket para actualizaciones en tiempo real
  useEffect(() => {
    if (!socket || !chatId || status !== 'connected') return;

    const handleMemberAdded = (data: any) => {
      if (data.chatId === chatId && data.members) {
        // Actualizar directamente la lista de miembros con los nuevos datos
        setMembersList(prevMembers => {
          // Si recibimos un array completo de miembros, lo usamos
          if (Array.isArray(data.members)) {
            return data.members;
          }

          // Si solo recibimos un nuevo miembro, lo añadimos si no existe
          if (data.newMember) {
            const exists = prevMembers.some(
              m => m.userId === data.newMember.userId
            );
            if (!exists) {
              return [...prevMembers, data.newMember];
            }
          }

          return prevMembers;
        });
      }
    };

    socket.on('member_added', handleMemberAdded);
    socket.on('chat_updated', handleMemberAdded);

    return () => {
      socket.off('member_added', handleMemberAdded);
      socket.off('chat_updated', handleMemberAdded);
    };
  }, [socket, chatId, status]);

  if (!isVisible) return null;

  // Extraer los IDs de los miembros actuales
  const currentMemberIds = membersList.map(member => member.userId);

  return (
    <div className='w-60 bg-zinc-900 border-l border-zinc-800 overflow-y-auto flex-shrink-0 hidden md:block'>
      <div className='p-3 border-b border-zinc-800 flex justify-between items-center'>
        <h3 className='text-xs font-semibold text-zinc-400 uppercase tracking-wider'>
          PARTICIPANTES - {membersList.length}
        </h3>
        <AddMemberDialog
          chatId={chatId}
          currentMembers={currentMemberIds}
          trigger={
            <Button
              size='sm'
              variant='ghost'
              className='h-7 w-7 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800'
              title='Agregar miembros'
            >
              <UserPlus className='h-3.5 w-3.5' />
            </Button>
          }
        />
      </div>

      <div className='p-3 space-y-1'>
        {membersList.map(member => {
          const isOnline = onlineUsers.get(member.userId) === true;
          const isCurrentUser = member.userId === user?.id;

          // Intentamos obtener el nombre de todas las posibles fuentes
          const displayName =
            member.user?.name ||
            member.name ||
            member.user?.email?.split('@')[0] ||
            'Usuario';

          // Iniciales para el avatar
          const initials = displayName.substring(0, 2).toUpperCase();

          return (
            <div
              key={member.userId}
              className='flex items-center space-x-2 p-2 rounded-md hover:bg-zinc-800'
            >
              <div className='relative'>
                <Avatar className='h-8 w-8'>
                  <AvatarFallback className='bg-zinc-700 text-zinc-300 text-xs'>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-900 ${
                    isOnline ? 'bg-green-500' : 'bg-zinc-500'
                  }`}
                />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-zinc-300 truncate'>
                  {displayName}
                  {isCurrentUser && ' (tú)'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
