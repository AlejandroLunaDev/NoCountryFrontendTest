import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { usePresence } from '../providers/presence-provider';
import type { ChatMember } from '../lib/api';
import { useEffect } from 'react';

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
}

export function ChatMembersSidebar({
  members,
  isVisible
}: ChatMembersSidebarProps) {
  const { user } = useAuth();
  const { onlineUsers } = usePresence();

  // Log para debug
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('ChatMemberSidebar - Miembros recibidos:', members);
    }
  }, [members]);

  if (!isVisible) return null;

  return (
    <div className='w-60 bg-zinc-900 border-l border-zinc-800 overflow-y-auto flex-shrink-0 hidden md:block'>
      <div className='p-3 border-b border-zinc-800'>
        <h3 className='text-xs font-semibold text-zinc-400 uppercase tracking-wider'>
          PARTICIPANTES - {members.length}
        </h3>
      </div>

      <div className='p-3 space-y-1'>
        {members.map(member => {
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
