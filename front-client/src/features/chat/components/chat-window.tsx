'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useMessages } from '../hooks/use-chat';
import { ChatInput } from './chat-input';
import { ChatMessage } from './chat-message';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useSendMessage } from '../hooks/use-chat';
import { useAuth } from '@/features/auth/providers/auth-provider';

interface ChatWindowProps {
  chatId: string;
  chatName?: string;
  isGroup?: boolean;
  onBack?: () => void;
}

export function ChatWindow({
  chatId,
  chatName = 'Chat',
  isGroup = false,
  onBack
}: ChatWindowProps) {
  const { data: messages, isLoading } = useMessages(chatId);
  const { pendingMessages } = useSendMessage();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Determinar si mostrar el nombre del remitente para cada mensaje
  const getShouldShowSender = (
    messages: any[],
    index: number,
    userId: string
  ) => {
    // Siempre mostrar el nombre en grupos
    if (isGroup) {
      // No mostrar si es el usuario actual
      if (messages[index].senderId === userId) {
        return false;
      }

      // Si es el primer mensaje, o el mensaje anterior no es del mismo remitente
      if (
        index === 0 ||
        messages[index - 1].senderId !== messages[index].senderId
      ) {
        return true;
      }
    }

    return false;
  };

  // Agrupar mensajes consecutivos del mismo usuario
  const processedMessages = useMemo(() => {
    if (!messages || !user?.id) return [];

    return messages.map((message, index, arr) => {
      const isFirstInGroup =
        index === 0 || arr[index - 1].senderId !== message.senderId;

      const isLastInGroup =
        index === arr.length - 1 ||
        arr[index + 1].senderId !== message.senderId;

      const showSender = getShouldShowSender(arr, index, user.id);

      const isPending = !!pendingMessages[message.id];

      const senderName = message.sender?.name || 'Usuario';

      return {
        ...message,
        isFirstInGroup,
        isLastInGroup,
        showSender,
        isPending,
        senderName
      };
    });
  }, [messages, user?.id, pendingMessages, isGroup]);

  // Desplazarse al último mensaje cuando se cargan nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages?.length]);

  // Manejar el botón de volver
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/chat');
    }
  };

  return (
    <div className='flex flex-col h-screen bg-white dark:bg-gray-900 w-full'>
      {/* Encabezado del chat */}
      <div className='border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between'>
        <div className='flex items-center'>
          <Button
            onClick={handleBack}
            variant='ghost'
            size='icon'
            className='mr-2 lg:hidden'
          >
            <ArrowLeft className='h-5 w-5' />
          </Button>

          <div className='h-10 w-10 rounded-full bg-primary text-white font-medium flex items-center justify-center'>
            {chatName.charAt(0).toUpperCase()}
          </div>

          <div className='ml-3'>
            <h2 className='font-semibold'>{chatName}</h2>
            <p className='text-xs text-gray-500'>
              {isGroup ? 'Grupo' : 'Chat privado'}
            </p>
          </div>
        </div>

        <Button variant='ghost' size='icon'>
          <MoreVertical className='h-5 w-5' />
        </Button>
      </div>

      {/* Área de mensajes */}
      <div className='flex-1 overflow-y-auto p-4 space-y-3'>
        {isLoading ? (
          <p className='text-center py-4 text-gray-500'>Cargando mensajes...</p>
        ) : processedMessages.length === 0 ? (
          <div className='h-full flex flex-col items-center justify-center text-center'>
            <div className='text-4xl mb-3'>💬</div>
            <h3 className='font-medium text-lg'>No hay mensajes</h3>
            <p className='text-gray-500 text-sm mt-1'>
              Comienza la conversación enviando un mensaje
            </p>
          </div>
        ) : (
          processedMessages.map((message: any) => (
            <ChatMessage
              key={message.id}
              message={message}
              isFirstInGroup={message.isFirstInGroup}
              isLastInGroup={message.isLastInGroup}
              showSender={message.showSender}
              isPending={message.isPending}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Área de entrada de mensaje */}
      <div className='border-t border-gray-200 dark:border-gray-800'>
        <ChatInput chatId={chatId} />
      </div>
    </div>
  );
}
