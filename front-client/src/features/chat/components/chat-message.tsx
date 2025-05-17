'use client';

import { useAuth } from '@/features/auth/providers/auth-provider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCheck, Clock } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { AvatarFallback } from '@/components/ui/avatar';

interface Message {
  id: string;
  content: string;
  senderId: string;
  chatId: string;
  createdAt: string;
  senderName?: string;
  replyToId?: string;
  sender?: {
    id: string;
    name: string;
  };
  isError?: boolean;
}

interface ChatMessageProps {
  message: Message;
  isLastInGroup: boolean;
  isFirstInGroup: boolean;
  isPending?: boolean;
}

export function ChatMessage({
  message,
  isLastInGroup,
  isFirstInGroup,
  isPending = false
}: ChatMessageProps) {
  const { user } = useAuth();
  const isCurrentUser = message.senderId === user?.id;

  // Format message time
  const messageTime = new Date(message.createdAt);
  const formattedTime = format(messageTime, 'HH:mm', { locale: es });
  const formattedDate = format(messageTime, 'dd/MM/yyyy', { locale: es });

  // Get sender name for display
  const senderName = message.sender?.name || message.senderName || 'Usuario';

  // Generate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div
      className={`flex group hover:bg-zinc-800/30 rounded px-4 ${
        isFirstInGroup ? 'mt-6' : 'mt-0.5'
      } ${isLastInGroup ? 'mb-2' : 'mb-0'} py-1`}
    >
      {/* Avatar - Only show for first message in group */}
      {isFirstInGroup ? (
        <div className='flex-shrink-0 mr-3 mt-0.5'>
          <Avatar className='h-10 w-10 rounded-full'>
            <AvatarFallback className='bg-zinc-700 text-zinc-300'>
              {getInitials(senderName)}
            </AvatarFallback>
          </Avatar>
        </div>
      ) : (
        <div className='w-10 flex-shrink-0 mr-3'></div>
      )}

      <div className='flex-1 min-w-0'>
        {/* Sender info - Only show for first message in group */}
        {isFirstInGroup && (
          <div className='flex items-center mb-1'>
            <span className='font-medium text-blue-400'>{senderName}</span>
            <span className='text-xs text-zinc-400 ml-2'>
              {formattedDate} {formattedTime}
            </span>
          </div>
        )}

        {/* Message content */}
        <div className='break-words text-zinc-200'>
          <div className='relative group'>
            <p className='leading-relaxed'>{message.content}</p>

            {/* Status indicators (only for current user) */}
            {isCurrentUser && (
              <div className='text-xs text-zinc-400 absolute -right-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity'>
                {isPending ? (
                  <Clock className='h-3 w-3' />
                ) : message.isError ? (
                  <span className='text-red-500'>!</span>
                ) : (
                  <CheckCheck className='h-3 w-3' />
                )}
              </div>
            )}

            {/* Hidden timestamp that appears on hover */}
            {!isFirstInGroup && (
              <span className='hidden group-hover:inline-block text-xs text-zinc-500 ml-2'>
                {formattedTime}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
