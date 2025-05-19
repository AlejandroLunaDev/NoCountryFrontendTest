'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { Check, CheckCheck } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

export interface ChatMessageProps {
  id: string;
  content: string;
  sender: string;
  isCurrentUser: boolean;
  timestamp: string;
  showSender?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  isPending?: boolean;
  replyTo?: string;
  readBy?: string[];
}

export function ChatMessage({
  id,
  content,
  sender,
  isCurrentUser,
  timestamp,
  showSender = false,
  isFirstInGroup = false,
  isLastInGroup = false,
  isPending = false,
  replyTo,
  readBy = []
}: ChatMessageProps) {
  const { user } = useAuth();

  // Formatea la hora del mensaje
  const formattedTime = format(new Date(timestamp), 'HH:mm', {
    locale: es
  });

  // Obtener las iniciales para el avatar
  const getInitials = () => {
    return sender.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className={cn(
        'hover:bg-[#2e3035]/50 py-0.5 w-full',
        isFirstInGroup ? 'mt-4' : 'mt-0'
      )}
    >
      <div className='relative flex w-full'>
        {/* Avatar - mostrar solo para el primer mensaje en un grupo */}
        {isFirstInGroup ? (
          <div className='flex-shrink-0 mr-3 pt-1 w-9'>
            <Avatar className='h-8 w-8 rounded-full'>
              <AvatarImage src={`https://ui-avatars.com/api/?name=${sender}`} />
              <AvatarFallback className='text-xs'>
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <div className='flex-shrink-0 mr-3 w-9'>
            {/* Espacio vacío para alinear con el avatar */}
          </div>
        )}

        <div className='flex-1 min-w-0'>
          {/* Mostrar nombre de usuario y timestamp para primer mensaje del grupo */}
          {isFirstInGroup && (
            <div className='flex items-center mb-0.5'>
              <span
                className={cn(
                  'font-medium text-sm',
                  isCurrentUser ? 'text-[#7289da]' : 'text-[#e67e22]'
                )}
              >
                {sender}
              </span>
              <span className='ml-1.5 text-xs text-[#72767d]'>
                {formattedTime}
              </span>
            </div>
          )}

          {/* Contenido del mensaje */}
          <div className='text-[#dcddde] break-words text-sm'>{content}</div>

          {/* Mostrar check de enviado solo si es el último mensaje en un grupo y es del usuario actual */}
          {isLastInGroup && isCurrentUser && (
            <div className='flex justify-start mt-1'>
              <span className='text-xs text-[#72767d]'>
                {isPending ? (
                  <Check className='h-3 w-3' />
                ) : (
                  <CheckCheck className='h-3 w-3 text-[#7289da]' />
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
