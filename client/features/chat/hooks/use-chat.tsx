'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../providers/socket-provider';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { showToast } from '@/components/ui/custom-toast';
import debounce from 'lodash/debounce';

export interface ChatMessage {
  id: string;
  content: string;
  chatId: string;
  senderId: string;
  createdAt: string;
  senderName: string;
  readBy: string[]; // Array de IDs de usuarios que han leído
}

export interface ChatMember {
  id: string;
  userId: string;
  chatId: string;
  role: 'owner' | 'admin' | 'member';
  userName: string;
}

export interface Chat {
  id: string;
  name: string;
  type: 'direct' | 'group';
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  messages: ChatMessage[];
  members: ChatMember[];
  unreadCount: number;
  typingUsers: string[]; // Nombres de usuarios escribiendo
}

export function useChat(chatId?: string) {
  const { socket, status } = useSocket();
  const { user } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const lastInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Referencia a la función debounce para typing
  const debouncedTypingRef = useRef<ReturnType<typeof debounce>>();

  // Cargar el chat cuando cambie el ID
  useEffect(() => {
    if (!socket || !chatId || !user || status !== 'connected') return;

    setIsLoading(true);
    setError(null);

    // Emitir evento para obtener detalles del chat
    socket.emit('get_chat', { chatId }, (response: any) => {
      if (response.error) {
        setError(response.error);
        setIsLoading(false);
        return;
      }

      setChat(response.data);
      setMessages(response.data.messages || []);
      setIsLoading(false);

      // Marcar chat como visto
      socket.emit('mark_chat_as_read', { chatId, userId: user.id });
    });

    // Evento para nuevos mensajes
    const handleNewMessage = (message: ChatMessage) => {
      if (message.chatId === chatId) {
        setMessages(prev => [...prev, message]);

        // Si estamos viendo el chat, marcar como leído automáticamente
        socket.emit('mark_message_as_read', {
          messageId: message.id,
          chatId: message.chatId,
          userId: user.id
        });
      }
    };

    // Evento para actualizar lecturas de mensajes
    const handleMessageRead = (data: {
      messageId: string;
      userId: string;
      chatId: string;
    }) => {
      if (data.chatId === chatId) {
        setMessages(prev =>
          prev.map(m =>
            m.id === data.messageId
              ? { ...m, readBy: [...m.readBy, data.userId] }
              : m
          )
        );
      }
    };

    // Evento para usuarios escribiendo
    const handleUserTyping = (data: {
      userId: string;
      userName: string;
      chatId: string;
      isTyping: boolean;
    }) => {
      if (data.chatId === chatId && data.userId !== user.id) {
        setTypingUsers(prev => {
          // Si está escribiendo y no está en la lista, añadirlo
          if (data.isTyping && !prev.includes(data.userName)) {
            return [...prev, data.userName];
          }
          // Si no está escribiendo y está en la lista, quitarlo
          if (!data.isTyping) {
            return prev.filter(name => name !== data.userName);
          }
          return prev;
        });
      }
    };

    // Registrar eventos
    socket.on('new_message', handleNewMessage);
    socket.on('message_read', handleMessageRead);
    socket.on('user_typing', handleUserTyping);

    // Limpiar
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_read', handleMessageRead);
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, chatId, user, status]);

  // Enviar mensaje
  const sendMessage = useCallback(
    (content: string) => {
      if (!socket || !chatId || !user || status !== 'connected') {
        setError('No es posible enviar el mensaje en este momento');
        return;
      }

      if (!content.trim()) return;

      socket.emit(
        'send_message',
        {
          chatId,
          content,
          senderId: user.id
        },
        (response: any) => {
          if (response.error) {
            showToast.error('Error al enviar mensaje', response.error);
          }
        }
      );

      // Al enviar un mensaje, ya no estamos escribiendo
      if (isTyping) {
        socket.emit('typing', {
          chatId,
          userId: user.id,
          userName: user.name || user.email,
          isTyping: false
        });
        setIsTyping(false);
      }
    },
    [socket, chatId, user, status, isTyping]
  );

  // Manejar el evento de "escribiendo..."
  useEffect(() => {
    if (!socket || !chatId || !user) return;

    // Crear o actualizar la función debounce
    debouncedTypingRef.current = debounce(() => {
      socket.emit('typing', {
        chatId,
        userId: user.id,
        userName: user.name || user.email,
        isTyping: false
      });
      setIsTyping(false);
    }, 2000);

    return () => {
      // Cancelar el debounce al desmontar
      debouncedTypingRef.current?.cancel();
    };
  }, [socket, chatId, user]);

  // Manejar input del usuario para detectar typing
  const handleInputChange = useCallback(
    (value: string) => {
      if (!socket || !chatId || !user || status !== 'connected') return;

      // Si no estamos ya marcados como typing, enviar evento
      if (!isTyping) {
        socket.emit('typing', {
          chatId,
          userId: user.id,
          userName: user.name || user.email,
          isTyping: true
        });
        setIsTyping(true);
      }

      // Reiniciar el temporizador
      if (debouncedTypingRef.current) {
        debouncedTypingRef.current();
      }
    },
    [socket, chatId, user, status, isTyping]
  );

  // Marcar mensajes como leídos
  const markAsRead = useCallback(() => {
    if (!socket || !chatId || !user || status !== 'connected') return;

    socket.emit('mark_chat_as_read', { chatId, userId: user.id });
  }, [socket, chatId, user, status]);

  return {
    chat,
    messages,
    isLoading,
    error,
    typingUsers,
    sendMessage,
    handleInputChange,
    markAsRead,
    inputRef: lastInputRef
  };
}
