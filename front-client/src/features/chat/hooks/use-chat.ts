'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../providers/socket-provider';
import { useAuth } from '@/features/auth/providers/auth-provider';
import socket, {
  joinChat,
  sendMessage as socketSendMessage
} from '@/lib/socket';
import { chatApi, messageApi, userApi } from '../lib/api';
import type { User, Chat, Message } from '../lib/api';

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

  const chatsQuery = useQuery<Chat[], Error>({
    queryKey: ['chats', user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('User ID is required to fetch chats.');
      return chatApi.getUserChats(user.id);
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (status !== 'connected' || !socket || !user?.id) return;

    const handleNewMessage = (message: Message) => {
      queryClient.setQueryData<Chat[]>(['chats', user.id], (oldData = []) =>
        oldData.map(chat =>
          chat.id === message.chatId ? { ...chat, lastMessage: message } : chat
        )
      );
      queryClient.setQueryData<Message[]>(
        ['messages', message.chatId],
        (oldData = []) => {
          if (oldData.some(m => m.id === message.id)) return oldData;
          return [...oldData, message];
        }
      );
    };

    socket.on('message_received', handleNewMessage);

    return () => {
      socket.off('message_received', handleNewMessage);
    };
  }, [queryClient, status, user?.id]);

  return chatsQuery;
}

// Hook para obtener los mensajes de un chat
export function useMessages(chatId: string) {
  const queryClient = useQueryClient();
  const { status } = useSocket();

  useEffect(() => {
    if (status === 'connected' && chatId && socket) {
      joinChat(chatId);
    }
  }, [chatId, status]);

  const messagesQuery = useQuery<Message[], Error>({
    queryKey: ['messages', chatId],
    queryFn: () => messageApi.getChatMessages(chatId),
    enabled: !!chatId
  });

  useEffect(() => {
    if (status !== 'connected' || !chatId || !socket) return;

    const handleNewMessage = (message: Message) => {
      if (message.chatId !== chatId) return;
      queryClient.setQueryData<Message[]>(
        ['messages', chatId],
        (oldData = []) => {
          if (oldData.some(m => m.id === message.id)) return oldData;
          return [...oldData, message];
        }
      );
    };

    const handleTyping = (data: { userId: string; userName: string }) => {
      console.log(`${data.userName} está escribiendo en ${chatId}...`);
      // Aquí puedes implementar la lógica para mostrar "está escribiendo..."
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
  }; // Type assertion temporal
  const queryClient = useQueryClient();

  const [pendingMessages, setPendingMessages] = useState<
    Record<string, { content: string; tempId: string }>
  >({});

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
    onSuccess: (data, variables) => {
      if (data && data.id && user) {
        const messageFromApi = data as Message;
        queryClient.setQueryData<Message[]>(
          ['messages', variables.chatId],
          (old = []) => {
            return old.map(msg =>
              msg.id === variables.tempId
                ? {
                    ...messageFromApi,
                    sender: {
                      id: user.id,
                      name: user.name || user.email?.split('@')[0] || 'Usuario'
                    }
                  }
                : msg
            );
          }
        );
        queryClient.setQueryData<Chat[]>(['chats', user?.id], (oldChats = []) =>
          oldChats.map(chat =>
            chat.id === variables.chatId
              ? { ...chat, lastMessage: messageFromApi }
              : chat
          )
        );
      }

      setPendingMessages(prev => {
        const newPendingMessages = { ...prev };
        delete newPendingMessages[variables.tempId];
        return newPendingMessages;
      });
    },
    onError: (error, variables) => {
      console.error('Error al enviar mensaje:', error);
      setPendingMessages(prev => {
        const newPendingMessages = { ...prev };
        delete newPendingMessages[variables.tempId];
        return newPendingMessages;
      });
      queryClient.setQueryData<Message[]>(
        ['messages', variables.chatId],
        (old = []) =>
          old.map(msg =>
            msg.id === variables.tempId ? { ...msg, isError: true } : msg
          )
      );
    }
  });

  const sendMessage = useCallback(
    (chatId: string, content: string, replyToId?: string) => {
      if (!content.trim() || !chatId || !user?.id) return;

      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      queryClient.setQueryData<Message[]>(['messages', chatId], (old = []) => [
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
            name: user.name || user.email?.split('@')[0] || 'Usuario'
          }
        } as Message
      ]);

      sendMessageMutation.mutate({ chatId, content, tempId, replyToId });
    },
    [queryClient, sendMessageMutation, user]
  );

  const sendTyping = useCallback(
    (chatId: string) => {
      if (status === 'connected' && user?.id && socket) {
        socket.emit('typing', {
          chatId,
          userId: user.id,
          userName: user.name || user.email?.split('@')[0] || 'Usuario'
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

  return useMutation<
    Chat,
    Error,
    { userIds: string[]; name?: string; type?: 'INDIVIDUAL' | 'GROUP' }
  >({
    mutationFn: async ({ userIds, name, type = 'INDIVIDUAL' }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const finalUserIds = [...new Set([...userIds, user.id])];
      if (type === 'INDIVIDUAL' && finalUserIds.length === 2) {
        const chats =
          queryClient.getQueryData<Chat[]>(['chats', user.id]) || [];
        const existingChat = chats.find(
          chat =>
            !chat.isGroup &&
            chat.members.length === 2 &&
            chat.members.every(member =>
              finalUserIds.includes(member.userId)
            ) &&
            finalUserIds.every(id =>
              chat.members.some(member => member.userId === id)
            )
        );
        if (existingChat) return existingChat;
      }

      return chatApi.createChat({
        name,
        type,
        memberIds: finalUserIds
      });
    },
    onSuccess: newChat => {
      queryClient.setQueryData<Chat[]>(['chats', user?.id], (oldData = []) => {
        if (oldData.some(chat => chat.id === newChat.id)) return oldData;
        return [newChat, ...oldData];
      });
    }
  });
}

// Temporal: definir un tipo base para AuthUser si no lo tienes importable
interface AuthUser {
  id: string;
  email?: string;
  // otras propiedades que tenga tu AuthUser
}
