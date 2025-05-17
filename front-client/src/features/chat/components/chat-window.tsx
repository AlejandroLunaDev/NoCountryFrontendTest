'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useMessages } from '../hooks/use-chat';
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
import { useSendMessage } from '../hooks/use-chat';
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
  const { data: messages, isLoading } = useMessages(chatId);
  const { pendingMessages } = useSendMessage();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
    if (!messages || !user?.id) return [];

    // Sort messages by creation date, oldest first
    const sortedMessages = [...messages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

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
  }, [messages, user?.id, pendingMessages, isGroup]);

  // Scroll to the last message when new messages are loaded
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages?.length]);

  // Handle back button
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/chat');
    }
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
        <ChatInput chatId={chatId} />
      </div>
    </div>
  );
}
