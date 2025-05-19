'use client';

import { useEffect } from 'react';
import { useSocket } from '../providers/socket-provider';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import type { Chat, Message } from '../lib/api';
import { NotificationType } from '@/features/notifications/hooks/use-notifications'; // Import enum

// Define the expected shape of the server notification for a new message
// This should align with what your backend sends in the 'notification' event
interface NewMessageServerNotification {
  id: string; // ID of the notification itself
  type: NotificationType.NEW_MESSAGE;
  chatId: string;
  messageId: string; // ID of the actual new message
  content: string; // Content for the notification (e.g., "Sender: Preview of message" or just "New message from Sender")
  senderName?: string; // Optional: name of the message sender
  // Include other relevant fields your server sends
}

export function useChatListener() {
  const { socket, status } = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pathname = usePathname();

  useEffect(() => {
    if (!socket || !user?.id) {
      console.log(
        '[ChatListener] Socket not available or user not authenticated, chat listener not active'
      );
      return;
    }

    // No bloqueamos basado en el status del socket, registramos los listeners de todas formas
    console.log(
      '[ChatListener] Registering chat event listeners for user:',
      user.id,
      'Socket status:',
      status
    );

    // Handles `message_received` event (actual message content for a chat room)
    const handleMessageReceived = (message: Message) => {
      console.log(
        `[ChatListener] 'message_received' for chat ${message.chatId}:`,
        message
      );
      const isViewingChat = pathname === `/chat/${message.chatId}`;

      queryClient.setQueryData<Chat[]>(['chats', user.id], (oldData = []) =>
        oldData.map(chat =>
          chat.id === message.chatId
            ? {
                ...chat,
                lastMessage: message, // Always update last message
                // Unread count is reset here ONLY if viewing. Incrementing is handled by 'notification' event for inactive chats.
                unreadCount: isViewingChat ? 0 : chat.unreadCount
              }
            : chat
        )
      );

      if (isViewingChat) {
        console.log(
          `[ChatListener] User is viewing chat ${message.chatId}, marking as read.`
        );
        socket.emit('mark_chat_as_read', {
          chatId: message.chatId,
          userId: user.id
        });
        queryClient.invalidateQueries({
          queryKey: ['messages', message.chatId]
        });
      }
    };

    // Handles server-pushed 'notification' event
    const handleServerNotification = async (notification: any) => {
      console.log(
        `[ChatListener] 'notification' event received:`,
        notification
      );

      if (
        notification?.type === NotificationType.NEW_MESSAGE &&
        notification.chatId
      ) {
        const serverNotification = notification as NewMessageServerNotification;
        const isViewingChat = pathname === `/chat/${serverNotification.chatId}`;

        if (!isViewingChat) {
          console.log(
            `[ChatListener] New message notification for inactive chat ${serverNotification.chatId}. Incrementing unread count.`
          );
          queryClient.setQueryData<Chat[]>(['chats', user.id], (oldData = []) =>
            oldData.map(chat =>
              chat.id === serverNotification.chatId
                ? {
                    ...chat,
                    unreadCount: (chat.unreadCount || 0) + 1
                    // Optionally, update lastMessage here if the notification payload is detailed enough
                    // and message_received might not fire for non-active members.
                    // For now, assume message_received handles lastMessage primarily.
                  }
                : chat
            )
          );

          // Show browser notification
          if (typeof Notification !== 'undefined') {
            if (Notification.permission === 'default') {
              await Notification.requestPermission();
            }
            if (Notification.permission === 'granted') {
              const notificationTitle = serverNotification.senderName
                ? `Nuevo mensaje de ${serverNotification.senderName}`
                : 'Nuevo mensaje';
              const browserNotification = new Notification(notificationTitle, {
                body: serverNotification.content, // This is the content from the server notification payload
                icon: '/favicon.ico',
                tag: serverNotification.chatId, // Tag to group notifications
                renotify: true // Re-notify for new messages in the same chat
              } as NotificationOptions & { renotify: boolean });
              browserNotification.onclick = () => {
                window.focus();
                if (
                  window.location.pathname !==
                  `/chat/${serverNotification.chatId}`
                ) {
                  window.location.href = `/chat/${serverNotification.chatId}`;
                }
              };
            }
          }
        } else {
          console.log(
            `[ChatListener] New message notification for ACTIVE chat ${serverNotification.chatId}. Marked read by message_received handler.`
          );
          // If user is viewing the chat, message_received handler already reset unreadCount.
          // Ensure message list is up to date if this notification implies a new message not yet processed by message_received
          queryClient.invalidateQueries({
            queryKey: ['messages', serverNotification.chatId]
          });
        }
      }
    };

    const handleChatRestored = (chatId: string) => {
      console.log('[ChatListener] Chat restored event received for:', chatId);
      socket.emit('join_chat', { chatId, userId: user.id });
      queryClient.invalidateQueries({ queryKey: ['chats', user.id] });
    };

    // For unread count consistency when chat becomes active
    const handleMarkChatAsReadAck = (data: {
      chatId: string;
      userId: string;
    }) => {
      if (data.userId === user?.id) {
        console.log(
          `[ChatListener] Received 'mark_chat_as_read_ack' for chat ${data.chatId}. Clearing unread count.`
        );
        queryClient.setQueryData<Chat[]>(['chats', user.id], (oldData = []) =>
          oldData.map(chat =>
            chat.id === data.chatId ? { ...chat, unreadCount: 0 } : chat
          )
        );
      }
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('notification', handleServerNotification);
    socket.on('chat_restored', handleChatRestored);
    socket.on('mark_chat_as_read_ack', handleMarkChatAsReadAck); // Listen for explicit ACK from server

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('notification', handleServerNotification);
      socket.off('chat_restored', handleChatRestored);
      socket.off('mark_chat_as_read_ack', handleMarkChatAsReadAck);
      console.log('[ChatListener] Deactivated');
    };
  }, [socket, user?.id, pathname, queryClient]);

  return null;
}
