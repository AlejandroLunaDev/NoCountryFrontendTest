'use client';

import { useChatListener } from '../hooks/user-chat-listener';

export function ChatEventHandler() {
  try {
    useChatListener();
    console.log('Chat event handler initialized');
  } catch (error) {
    console.error('Error in ChatEventHandler:', error);
  }
  return null;
}
