'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMessages } from '../hooks/use-chat.ts';
import { ChatInput } from './chat-input';
import { ChatMessage } from './chat-message';
import {
  ArrowLeft,
  Hash,
  Bell,
  Pin,
  Users,
  AtSign,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useSendMessage } from '../hooks/use-chat.ts';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { Separator } from '@/components/ui/separator';
import type { Message } from '../lib/api';

interface ChatWindowProps {
  chatId: string;
  chatName?: string;
  isGroup?: boolean;
  onBack?: () => void;
}

interface ProcessedMessage extends Message {
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showSender: boolean;
  isPending: boolean;
  senderName: string;
}

export function ChatWindow({
  chatId,
  chatName = 'Chat',
  isGroup = false,
  onBack
}: ChatWindowProps) {
  const {
    data: messages = [],
    isLoading,
    error: messagesError
  } = useMessages(chatId);
  const { sendMessage, sendTyping, pendingMessages } = useSendMessage();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isErrorVisible, setIsErrorVisible] = useState(false);
  const messageProcessedRef = useRef(new Set<string>());
  const previousMessagesRef = useRef<Message[] | null>(null);

  // Mostrar mensaje de error si hay problemas cargando mensajes
  useEffect(() => {
    if (messagesError) {
      setIsErrorVisible(true);
      // Ocultar el mensaje después de 5 segundos
      const timer = setTimeout(() => setIsErrorVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [messagesError]);

  // Sincronizamos los mensajes del servidor con nuestro estado local,
  // aplicando deduplicación - versión optimizada y con protección contra errores
  useEffect(() => {
    if (!messages) {
      // Si no hay mensajes pero no estamos cargando, establecer un array vacío
      if (!isLoading) {
        setLocalMessages([]);
      }
      return;
    }

    // Protección contra datos no válidos
    if (!Array.isArray(messages)) {
      console.error('Los mensajes recibidos no son un array', messages);
      return;
    }

    // Comparamos con los mensajes previos para evitar actualizaciones innecesarias
    if (
      previousMessagesRef.current &&
      previousMessagesRef.current.length === messages.length &&
      JSON.stringify(previousMessagesRef.current) === JSON.stringify(messages)
    ) {
      return;
    }

    previousMessagesRef.current = messages;

    try {
      // Usamos un Map para deduplicar por ID
      const messageMap = new Map<string, Message>();

      // Añadimos primero los mensajes locales para preservarlos
      localMessages.forEach(msg => {
        if (msg && msg.id && !messageMap.has(msg.id)) {
          messageMap.set(msg.id, msg);
        }
      });

      // Luego añadimos los mensajes del servidor, que sobrescribirán
      // los temporales si tienen el mismo ID
      messages.forEach(msg => {
        // Verificar que el mensaje tenga los campos esenciales
        if (msg && msg.id && msg.content && msg.senderId) {
          // Solo procesamos mensajes que aún no hemos visto
          if (!messageProcessedRef.current.has(msg.id)) {
            messageProcessedRef.current.add(msg.id);
            messageMap.set(msg.id, msg);
          }
        }
      });

      // Convertimos el Map de vuelta a un array y ordenamos por fecha
      const deduplicatedMessages = Array.from(messageMap.values())
        .filter(msg => msg.createdAt) // Asegurar que tengan fecha
        .sort((a, b) => {
          try {
            return (
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          } catch (error) {
            console.error('Error ordenando mensajes:', error);
            return 0;
          }
        });

      setLocalMessages(deduplicatedMessages);
    } catch (error) {
      console.error('Error procesando mensajes:', error);
      // En caso de error, no actualizar el estado para evitar romper la UI
    }
  }, [messages, isLoading]);

  // Determine if we should show the sender name for each message
  const getShouldShowSender = (
    messages: Message[],
    index: number,
    userId: string
  ) => {
    // Always show name in groups
    if (isGroup) {
      // Don't show if it's the current user
      if (messages[index].senderId === userId) {
        return false;
      }

      // Show if it's the first message, or the previous message is not from the same sender
      if (
        index === 0 ||
        messages[index - 1].senderId !== messages[index].senderId
      ) {
        return true;
      }
    }

    return false;
  };

  // Group consecutive messages from the same user
  const processedMessages = useMemo(() => {
    if (!localMessages || !user?.id) return [];

    try {
      // Primero, deduplicamos mensajes por ID para evitar duplicados en la UI
      const uniqueMessagesMap = new Map<string, Message>();

      localMessages.forEach(msg => {
        if (msg && msg.id) {
          // Si ya existe un mensaje con este ID, solo lo sobrescribimos si es más reciente
          if (
            !uniqueMessagesMap.has(msg.id) ||
            new Date(msg.createdAt).getTime() >
              new Date(uniqueMessagesMap.get(msg.id)!.createdAt).getTime()
          ) {
            uniqueMessagesMap.set(msg.id, msg);
          }
        }
      });

      // También buscamos duplicados por contenido y timestamp
      const uniqueMessageArray = Array.from(uniqueMessagesMap.values());
      const contentDedupedMessages: Message[] = [];
      const contentSeenMap = new Map<string, boolean>();

      uniqueMessageArray.forEach(msg => {
        // Clave para detectar mensajes similares: contenido + senderID + aproximación de timestamp
        const contentKey = `${msg.content}-${msg.senderId}-${new Date(
          msg.createdAt
        )
          .toISOString()
          .substring(0, 16)}`;

        if (!contentSeenMap.has(contentKey)) {
          contentSeenMap.set(contentKey, true);
          contentDedupedMessages.push(msg);
        }
      });

      // Ordenamos por fecha
      const sortedMessages = contentDedupedMessages.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Ahora procesamos los mensajes deduplicados
      return sortedMessages.map((message, index, arr) => {
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
        } as ProcessedMessage;
      });
    } catch (error) {
      console.error('Error procesando mensajes para UI:', error);
      return [];
    }
  }, [localMessages, user?.id, pendingMessages, isGroup]);

  // Scroll to the last message when new messages are loaded - optimizado
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [processedMessages.length]);

  // Handle back button
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/chat');
    }
  };

  // Funciones de manejo para el ChatInput - mejorada con manejo de errores
  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !chatId || !user?.id) return;

    try {
      // Eliminamos la actualización optimista local - esto lo manejará el hook useSendMessage
      // para evitar duplicaciones

      // Enviamos el mensaje usando el hook que ya maneja la actualización optimista
      await sendMessage(chatId, message);
    } catch (error) {
      // Mostrar error al usuario
      console.error('Error al enviar mensaje:', error);
      setIsErrorVisible(true);
      setTimeout(() => setIsErrorVisible(false), 5000);
    }
  };

  const handleTyping = (value: string) => {
    if (!chatId || !user?.id) return;
    sendTyping(chatId);
  };

  return (
    <div className='flex flex-col h-screen bg-zinc-900 dark:bg-zinc-800 w-full'>
      {/* Channel header */}
      <div className='h-12 border-b dark:border-zinc-700 px-4 flex items-center justify-between bg-zinc-800 shadow-sm'>
        <div className='flex items-center'>
          <Button
            onClick={handleBack}
            variant='ghost'
            size='icon'
            className='mr-2 lg:hidden text-zinc-500 dark:text-zinc-400'
          >
            <ArrowLeft className='h-5 w-5' />
          </Button>

          {isGroup ? (
            <Hash className='h-5 w-5 text-zinc-400 mr-2' />
          ) : (
            <AtSign className='h-5 w-5 text-zinc-400 mr-2' />
          )}

          <h2 className='font-semibold text-zinc-200'>{chatName}</h2>
        </div>

        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='text-zinc-400 h-8 w-8 hover:text-zinc-200 hover:bg-zinc-700'
          >
            <Bell className='h-5 w-5' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='text-zinc-400 h-8 w-8 hover:text-zinc-200 hover:bg-zinc-700'
          >
            <Pin className='h-5 w-5' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='text-zinc-400 h-8 w-8 hover:text-zinc-200 hover:bg-zinc-700'
          >
            <Users className='h-5 w-5' />
          </Button>
          <div className='mx-2'>
            <Separator orientation='vertical' className='h-6' />
          </div>
          <div className='relative'>
            <input
              type='text'
              placeholder='Buscar'
              className='h-6 bg-zinc-700 rounded-md text-xs px-2 py-1 w-40 focus:outline-none focus:ring-1 focus:ring-primary text-zinc-200'
            />
          </div>
          <Button
            variant='ghost'
            size='icon'
            className='text-zinc-400 h-8 w-8 hover:text-zinc-200 hover:bg-zinc-700'
          >
            <HelpCircle className='h-5 w-5' />
          </Button>
        </div>
      </div>

      {/* Messages area with welcome banner for empty chats */}
      <div className='flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 pb-4 bg-zinc-900'>
        {/* Error message toast */}
        {isErrorVisible && (
          <div className='fixed top-4 right-4 bg-red-500/90 text-white px-4 py-3 rounded-md shadow-lg animate-in fade-in slide-in-from-top-5 z-50'>
            <div className='flex items-center'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-5 w-5 mr-2'
                viewBox='0 0 20 20'
                fill='currentColor'
              >
                <path
                  fillRule='evenodd'
                  d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                  clipRule='evenodd'
                />
              </svg>
              <p>
                No se pudieron cargar los mensajes. Intentándolo de nuevo...
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className='flex items-center justify-center h-full'>
            <div className='animate-pulse text-zinc-400'>
              Cargando mensajes...
            </div>
          </div>
        ) : processedMessages.length === 0 ? (
          <div className='h-full flex flex-col'>
            {/* Welcome banner */}
            <div className='flex-1 flex flex-col items-center justify-center px-8 text-center'>
              <div className='w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6'>
                {isGroup ? (
                  <Hash className='h-8 w-8 text-primary' />
                ) : (
                  <AtSign className='h-8 w-8 text-primary' />
                )}
              </div>
              <h3 className='font-bold text-xl mb-3 text-zinc-200'>
                Bienvenido a {isGroup ? '#' : ''}
                {chatName}
              </h3>
              <p className='text-zinc-400 max-w-md mb-6'>
                {isGroup
                  ? `Este es el comienzo del canal #${chatName}. Envía un mensaje para iniciar la conversación.`
                  : `Este es el comienzo de tu conversación con ${chatName}. Envía un mensaje para comenzar.`}
              </p>

              <Button
                variant='outline'
                className='mt-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              >
                <Users className='h-4 w-4 mr-2' />
                Invitar usuarios
              </Button>
            </div>
          </div>
        ) : (
          <div className='pt-6 px-4 space-y-2'>
            {processedMessages.map(message => (
              <ChatMessage
                key={message.id}
                message={message}
                isFirstInGroup={message.isFirstInGroup}
                isLastInGroup={message.isLastInGroup}
                isPending={message.isPending}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input area */}
      <div className='border-t border-zinc-800 bg-zinc-900'>
        <ChatInput
          onSend={handleSendMessage}
          onTyping={handleTyping}
          isDisabled={isLoading}
          typingUsers={typingUsers}
        />
      </div>
    </div>
  );
}
