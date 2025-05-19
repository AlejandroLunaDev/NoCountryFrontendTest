'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatMessage as ChatMessageType } from '../hooks/use-chat.tsx';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { Check, CheckCheck } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface ChatMessageProps {
  message: ChatMessageType;
  isLastInGroup?: boolean;
  isFirstInGroup?: boolean;
  members: Array<{ userId: string; userName: string }>;
}

export function ChatMessage({
  message,
  isLastInGroup = false,
  isFirstInGroup = false,
  members = []
}: ChatMessageProps) {
  const { user } = useAuth();
  const isOwn = message.senderId === user?.id;

  // Formatea la hora del mensaje
  const formattedTime = format(new Date(message.createdAt), 'HH:mm', {
    locale: es
  });

  // Obtener el nombre del remitente
  const getSenderName = () => {
    return message.senderName || 'Usuario';
  };

  // Obtener las iniciales para el avatar
  const getInitials = () => {
    const name = getSenderName();
    return name.substring(0, 2).toUpperCase();
  };

  // Verificar si todos los miembros han leído el mensaje
  const hasAllMembersRead = () => {
    if (!members || !members.length) return false;

    const otherMembers = members.filter(m => m.userId !== user?.id);
    return otherMembers.every(member => message.readBy.includes(member.userId));
  };

  // Calcular cuántos miembros han leído el mensaje
  const getReadCount = () => {
    if (!members || !members.length) return 0;

    const otherMembers = members.filter(m => m.userId !== user?.id);
    return otherMembers.filter(member => message.readBy.includes(member.userId))
      .length;
  };

  // Obtener nombres de quienes han leído para el tooltip
  const getReadNames = () => {
    if (!members || !members.length) return '';

    const readMemberNames = members
      .filter(
        member =>
          message.readBy.includes(member.userId) && member.userId !== user?.id
      )
      .map(member => member.userName);

    if (readMemberNames.length === 0) return 'Nadie ha leído este mensaje aún';
    return `Leído por: ${readMemberNames.join(', ')}`;
  };

  return (
    <div
      className={cn(
        'flex gap-2 p-4',
        isOwn ? 'justify-end' : 'justify-start',
        !isLastInGroup && 'pb-1',
        !isFirstInGroup && 'pt-1'
      )}
    >
      {!isOwn && isFirstInGroup && (
        <Avatar className='h-8 w-8'>
          <AvatarImage
            src={`https://ui-avatars.com/api/?name=${getSenderName()}`}
          />
          <AvatarFallback>{getInitials()}</AvatarFallback>
        </Avatar>
      )}

      {!isOwn && !isFirstInGroup && <div className='w-8' />}

      <div className={cn('flex flex-col max-w-[75%]', isOwn && 'items-end')}>
        {isFirstInGroup && !isOwn && (
          <div className='text-xs font-medium text-zinc-500 mb-1'>
            {getSenderName()}
          </div>
        )}

        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm',
            isOwn ? 'bg-indigo-600 text-white' : 'bg-zinc-700 text-zinc-100'
          )}
        >
          {message.content}
        </div>

        <div className='flex items-center mt-1 space-x-2'>
          <span className='text-xs text-zinc-500'>{formattedTime}</span>

          {isOwn && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    {hasAllMembersRead() ? (
                      <CheckCheck className='h-3 w-3 text-indigo-400' />
                    ) : getReadCount() > 0 ? (
                      <Check className='h-3 w-3 text-indigo-400' />
                    ) : (
                      <Check className='h-3 w-3 text-zinc-500' />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side='top'
                  className='bg-zinc-800 text-white border-zinc-700'
                >
                  <p className='text-xs'>{getReadNames()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
}
