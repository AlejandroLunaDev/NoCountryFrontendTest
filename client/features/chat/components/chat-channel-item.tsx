'use client';

import { useState } from 'react';
import { Hash, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSocket } from '../providers/socket-provider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { useQueryClient } from '@tanstack/react-query';

interface ChatChannelItemProps {
  id: string;
  name: string;
  isActive?: boolean;
  onClick?: () => void;
  unseenCount?: number;
}

export function ChatChannelItem({
  id,
  name,
  isActive,
  onClick,
  unseenCount = 0
}: ChatChannelItemProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the onClick of the parent

    if (!user?.id) {
      toast.error('Error', {
        description: 'No se pudo identificar al usuario.'
      });
      return;
    }

    try {
      console.log(`Deleting chat ${id} for user ${user.id}`);

      // Direct API call to delete the chat for current user only (soft delete)
      const response = await fetch(`${API_BASE_URL}/api/chats/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(`Error: ${response.status}`);
      }

      // Invalidate chat queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['chats'] });

      toast.success('Chat eliminado', {
        description: 'El chat ha sido eliminado de tu lista.'
      });
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
      onClick={onClick}
    >
      <Hash className='h-4 w-4 text-zinc-500 group-hover:text-zinc-300' />
      <span
        className={cn(
          'text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition flex-1',
          isActive && 'text-white font-semibold'
        )}
      >
        {name}
      </span>

      {/* Badge for unread messages */}
      {unseenCount > 0 && (
        <div className='flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs text-white'>
          {unseenCount > 9 ? '9+' : unseenCount}
        </div>
      )}

      {/* Delete button - hover */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'p-1 rounded-md absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                'hover:bg-red-600'
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
