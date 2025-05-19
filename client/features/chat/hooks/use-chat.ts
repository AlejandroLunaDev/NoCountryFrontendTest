'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../providers/socket-provider';
import { useAuth } from '@/features/auth/providers/auth-provider';
import socket, {
  joinChat,
  sendMessage as socketSendMessage
} from '@/lib/socket';
import { chatApi, messageApi, userApi } from '../lib/api';
import type { User, Chat, Message } from '../lib/api';
import { debounce } from 'lodash';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Hook para obtener usuarios
export function useUsers() {
  const { user } = useAuth();

  return useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
    enabled: !!user?.id
  });
}

// Hook para obtener los chats de un usuario
export function useChats() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { status } = useSocket();
  const [hasError, setHasError] = useState(false);
  const retryCountRef = useRef(0);

  const queryKey = ['chats', user?.id];

  const chatsQuery = useQuery<Chat[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        if (!user?.id) throw new Error('User ID is required to fetch chats.');

        // Si ya tuvimos errores previos, incrementamos el retraso
        if (hasError) {
          await new Promise(resolve =>
            setTimeout(
              resolve,
              Math.min(1000 * Math.pow(2, retryCountRef.current), 8000)
            )
          );
          retryCountRef.current += 1;
        }

        const result = await chatApi.getUserChats(user.id);

        // Si llegamos aquí sin error, resetear el contador
        if (hasError) {
          setHasError(false);
          retryCountRef.current = 0;
        }

        // Prefetch all chats to enable instant navigation
        if (result && Array.isArray(result)) {
          // Batch prefetching in the next tick to not block UI
          setTimeout(() => {
            result.forEach(chat => {
              // Prefetch chat details
              queryClient.prefetchQuery({
                queryKey: ['chat', chat.id],
                queryFn: () => chatApi.getChatById(chat.id),
                staleTime: 60000 // 1 minuto
              });

              // Prefetch first 20 messages
              queryClient.prefetchQuery({
                queryKey: ['messages', chat.id],
                queryFn: () => messageApi.getChatMessages(chat.id),
                staleTime: 30000 // 30 segundos
              });
            });
          }, 0);
        }

        return result;
      } catch (error) {
        setHasError(true);
        console.error('Error fetching chats:', error);

        // Devolver los datos existentes si tenemos
        const existingData = queryClient.getQueryData<Chat[]>(queryKey);
        if (existingData && existingData.length > 0) {
          return existingData;
        }

        return [];
      }
    },
    staleTime: 30000, // Aumentamos a 30 segundos para reducir refetches
    enabled: !!user?.id,
    refetchInterval: hasError ? 5000 : status === 'connected' ? false : 30000,
    refetchOnWindowFocus: false,
    retry: false,
    retryOnMount: false
  });

  // Manejar errores silenciosamente
  useEffect(() => {
    if (chatsQuery.error) {
      console.error('Error in chats query:', chatsQuery.error);
      setHasError(true);
    }
  }, [chatsQuery.error]);

  useEffect(() => {
    if (status !== 'connected' || !socket || !user?.id) return;

    const handleNewMessage = (message: Message) => {
      // Check if this message is for a chat we have in our list
      queryClient.setQueryData<Chat[]>(queryKey, (oldData = []) => {
        // If we don't have the chat in our list (it was deleted), we should invalidate the query
        // to trigger a refetch and get the chat back
        const chatExists = oldData.some(chat => chat.id === message.chatId);

        if (!chatExists) {
          console.log(
            'New message for previously deleted chat, refreshing chat list'
          );
          // Instead of trying to manually add the chat back, let's invalidate the query
          // to get a fresh chat list from the server, which will include the previously deleted chat
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
          }, 0);
          return oldData;
        }

        // Update last message for existing chats
        return oldData.map(chat =>
          chat.id === message.chatId ? { ...chat, lastMessage: message } : chat
        );
      });

      queryClient.setQueryData<Message[]>(
        ['messages', message.chatId],
        (oldData = []) => {
          if (!oldData || !Array.isArray(oldData)) return [message];
          if (oldData.some(m => m.id === message.id)) return oldData;
          return [...oldData, message];
        }
      );
    };

    // Handle chat deletion events from server
    const handleChatDeleted = (data: { chatId: string; userId: string }) => {
      console.log('Chat deleted event received:', data);
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    };

    // Handle when a new chat is created or reactivated
    const handleChatCreated = (chat: Chat) => {
      console.log('Chat created/reactivated event received:', chat);
      queryClient.setQueryData<Chat[]>(queryKey, (oldData = []) => {
        if (!oldData || !Array.isArray(oldData)) return [chat];

        // Check if we already have this chat
        const chatExists = oldData.some(c => c.id === chat.id);
        if (chatExists) return oldData;

        // Add the new chat to the beginning of the list
        return [chat, ...oldData];
      });
    };

    // Handle when a notification arrives
    const handleNotification = (notification: any) => {
      console.log('Notification received:', notification);

      // If it's a new message notification for a chat that was deleted,
      // we should invalidate the chats query to get it back
      if (notification.type === 'NEW_MESSAGE' && notification.chatId) {
        queryClient.setQueryData<Chat[]>(queryKey, (oldData = []) => {
          const chatExists = oldData.some(
            chat => chat.id === notification.chatId
          );
          if (!chatExists) {
            console.log('Notification for deleted chat, refreshing chat list');
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['chats'] });
            }, 0);
          }
          return oldData;
        });
      }
    };

    socket.on('message_received', handleNewMessage);
    socket.on('chat_deleted', handleChatDeleted);
    socket.on('chat_created', handleChatCreated);
    socket.on('notification', handleNotification);

    return () => {
      socket.off('message_received', handleNewMessage);
      socket.off('chat_deleted', handleChatDeleted);
      socket.off('chat_created', handleChatCreated);
      socket.off('notification', handleNotification);
    };
  }, [queryClient, status, user?.id]);

  // Si se restauró un chat, asegurarse de que el usuario se una a él
  useEffect(() => {
    if (
      status === 'connected' &&
      socket &&
      user?.id &&
      chatsQuery.data?.length
    ) {
      // Unirse a todos los chats existentes para asegurar que recibimos mensajes
      chatsQuery.data.forEach(chat => {
        console.log('Joining chat channel:', chat.id);
        socket.emit('join_chat', { chatId: chat.id, userId: user.id });
      });
    }
  }, [status, socket, user?.id, chatsQuery.data]);

  return chatsQuery;
}

// Agregamos un nuevo hook para manejar los tipos de usuarios
interface TypedUser extends User {
  typing?: boolean;
  lastTypingTimestamp?: number;
}

// Hook para obtener mensajes de un chat con caché optimizada
export function useMessages(chatId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { status } = useSocket();
  const [hasError, setHasError] = useState(false);
  const retryCountRef = useRef(0);
  // Set para llevar registro de mensajes procesados y evitar duplicados
  const processedMessageIds = useRef(new Set<string>());

  const queryKey = ['messages', chatId];

  // Utilizamos configuraciones más permisivas para evitar problemas con API
  const messagesQuery = useQuery<Message[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        if (!chatId) return [];

        // Check if we already have messages in cache to show immediately
        const existingMessages = queryClient.getQueryData<Message[]>(queryKey);

        // Si ya tuvimos errores previos, incrementamos el retraso
        if (hasError) {
          await new Promise(resolve =>
            setTimeout(
              resolve,
              Math.min(1000 * Math.pow(2, retryCountRef.current), 10000)
            )
          );
          retryCountRef.current += 1;
        }

        const result = await messageApi.getChatMessages(chatId);

        // Si llegamos aquí sin error, resetear el contador
        if (hasError) {
          setHasError(false);
          retryCountRef.current = 0;
        }

        return result;
      } catch (error) {
        console.error(`Error fetching messages for chat ${chatId}:`, error);
        setHasError(true);

        // Use cached data in case of error
        const existingData = queryClient.getQueryData<Message[]>(queryKey);
        if (existingData && existingData.length > 0) {
          return existingData;
        }

        return [];
      }
    },
    staleTime: 10000, // 10 segundos
    gcTime: 3600000, // Cache for 1 hour
    refetchOnMount: false, // Don't refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    retry: false,
    placeholderData: [], // Mostrar array vacío hasta tener datos
    enabled: !!chatId
  });

  useEffect(() => {
    if (status !== 'connected' || !socket || !user?.id) return;

    // Unirse al chat para recibir mensajes
    joinChat(chatId);

    const handleMessageReceived = (message: Message) => {
      if (message.chatId !== chatId) return;

      // Verificar si ya hemos procesado este mensaje (por ID)
      if (processedMessageIds.current.has(message.id)) {
        console.log('Mensaje duplicado detectado, ignorando:', message.id);
        return;
      }

      // Marcar el mensaje como procesado
      processedMessageIds.current.add(message.id);

      // Usamos setQueryData de forma segura para prevenir bucles
      queryClient.setQueryData<Message[]>(queryKey, (oldData = []) => {
        // Verificar si los datos antiguos son un array válido
        if (!Array.isArray(oldData)) {
          return [message];
        }

        // Verificamos que ya no exista este mensaje por ID
        const messageExists = oldData.some(m => m.id === message.id);

        // También verificamos por contenido y timestamp para casos de mensajes temporales
        const similarMessage =
          !messageExists &&
          oldData.some(
            m =>
              m.content === message.content &&
              m.senderId === message.senderId &&
              Math.abs(
                new Date(m.createdAt).getTime() -
                  new Date(message.createdAt).getTime()
              ) < 5000
          );

        if (messageExists || similarMessage) {
          // Si existe o hay uno similar, actualizamos en lugar de añadir
          return oldData.map(m => {
            if (
              m.id === message.id ||
              (similarMessage &&
                m.content === message.content &&
                m.senderId === message.senderId)
            ) {
              return message; // Reemplazar con la versión más reciente
            }
            return m;
          });
        }

        // Si es nuevo, lo añadimos
        return [...oldData, message];
      });

      // Marcar mensaje como leído si no es nuestro
      if (message.senderId !== user.id) {
        socket.emit('read_message', {
          messageId: message.id,
          userId: user.id,
          chatId: message.chatId
        });
      }
    };

    const handleMessageRead = (data: { messageId: string; userId: string }) => {
      queryClient.setQueryData<Message[]>(queryKey, (oldData = []) => {
        if (!oldData.length) return oldData;

        return oldData.map(msg => {
          if (msg.id === data.messageId && !msg.readBy.includes(data.userId)) {
            return {
              ...msg,
              readBy: [...msg.readBy, data.userId]
            };
          }
          return msg;
        });
      });
    };

    // Suscribirse a eventos de mensajes
    socket.on('message_received', handleMessageReceived);
    socket.on('message_read', handleMessageRead);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('message_read', handleMessageRead);
    };
  }, [chatId, queryClient, status, user?.id]);

  // Manejar errores silenciosamente
  useEffect(() => {
    if (messagesQuery.error) {
      console.error('Error in messages query:', messagesQuery.error);
      setHasError(true);
    }
  }, [messagesQuery.error]);

  return messagesQuery;
}

interface SendMessageMutationResponse {
  success?: boolean;
  id?: string;
  content?: string;
  senderId?: string;
  chatId?: string;
  createdAt?: string;
  replyToId?: string;
  sender?: { id: string; name: string };
}

// Hook para enviar mensajes
export function useSendMessage() {
  const { status } = useSocket();
  const { user } = useAuth() as {
    user: (AuthUser & { name?: string | null }) | null;
  };
  const queryClient = useQueryClient();
  const [pendingMessages, setPendingMessages] = useState<
    Record<string, { content: string; tempId: string }>
  >({});
  // Evitar múltiples actualizaciones para un solo mensaje
  const pendingOpsRef = useRef<Set<string>>(new Set());
  // Rastrear mensajes enviados para evitar duplicados
  const sentMessagesRef = useRef<Map<string, string>>(new Map()); // Key: content+timestamp, Value: tempId

  const sendMessageMutation = useMutation<
    SendMessageMutationResponse,
    Error,
    { chatId: string; content: string; tempId: string; replyToId?: string }
  >({
    mutationFn: async ({ chatId, content, tempId, replyToId }) => {
      if (!user?.id) throw new Error('User not authenticated');

      setPendingMessages(prev => ({ ...prev, [tempId]: { content, tempId } }));

      if (status !== 'connected' || !socket) {
        return messageApi.sendMessage({
          chatId,
          content,
          senderId: user.id,
          replyToId
        });
      } else {
        await socketSendMessage(content, user.id, chatId, replyToId);
        return { success: true };
      }
    },
    onSuccess: (response, { tempId, chatId }) => {
      // Evitar múltiples actualizaciones para el mismo tempId
      if (pendingOpsRef.current.has(tempId)) return;
      pendingOpsRef.current.add(tempId);

      // Limpiar este mensaje de pendientes
      setPendingMessages(prev => {
        const newState = { ...prev };
        delete newState[tempId];
        return newState;
      });

      // Si tenemos una respuesta con ID, actualizar los mensajes locales
      if (response.id) {
        queryClient.setQueryData<Message[]>(
          ['messages', chatId],
          (oldData = []) => {
            if (!Array.isArray(oldData)) return oldData;

            // Reemplazar mensaje temporal con el real, o añadir si no existe
            let updated = false;
            const updatedMessages = oldData.map(msg => {
              if (msg.id === tempId) {
                updated = true;
                return {
                  ...msg,
                  id: response.id!,
                  createdAt: response.createdAt || msg.createdAt
                };
              }
              return msg;
            });

            // Si no se encontró y reemplazó, no añadimos nada más
            // (el socket event debería manejarlo)
            return updated ? updatedMessages : oldData;
          }
        );
      }

      // Limpiar el pendingOp después de un breve delay
      setTimeout(() => {
        pendingOpsRef.current.delete(tempId);
      }, 500);
    },
    onError: (error, { tempId, chatId, content }) => {
      // Marcar el mensaje como fallido
      queryClient.setQueryData<Message[]>(
        ['messages', chatId],
        (oldData = []) => {
          if (!Array.isArray(oldData)) return oldData;
          return oldData.map(msg =>
            msg.id === tempId ? { ...msg, error: true } : msg
          );
        }
      );

      console.error('Error al enviar mensaje:', error);
    }
  });

  // Función para enviar mensajes sin duplicados
  const sendMessageRef = useRef<
    ((chatId: string, content: string, replyToId?: string) => void) | null
  >(null);
  sendMessageRef.current = (
    chatId: string,
    content: string,
    replyToId?: string
  ) => {
    if (!content.trim() || !chatId || !user?.id) return;

    const now = new Date().toISOString();
    const messageKey = `${content}-${chatId}-${user.id}-${now.substring(
      0,
      16
    )}`;

    // Verificar si un mensaje similar ya fue enviado en los últimos segundos
    if (sentMessagesRef.current.has(messageKey)) {
      console.log('Mensaje duplicado detectado, ignorando envío', content);
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Registrar este mensaje para evitar duplicados
    sentMessagesRef.current.set(messageKey, tempId);

    // Limpiar el registro después de un tiempo
    setTimeout(() => {
      sentMessagesRef.current.delete(messageKey);
    }, 10000);

    // Optimistic update
    queryClient.setQueryData<Message[]>(['messages', chatId], (old = []) => {
      if (!Array.isArray(old)) return [createTempMessage()];

      // Verificar si el mensaje ya existe por contenido
      const isDuplicate = old.some(
        m =>
          m.content === content &&
          m.senderId === user.id &&
          new Date(m.createdAt).getTime() > Date.now() - 10000
      );

      if (isDuplicate) {
        console.log('Mensaje similar ya existe, no añadiendo duplicado');
        return old;
      }

      return [...old, createTempMessage()];
    });

    sendMessageMutation.mutate({ chatId, content, tempId, replyToId });

    // Función local para crear el mensaje temporal
    function createTempMessage(): Message {
      return {
        id: tempId,
        content,
        senderId: user!.id,
        chatId,
        createdAt: now,
        replyToId,
        sender: {
          id: user!.id,
          name: user!.name || user!.email?.split('@')[0] || 'Usuario'
        },
        readBy: [user!.id]
      } as Message;
    }
  };

  const sendMessage = useCallback(
    (chatId: string, content: string, replyToId?: string) => {
      sendMessageRef.current?.(chatId, content, replyToId);
    },
    []
  );

  // Función para enviar indicador de typing con debounce para reducir tráfico
  const sendTypingDebounced = useMemo(
    () =>
      debounce((chatId: string) => {
        if (status === 'connected' && user?.id && socket) {
          socket.emit('typing', {
            chatId,
            userId: user.id,
            userName: user.name || user.email?.split('@')[0] || 'Usuario'
          });
        }
      }, 500),
    [status, user, socket]
  );

  const sendTyping = useCallback(
    (chatId: string) => {
      sendTypingDebounced(chatId);
    },
    [sendTypingDebounced]
  );

  useEffect(() => {
    // Limpia debounce al desmontar
    return () => {
      sendTypingDebounced.cancel();
    };
  }, [sendTypingDebounced]);

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
  const { status, socket } = useSocket();

  return useMutation<
    Chat,
    Error,
    { userIds: string[]; name?: string; type?: 'INDIVIDUAL' | 'GROUP' }
  >({
    mutationFn: async ({ userIds, name, type = 'INDIVIDUAL' }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const finalUserIds = [...new Set([...userIds, user.id])];

      console.log('Creating chat with:', {
        userIds: finalUserIds,
        name: name || null,
        type
      });

      // Check for existing 1-on-1 chat with the same participants
      if (type === 'INDIVIDUAL' && finalUserIds.length === 2) {
        console.log('Checking for existing 1-on-1 chat with:', finalUserIds);

        // Get cached chats
        const chats =
          queryClient.getQueryData<Chat[]>(['chats', user.id]) || [];

        // Look for existing 1-on-1 chat with exactly these two members
        const existingChat = chats.find(chat => {
          if (chat.isGroup) return false;
          if (chat.members.length !== 2) return false;

          // Check if both users are in this chat
          const memberIds = chat.members.map(m => m.userId);
          return (
            finalUserIds.every(id => memberIds.includes(id)) &&
            memberIds.every(id => finalUserIds.includes(id))
          );
        });

        if (existingChat) {
          console.log('Found existing chat:', existingChat);
          return existingChat;
        }
      }

      // No existing chat found, create a new one
      console.log('Creating new chat with members:', finalUserIds);

      return chatApi.createChat({
        name: name || null, // Explicitly set to null if undefined
        type,
        memberIds: finalUserIds
      });
    },
    onSuccess: newChat => {
      console.log('Chat created successfully:', newChat);

      // Update the query cache with the new chat
      queryClient.setQueryData<Chat[]>(['chats', user?.id], (oldData = []) => {
        // Don't add duplicate chats
        if (oldData.some(chat => chat.id === newChat.id)) {
          console.log('Chat already exists in cache, not adding duplicate');
          return oldData;
        }

        console.log('Adding new chat to cache');
        return [newChat, ...oldData];
      });

      // If we're connected to socket, emit an event to join this chat
      if (status === 'connected' && socket) {
        console.log('Joining new chat via socket:', newChat.id);
        socket.emit('join_chat', { chatId: newChat.id, userId: user.id });
      }
    },
    onError: error => {
      console.error('Error creating chat:', error);
    }
  });
}

// Hook para manejar la restauración de chats eliminados cuando llegan nuevos mensajes
export function useHandleDeletedChats() {
  const { socket, status } = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!socket || !user?.id || status !== 'connected') return;

    // When a new message is received, check if the chat exists
    const handleNewMessage = (message: Message) => {
      console.log('Checking if chat exists for message:', message);

      // Get current chats
      const currentChats =
        queryClient.getQueryData<Chat[]>(['chats', user.id]) || [];

      // If chat doesn't exist in our list, we need to fetch it
      if (!currentChats.some(chat => chat.id === message.chatId)) {
        console.log('Message for deleted chat detected, will refetch chats');

        // Explicitly tell the server to restore this chat for the current user
        socket.emit('restore_deleted_chat', message.chatId);

        // Force a refetch of chats immediately
        queryClient.invalidateQueries({ queryKey: ['chats', user.id] });

        // También actualizar la caché con el nuevo mensaje
        queryClient.setQueryData(
          ['messages', message.chatId],
          (oldData: Message[] = []) => {
            if (!oldData.some(m => m.id === message.id)) {
              return [...oldData, message];
            }
            return oldData;
          }
        );

        // Also explicitly join this chat
        socket.emit('join_chat', message.chatId);
      }
    };

    socket.on('message_received', handleNewMessage);

    // Also listen for explicit chat_restored events
    socket.on(
      'chat_restored',
      (data: {
        chatId: string;
        restoredBecause?: string;
        messageFrom?: {
          id: string;
          name: string;
        };
        messagePreview?: string;
      }) => {
        const chatId = typeof data === 'string' ? data : data.chatId;
        console.log('Chat restored event received for:', chatId, data);

        // Recargar la lista de chats
        queryClient.invalidateQueries({ queryKey: ['chats', user.id] });

        // Notificación mejorada con la información del mensaje
        if (typeof data !== 'string' && data.messageFrom) {
          toast.info(`Nuevo mensaje de ${data.messageFrom.name}`, {
            description:
              data.messagePreview ||
              'Has recibido un nuevo mensaje en un chat que habías eliminado',
            action: {
              label: 'Ver',
              onClick: () => router.push(`/chat/${chatId}`)
            }
          });
        } else {
          // Notificación genérica si no hay información del mensaje
          toast.info('Chat restaurado', {
            description: 'Un chat eliminado ha sido restaurado',
            action: {
              label: 'Ver',
              onClick: () => router.push(`/chat/${chatId}`)
            }
          });
        }
      }
    );

    return () => {
      socket.off('message_received', handleNewMessage);
      socket.off('chat_restored');
    };
  }, [socket, status, user?.id, queryClient, router]);

  return null;
}

// Temporal: definir un tipo base para AuthUser si no lo tienes importable
interface AuthUser {
  id: string;
  email?: string;
  // otras propiedades que tenga tu AuthUser
}

// Función para marcar un chat como leído
export const useMarkChatAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chatId,
      userId
    }: {
      chatId: string;
      userId: string;
    }) => {
      try {
        // Emitir evento al socket
        socket.emit('mark_chat_as_read', { chatId, userId });

        // Actualizar la caché localmente
        queryClient.setQueryData(['chats'], (oldData: any) => {
          if (!Array.isArray(oldData)) return oldData;

          return oldData.map((chat: any) => {
            if (chat.id === chatId) {
              return {
                ...chat,
                unreadCount: 0
              };
            }
            return chat;
          });
        });

        return { success: true };
      } catch (error) {
        console.error('Error al marcar chat como leído:', error);
        return { success: false, error };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    }
  });
};

// Hook para agregar un miembro a un chat grupal
export function useAddMemberToChat() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { status, socket } = useSocket();

  return useMutation<Chat, Error, { chatId: string; userId: string }>({
    mutationFn: async ({ chatId, userId }) => {
      if (!user?.id) throw new Error('User not authenticated');

      console.log(`Adding user ${userId} to chat ${chatId}`);
      return chatApi.addMemberToChat(chatId, userId);
    },
    onSuccess: (updatedChat, { chatId, userId }) => {
      console.log('Member added successfully to chat:', updatedChat);

      // Update the cache with the updated chat
      queryClient.setQueryData(['chat', updatedChat.id], updatedChat);

      // Update chat list cache
      queryClient.setQueryData<Chat[]>(['chats', user?.id], (oldData = []) => {
        return oldData.map(chat =>
          chat.id === updatedChat.id ? updatedChat : chat
        );
      });

      // Invalidate messages query to refresh member list
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });

      // If socket connected, join the updated chat and notify others about the new member
      if (status === 'connected' && socket) {
        // Join the chat
        socket.emit('join_chat', { chatId: updatedChat.id, userId: user.id });

        // Explicit notification about new member (for real-time updates)
        socket.emit('member_added', {
          chatId: updatedChat.id,
          userId: userId,
          actionBy: user.id
        });

        // También emitir evento de chat actualizado para refrescar en tiempo real
        socket.emit('chat_updated', {
          chatId: updatedChat.id,
          type: 'MEMBER_ADDED',
          memberId: userId
        });
      }

      // Show success toast
      toast.success('Miembro añadido al grupo', {
        description: 'El usuario ha sido añadido al chat grupal'
      });
    },
    onError: error => {
      console.error('Error adding member to chat:', error);
      toast.error('Error al añadir miembro', {
        description:
          'No se pudo añadir el usuario al grupo. Intenta nuevamente.'
      });
    }
  });
}
