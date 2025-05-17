'use client';

import { useEffect } from 'react';
import { useSocket } from '../providers/socket-provider';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { chatApi } from '../lib/api';

export function useChatListener() {
  const { socket, status } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket || !user?.id || status !== 'connected') {
      console.log(
        'Socket not connected or user not authenticated, chat listener not active'
      );
      return;
    }

    console.log('Chat listener activated for user:', user.id);

    // When a new message is received
    const handleNewMessage = async (message: any) => {
      try {
        console.log('New message received in chat listener:', message.chatId);

        // Check if we can get this chat
        const allChats = await chatApi.getUserChats(user.id);
        const chatExists = allChats.some(chat => chat.id === message.chatId);

        if (!chatExists) {
          console.log(
            'Message for chat that may have been deleted, joining chat:',
            message.chatId
          );
          socket.emit('join_chat', message.chatId);

          // If possible, refresh the user's chat list
          try {
            await chatApi.getUserChats(user.id);
            console.log('Chat list refreshed after new message');
          } catch (error) {
            console.error('Failed to refresh chat list:', error);
          }
        }
      } catch (error) {
        console.error('Error in new message handler:', error);
      }
    };

    // Handle explicit chat restore events
    const handleChatRestored = (chatId: string) => {
      console.log('Chat restored event received for:', chatId);
      socket.emit('join_chat', chatId);
    };

    socket.on('message_received', handleNewMessage);
    socket.on('chat_restored', handleChatRestored);

    return () => {
      socket.off('message_received', handleNewMessage);
      socket.off('chat_restored', handleChatRestored);
      console.log('Chat listener deactivated');
    };
  }, [socket, status, user?.id]);

  return null;
}
