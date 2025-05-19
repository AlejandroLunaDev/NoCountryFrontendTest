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
        'flex gap-2 p-4',
        isCurrentUser ? 'justify-end' : 'justify-start',
        !isLastInGroup && 'pb-1',
        !isFirstInGroup && 'pt-1'
      )}
    >
      {!isCurrentUser && isFirstInGroup && (
        <Avatar className='h-8 w-8'>
          <AvatarImage
            src={`https://ui-avatars.com/api/?name=${sender}`}
          />
          <AvatarFallback>{getInitials()}</AvatarFallback>
        </Avatar>
      )}

      {!isCurrentUser && !isFirstInGroup && <div className='w-8' />}

      <div className={cn('flex flex-col max-w-[75%]', isCurrentUser && 'items-end')}>
        {isFirstInGroup && !isCurrentUser && (
          <div className='text-xs font-medium text-zinc-500 mb-1'>
            {sender}
          </div>
        )}

        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm',
            isCurrentUser ? 'bg-indigo-600 text-white' : 'bg-zinc-700 text-zinc-100'
          )}
        >
          {content}
        </div>

        <div className='flex items-center mt-1 space-x-2'>
          <span className='text-xs text-zinc-500'>{formattedTime}</span>

          {isCurrentUser && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    {isPending ? (
                      <Check className='h-3 w-3 text-zinc-500' />
                    ) : (
                      <CheckCheck className='h-3 w-3 text-indigo-400' />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side='top'
                  className='bg-zinc-800 text-white border-zinc-700'
                >
                  <p className='text-xs'>Enviado</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
}
