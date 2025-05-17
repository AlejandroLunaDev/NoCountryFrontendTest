'use client';

import { useAuth } from '@/features/auth/providers/auth-provider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCheck, Clock } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  chatId: string;
  createdAt: string;
  senderName?: string;
  replyToId?: string;
}

interface ChatMessageProps {
  message: Message;
  isLastInGroup: boolean;
  isFirstInGroup: boolean;
  showSender?: boolean;
  isPending?: boolean;
}

export function ChatMessage({
  message,
  isLastInGroup,
  isFirstInGroup,
  showSender = false,
  isPending = false
}: ChatMessageProps) {
  const { user } = useAuth();
  const isCurrentUser = message.senderId === user?.id;

  // Formatear la hora del mensaje
  const messageTime = new Date(message.createdAt);
  const formattedTime = format(messageTime, 'HH:mm', { locale: es });

  return (
    <div
      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} ${
        isLastInGroup ? 'mb-3' : 'mb-1'
      }`}
    >
      <div
        className={`max-w-[75%] flex flex-col ${
          isCurrentUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Nombre del remitente (solo para grupos y si no es el usuario actual) */}
        {showSender && !isCurrentUser && isFirstInGroup && (
          <span className='text-xs text-blue-600 dark:text-blue-400 font-medium ml-1 mb-0.5'>
            {message.senderName || 'Usuario'}
          </span>
        )}

        {/* Contenido del mensaje */}
        <div
          className={`py-2 px-3 rounded-lg text-sm ${
            isCurrentUser
              ? 'bg-primary text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
          }`}
        >
          {message.content}
          <span className='text-xs ml-2 opacity-70 inline-flex items-center gap-1'>
            {formattedTime}
            {isCurrentUser &&
              (isPending ? (
                <Clock className='h-3 w-3 inline' />
              ) : (
                <CheckCheck className='h-3 w-3 inline' />
              ))}
          </span>
        </div>
      </div>
    </div>
  );
}
