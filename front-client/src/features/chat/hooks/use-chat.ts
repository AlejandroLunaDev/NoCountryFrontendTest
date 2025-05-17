'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../providers/socket-provider';
import { useAuth } from '@/features/auth/providers/auth-provider';
import socket, {
  joinChat,
  sendMessage as socketSendMessage
} from '@/lib/socket';
import { chatApi, messageApi, userApi, User, Chat, Message } from '../lib/api';

// Tipos de datos
interface Message {
  id: string;
  content: string;
  senderId: string;
  chatId: string;
  createdAt: string;
  replyToId?: string;
  sender?: {
    id: string;
    name: string;
  };
}

interface ChatMember {
  id: string;
  userId: string;
  chatId: string;
  name: string;
}

interface Chat {
  id: string;
  name: string | null;
  isGroup: boolean;
  createdAt: string;
  members: ChatMember[];
  lastMessage?: Message;
}

interface User {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
}

// URL base del backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Hook para obtener usuarios
export function useUsers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      return userApi.getUsers();
    },
    enabled: !!user?.id
  });
}

// Hook para obtener los chats de un usuario
export function useChats() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { status } = useSocket();

  // Obtener chats del usuario
  const chatsQuery = useQuery({
    queryKey: ['chats', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID provided');
      return chatApi.getUserChats(user.id);
    },
    enabled: !!user?.id
  });

  // Escuchar actualizaciones en tiempo real
  useEffect(() => {
    if (status !== 'connected') return;

    // Escuchar nuevo mensaje (actualiza la lista de chats)
    const handleNewMessage = (message: Message) => {
      // Actualizar el último mensaje del chat
      queryClient.setQueryData<Chat[]>(['chats', user?.id], (old = []) => {
        return old.map(chat => {
          if (chat.id === message.chatId) {
            return {
              ...chat,
              lastMessage: message
            };
          }
          return chat;
        });
      });

      // Actualizar la lista de mensajes si el chat está abierto
      queryClient.setQueryData<Message[]>(
        ['messages', message.chatId],
        (old = []) => {
          // Evitar duplicados
          if (old.some(m => m.id === message.id)) return old;
          return [...old, message];
        }
      );
    };

    // Registrar el manejador de eventos
    socket.on('message_received', handleNewMessage);

    return () => {
      socket.off('message_received', handleNewMessage);
    };
  }, [queryClient, socket, status, user?.id]);

  return chatsQuery;
}

// Hook para obtener los mensajes de un chat
export function useMessages(chatId: string) {
  const queryClient = useQueryClient();
  const { status } = useSocket();

  // Unirse al chat cuando se carga
  useEffect(() => {
    if (status === 'connected' && chatId) {
      joinChat(chatId);
    }
  }, [chatId, status]);

  // Obtener mensajes del chat
  const messagesQuery = useQuery({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      return messageApi.getChatMessages(chatId);
    },
    enabled: !!chatId
  });

  // Escuchar nuevos mensajes
  useEffect(() => {
    if (status !== 'connected' || !chatId) return;

    // Escuchar nuevo mensaje para este chat
    const handleNewMessage = (message: Message) => {
      if (message.chatId !== chatId) return;

      queryClient.setQueryData<Message[]>(['messages', chatId], (old = []) => {
        // Evitar duplicados
        if (old.some(m => m.id === message.id)) return old;
        return [...old, message];
      });
    };

    // Manejar notificaciones de escritura
    const handleTyping = (data: { userId: string; userName: string }) => {
      // Aquí puedes implementar la lógica para mostrar "está escribiendo..."
      console.log(`${data.userName} está escribiendo...`);
    };

    socket.on('message_received', handleNewMessage);
    socket.on('user_typing', handleTyping);

    return () => {
      socket.off('message_received', handleNewMessage);
      socket.off('user_typing', handleTyping);
    };
  }, [chatId, queryClient, status]);

  return messagesQuery;
}

// Hook para enviar mensajes
export function useSendMessage() {
  const { status } = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Estado para manejar los mensajes pendientes
  const [pendingMessages, setPendingMessages] = useState<
    Record<string, { content: string; tempId: string }>
  >({});

  // Mutación para enviar mensajes
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      chatId,
      content,
      tempId,
      replyToId
    }: {
      chatId: string;
      content: string;
      tempId: string;
      replyToId?: string;
    }) => {
      // Guardar mensaje pendiente
      setPendingMessages(prev => ({
        ...prev,
        [tempId]: { content, tempId }
      }));

      // Si el socket no está conectado, enviar por API REST
      if (status !== 'connected' || !user?.id) {
        return messageApi.sendMessage({
          chatId,
          content,
          senderId: user?.id || '',
          replyToId
        });
      }

      // Si el socket está conectado, enviar por WebSocket
      try {
        await socketSendMessage(content, user.id, chatId, replyToId);
        // Devolvemos un objeto vacío porque el mensaje real llegará a través del socket
        return { success: true };
      } catch (error) {
        throw error;
      }
    },
    onError: (error, variables) => {
      console.error('Error al enviar mensaje:', error);

      // Eliminar mensaje pendiente
      setPendingMessages(prev => {
        const { [variables.tempId]: _, ...rest } = prev;
        return rest;
      });
    }
  });

  // Función para enviar un mensaje
  const sendMessage = useCallback(
    (chatId: string, content: string, replyToId?: string) => {
      if (!content.trim() || !chatId || !user) return;

      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Optimistic update - añadir mensaje temporal
      queryClient.setQueryData<Message[]>(['messages', chatId], (old = []) => {
        return [
          ...old,
          {
            id: tempId,
            content,
            senderId: user.id,
            chatId,
            createdAt: new Date().toISOString(),
            replyToId,
            sender: {
              id: user.id,
              name: user.email?.split('@')[0] || 'Usuario'
            }
          }
        ];
      });

      // Enviar mensaje
      sendMessageMutation.mutate({ chatId, content, tempId, replyToId });
    },
    [queryClient, sendMessageMutation, user]
  );

  // Enviar notificación de escritura
  const sendTyping = useCallback(
    (chatId: string) => {
      if (status === 'connected' && user?.id) {
        socket.emit('typing', {
          chatId,
          userId: user.id,
          userName: user.email?.split('@')[0] || 'Usuario'
        });
      }
    },
    [status, user]
  );

  return {
    sendMessage,
    sendTyping,
    isPending: sendMessageMutation.isPending,
    pendingMessages
  };
}

// Hook para crear un nuevo chat
export function useCreateChat() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userIds,
      name,
      type = 'INDIVIDUAL'
    }: {
      userIds: string[];
      name?: string;
      type?: 'INDIVIDUAL' | 'GROUP';
    }) => {
      // Verificar si ya existe un chat individual entre los mismos usuarios
      if (type === 'INDIVIDUAL' && userIds.length === 1) {
        // Agregar el usuario actual si no está incluido
        if (!userIds.includes(user?.id || '') && user?.id) {
          userIds.push(user.id);
        }

        // Consultar chats existentes
        const chats = await queryClient.fetchQuery({
          queryKey: ['chats', user?.id],
          queryFn: async () => {
            if (!user?.id) throw new Error('No user ID provided');
            return chatApi.getUserChats(user.id);
          }
        });

        // Buscar si ya existe un chat individual con el mismo usuario
        const existingChat = chats.find(chat => {
          if (chat.isGroup) return false;

          // Verificar si todos los miembros del chat están en userIds
          const chatMemberIds = chat.members.map(m => m.userId);
          return (
            chatMemberIds.length === userIds.length &&
            chatMemberIds.every(id => userIds.includes(id)) &&
            userIds.every(id => chatMemberIds.includes(id))
          );
        });

        if (existingChat) {
          return existingChat;
        }
      }

      // Crear un nuevo chat
      return chatApi.createChat({
        name,
        type,
        memberIds: userIds
      });
    },
    onSuccess: data => {
      // Actualizar caché de chats
      queryClient.setQueryData<Chat[]>(['chats', user?.id], (old = []) => {
        if (old.some(chat => chat.id === data.id)) return old;
        return [...old, data];
      });
    }
  });
}
