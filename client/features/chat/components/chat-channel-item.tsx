'use client';

import { Hash, X, AtSign } from 'lucide-react';
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

  // SOLUCIÓN DIRECTA: Si tenemos los usuarios online en el mapa,
  // mostramos el indicador verde para cualquier usuario que no sea el actual

  // LÓGICA DIRECTA - Sin estados
  // 1. Encontrar el otro usuario directamente
  let otherMemberId = null;
  let peerName = name;

  // Debugging - Mostrar miembros recibidos
  console.log('Members array:', members);
  console.log('Current user:', user?.id);

  if (!isGroup && Array.isArray(members) && members.length > 0 && user) {
    // Intentar encontrar explícitamente al otro miembro
    const otherMembers = members.filter(member => {
      const isOtherMember = member.userId !== user.id;
      console.log(
        `Evaluando miembro: ${member.userId} (${
          isOtherMember ? 'otro' : 'actual'
        })`
      );
      return isOtherMember;
    });

    console.log('Miembros filtrados:', otherMembers);

    if (otherMembers.length > 0) {
      const otherMember = otherMembers[0];
      otherMemberId = otherMember.userId;
      console.log(`Encontrado otro miembro: ${otherMemberId}`);

      // Determinar su nombre
      if (otherMember.user?.name) {
        peerName = otherMember.user.name;
      } else if (otherMember.user?.email) {
        peerName = otherMember.user.email.split('@')[0];
      } else if (otherMember.name) {
        peerName = otherMember.name;
      } else {
        peerName = name !== 'Chat' && name ? name : 'Usuario';
      }
    } else {
      console.log('No se encontró otro miembro en el chat');
    }
  }

  // 2. Verificar si está online directamente
  const isOnline = otherMemberId
    ? onlineUsers.get(otherMemberId) === true
    : false;

  // Log completo para depuración
  console.log('Estado online:', {
    otherMemberId,
    isOnline,
    onlineUsers: onlineUsers ? Array.from(onlineUsers.entries()) : [],
    lookupResult: otherMemberId ? onlineUsers.get(otherMemberId) : 'N/A'
  });

  // Verificación manual de cada usuario en el mapa
  if (otherMemberId && onlineUsers && onlineUsers.size > 0) {
    console.log(`Verificación manual para ${otherMemberId}:`);
    onlineUsers.forEach((value, key) => {
      const matches = key === otherMemberId;
      console.log(
        `  - Usuario ${key}: ${value ? 'online' : 'offline'} ${
          matches ? '(COINCIDE)' : ''
        }`
      );
    });
  }

  // Manejar clic en el chat
  const handleClick = () => {
    if (onClick) {
      // Si tenemos el ID del otro usuario, solicitar su estado de presencia
      if (otherMemberId) {
        socket.emit('get_user_presence', {
          userId: otherMemberId,
          chatId: id
        });
      }
      onClick();
    }
  };

  // Manejar eliminación del chat
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
<div
  className={cn(
    'w-3.5 h-3.5 rounded-full absolute -top-1 -left-1 border-2 border-zinc-800',
    otherMemberId && onlineUsers.get(otherMemberId)
      ? 'bg-green-500 animate-pulse'
      : 'bg-zinc-500'
  )}
/>

          <AtSign className='h-4 w-4 text-zinc-500 group-hover:text-zinc-300 ml-1.5' />
        </div>
      ) : (
        <Hash className='h-4 w-4 text-zinc-500 group-hover:text-zinc-300' />
      )}
      <span
        className={cn(
          'text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition flex-1 truncate',
          isActive && 'text-white font-semibold'
        )}
        title={peerName}
      >
        {peerName}
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
