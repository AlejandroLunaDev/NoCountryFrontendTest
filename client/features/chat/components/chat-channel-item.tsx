'use client';

import { Hash, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import socket from '@/lib/socket';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { useQueryClient } from '@tanstack/react-query';
import { usePresence } from '../providers/presence-provider';
import type { ChatMember } from '../lib/api';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// ChatMember extendido que incluye user opcional
interface ExtendedChatMember extends Omit<ChatMember, 'name'> {
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
  name?: string;
}

interface ChatChannelItemProps {
  id: string;
  name: string;
  isGroup: boolean;
  members: ExtendedChatMember[];
  isActive?: boolean;
  onClick?: () => void;
  unseenCount?: number;
}

export function ChatChannelItem({
  id,
  name,
  isGroup,
  members,
  isActive,
  onClick,
  unseenCount = 0
}: ChatChannelItemProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { onlineUsers } = usePresence();
  const router = useRouter();
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Use useMemo to avoid recalculating on every render
  const { otherMemberId, peerName } = useMemo(() => {
    let otherId = null;
    let displayName = name;

    // Si es un grupo, siempre usar el nombre original
    if (isGroup) {
      return { otherMemberId: null, peerName: name };
    }

    if (Array.isArray(members) && members.length > 0 && user) {
      const otherMembers = members.filter(member => member.userId !== user.id);

      if (otherMembers.length > 0) {
        const otherMember = otherMembers[0];
        otherId = otherMember.userId;

        // Determine their name
        if (otherMember.user?.name) {
          displayName = otherMember.user.name;
        } else if (otherMember.user?.email) {
          displayName = otherMember.user.email.split('@')[0];
        } else if (otherMember.name) {
          displayName = otherMember.name;
        } else {
          displayName = name !== 'Chat' && name ? name : 'Usuario';
        }
      }
    }

    return { otherMemberId: otherId, peerName: displayName };
  }, [isGroup, members, user, name]);

  // Check if user is online - simplified
  const isOnline = otherMemberId
    ? onlineUsers.get(otherMemberId) === true
    : false;

  // Handle click on chat
  const handleClick = () => {
    if (onClick) {
      // Request presence state only if needed
      if (otherMemberId) {
        socket.emit('get_user_presence', {
          userId: otherMemberId,
          chatId: id
        });
      }
      onClick();
    }
  };

  // Handle chat deletion
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id) {
      toast.error('Error', {
        description: 'No se pudo identificar al usuario.'
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/chats/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      queryClient.invalidateQueries({ queryKey: ['chats', user.id] });
      toast.success('Chat eliminado', {
        description: 'El chat ha sido eliminado de tu lista.'
      });
      router.push('/chat');
    } catch (error) {
      console.error('Error al eliminar chat:', error);
      toast.error('Error', {
        description: 'No se pudo eliminar el chat. Intenta nuevamente.'
      });
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center p-2 rounded-md cursor-pointer gap-2 hover:bg-zinc-700/50 transition relative',
        isActive && 'bg-zinc-700/50'
      )}
      onClick={handleClick}
    >
      {!isGroup ? (
        <div className='relative'>
          <Avatar className='h-6 w-6'>
            <AvatarFallback className='bg-zinc-700 text-zinc-300 text-xs'>
              {peerName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-zinc-800',
              isOnline ? 'bg-green-500' : 'bg-zinc-500'
            )}
          />
        </div>
      ) : (
        <Hash className='h-4 w-4 text-zinc-500 group-hover:text-zinc-300' />
      )}
      <span
        className={cn(
          'text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition flex-1 truncate',
          isActive && 'text-white font-semibold'
        )}
        title={isGroup ? name : peerName}
      >
        {isGroup ? name : peerName}
      </span>

      {unseenCount > 0 && (
        <div className='flex h-5 w-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-600 text-xs text-white font-medium'>
          {unseenCount > 9 ? '9+' : unseenCount}
        </div>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'p-1 rounded-md absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                'hover:bg-grey-600'
              )}
              onClick={handleDelete}
            >
              <X className='h-4 w-4 text-zinc-400 hover:text-white' />
            </div>
          </TooltipTrigger>
          <TooltipContent side='right'>
            <p className='text-xs'>Eliminar chat</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
