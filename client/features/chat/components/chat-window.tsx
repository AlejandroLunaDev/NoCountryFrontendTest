'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMessages } from '../hooks/use-chat.ts';
import { ChatInput } from './chat-input';
import { ChatMessage } from './chat-message';
import { ArrowLeft, Hash, Bell, Pin, Users, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useSendMessage } from '../hooks/use-chat.ts';
import { useAuth } from '@/features/auth/providers/auth-provider';
import type { Message, ChatMember } from '../lib/api';
import { ChatMembersSidebar } from './chat-members-sidebar';
import { useSocket } from '../providers/socket-provider';
import { useQueryClient } from '@tanstack/react-query';
import socket from '@/lib/socket';

interface ChatWindowProps {
  chatId: string;
  chatName?: string;
  isGroup?: boolean;
  onBack?: () => void;
  isLoading?: boolean;
  members?: ChatMember[];
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
  onBack,
  isLoading = false,
  members = []
}: ChatWindowProps) {
  const {
    data: messages = [],
    isLoading: messagesLoading,
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
  const { socket, status } = useSocket();
  const queryClient = useQueryClient();

  // Combine loading states
  const isLoadingMessages = isLoading || messagesLoading;

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

  // Extraer miembros únicos de los mensajes y combinar con los miembros pasados como prop
  const chatMembers = useMemo(() => {
    // Usamos un Map para combinar ambas fuentes de miembros y evitar duplicados
    const membersMap = new Map<string, ChatMember>();

    // Primero agregamos los miembros que vienen como prop (si hay)
    if (members && members.length > 0) {
      members.forEach(member => {
        if (member && member.userId) {
          membersMap.set(member.userId, member);
        }
      });
    }

    // Luego agregamos cualquier miembro adicional de los mensajes (para casos donde los miembros prop estén vacíos)
    if (
      isGroup &&
      localMessages &&
      Array.isArray(localMessages) &&
      localMessages.length > 0
    ) {
      localMessages.forEach(message => {
        if (!message || !message.senderId) return;

        // Solo agregamos al usuario si no existe ya en el mapa
        if (!membersMap.has(message.senderId)) {
          membersMap.set(message.senderId, {
            id: message.senderId,
            userId: message.senderId,
            chatId: chatId,
            name: message.sender?.name || 'Usuario'
          });
        }
      });
    }

    return Array.from(membersMap.values());
  }, [isGroup, localMessages, chatId, members]);

  // Escuchar eventos de socket para actualizar los miembros del chat
  useEffect(() => {
    if (!socket || !isGroup || status !== 'connected') return;

    console.log(`Subscribing to member updates for chat: ${chatId}`);

    // Escuchar evento de miembro añadido
    const handleMemberAdded = (data: any) => {
      if (data.chatId === chatId) {
        console.log('New member added to chat, refreshing members list:', data);
        // Invalidar la caché para forzar una recarga
        queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
        // También actualizar la lista local de miembros si es necesario
        queryClient.refetchQueries({ queryKey: ['messages', chatId] });
      }
    };

    // Suscribirse a eventos
    socket.on('member_added', handleMemberAdded);
    socket.on('chat_updated', handleMemberAdded);

    // Emitir un evento para unirse específicamente a actualizaciones de este chat
    socket.emit('subscribe_chat_updates', chatId);

    return () => {
      socket.off('member_added', handleMemberAdded);
      socket.off('chat_updated', handleMemberAdded);
    };
  }, [socket, chatId, isGroup, status, queryClient]);

  return (
    <div className='flex h-full overflow-hidden'>
      <div className='flex flex-col flex-1 bg-zinc-800 overflow-hidden relative'>
        {/* Chat header */}
        <div className='h-14 min-h-[56px] border-b border-zinc-700 flex items-center px-4 gap-1.5'>
          <div className='md:hidden'>
            <Button
              size='icon'
              variant='ghost'
              onClick={handleBack}
              className='h-8 w-8'
            >
              <ArrowLeft className='h-4 w-4' />
            </Button>
          </div>
          {isGroup ? (
            <Hash className='h-5 w-5 text-zinc-500 mr-1' />
          ) : (
            <Users className='h-5 w-5 text-zinc-500 mr-1' />
          )}

          <div className='flex flex-col'>
            <h2 className='text-md font-semibold text-white'>{chatName}</h2>
            {/* Mostrar un indicador de carga sutil en vez de spinner completo */}
            {isLoadingMessages ? (
              <span className='text-xs text-zinc-400'>
                Cargando mensajes...
              </span>
            ) : (
              <span className='text-xs text-zinc-400'>
                {isGroup ? 'Chat grupal' : 'Mensaje directo'}
              </span>
            )}
          </div>

          <div className='ml-auto flex items-center gap-2'>
            <Button variant='ghost' size='icon' className='h-8 w-8'>
              <Bell className='h-4 w-4 text-zinc-500' />
            </Button>
            <Button variant='ghost' size='icon' className='h-8 w-8'>
              <Pin className='h-4 w-4 text-zinc-500' />
            </Button>
            <Button variant='ghost' size='icon' className='h-8 w-8'>
              <Users className='h-4 w-4 text-zinc-500' />
            </Button>
            <Button variant='ghost' size='icon' className='h-8 w-8'>
              <HelpCircle className='h-4 w-4 text-zinc-500' />
            </Button>
          </div>
        </div>

        {/* Chat messages area */}
        <div className='flex-1 overflow-y-auto p-4 space-y-4'>
          {isErrorVisible && (
            <div className='p-3 bg-red-500/10 border border-red-500/20 rounded-md mb-4'>
              <p className='text-sm text-red-300'>
                Error al cargar mensajes. Intenta recargar la página.
              </p>
            </div>
          )}

          {/* Mostrar mensaje cuando no hay mensajes */}
          {!isLoadingMessages && processedMessages.length === 0 && (
            <div className='flex flex-col items-center justify-center h-full'>
              <div className='rounded-full bg-zinc-700 p-3 mb-4'>
                {isGroup ? (
                  <Hash className='h-6 w-6 text-zinc-300' />
                ) : (
                  <Users className='h-6 w-6 text-zinc-300' />
                )}
              </div>
              <h3 className='text-lg font-medium text-zinc-300 mb-1'>
                {isGroup
                  ? 'Bienvenido al inicio del chat grupal'
                  : 'Bienvenido a tu nuevo chat'}
              </h3>
              <p className='text-sm text-zinc-400 text-center max-w-md'>
                {isGroup
                  ? 'Este es el comienzo del chat grupal. Sé respetuoso con los demás miembros.'
                  : 'Este es el comienzo de tu conversación. Envía un mensaje para comenzar.'}
              </p>
            </div>
          )}

          {/* Si está cargando y no hay mensajes, mostrar skeletons */}
          {isLoadingMessages && processedMessages.length === 0 && (
            <div className='space-y-4'>
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className='flex items-start gap-2 animate-pulse'>
                  <div className='h-8 w-8 rounded-full bg-zinc-700' />
                  <div className='space-y-2 flex-1'>
                    <div className='h-4 w-24 bg-zinc-700 rounded' />
                    <div className='h-10 bg-zinc-700 rounded w-3/4' />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mostrar mensajes */}
          {processedMessages.map((message, index) => (
            <ChatMessage
              key={message.id}
              id={message.id}
              content={message.content}
              sender={message.sender?.name || 'Usuario'}
              isCurrentUser={message.senderId === user?.id}
              timestamp={message.createdAt}
              showSender={message.showSender}
              isFirstInGroup={message.isFirstInGroup}
              isLastInGroup={message.isLastInGroup}
              isPending={message.isPending}
              replyTo={message.replyToId}
            />
          ))}
          <div ref={messagesEndRef} />

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className='text-xs text-zinc-400 italic'>
              {typingUsers.join(', ')}{' '}
              {typingUsers.length === 1 ? 'está' : 'están'} escribiendo...
            </div>
          )}
        </div>

        {/* Chat input */}
        <div className='p-4 border-t border-zinc-700'>
          <ChatInput
            onSend={handleSendMessage}
            onTyping={handleTyping}
            isDisabled={isLoadingMessages}
            placeholder={
              isLoadingMessages
                ? 'Cargando chat...'
                : `Mensaje a ${isGroup ? chatName : chatName.split(' ')[0]}`
            }
          />
        </div>
      </div>

      {/* Lista de miembros (solo visible en chats grupales) */}
      <ChatMembersSidebar
        members={chatMembers}
        isVisible={isGroup}
        chatId={chatId}
      />
    </div>
  );
}
