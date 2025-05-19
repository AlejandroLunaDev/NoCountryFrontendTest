'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '../providers/chat-provider';
import { Chat, Message } from '../services/chat-service';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useMarkChatAsRead } from '../hooks/use-chat';
import { usePresence } from '../providers/presence-provider';
import type { ChatMember } from '../lib/api';

// Define a custom message type that works with our UI
interface UIMessage {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  chatId: string;
  user: {
    name: string;
    id?: string;
    userId?: string;
  };
}

interface MessageItemProps {
  message: UIMessage;
  isCurrentUser: boolean;
  previousMessage?: UIMessage | null;
}

function MessageItem({
  message,
  isCurrentUser,
  previousMessage
}: MessageItemProps) {
  if (!message.user) return null;

  const messageDate = new Date(message.createdAt);
  const formattedTime = format(messageDate, 'HH:mm');

  // Is this a new group of messages?
  const isNewGroup =
    !previousMessage ||
    previousMessage.userId !== message.userId ||
    new Date(message.createdAt).getTime() -
      new Date(previousMessage.createdAt).getTime() >
      300000;

  return (
    <div
      className={cn(
        'hover:bg-[#2e3035]/50 py-0.5',
        isNewGroup ? 'mt-4 pt-1' : 'mt-0'
      )}
    >
      <div className='relative flex w-full'>
        {/* Avatar - show only for first message in a group */}
        {isNewGroup ? (
          <div className='flex-shrink-0 mr-4 pt-1 w-10'>
            <Avatar className='h-10 w-10 rounded-full'>
              <div className='w-full h-full flex items-center justify-center bg-zinc-700 rounded-full text-white'>
                {message.user.name.substring(0, 2).toUpperCase()}
              </div>
            </Avatar>
          </div>
        ) : (
          <div className='flex-shrink-0 mr-4 w-10'>
            {/* Empty space to align with avatar */}
          </div>
        )}

        <div className='flex-1 min-w-0'>
          {/* Show username and timestamp for first message in group */}
          {isNewGroup && (
            <div className='flex items-center mb-1'>
              <span
                className={cn(
                  'font-medium text-sm',
                  isCurrentUser ? 'text-[#7289da]' : 'text-[#e67e22]'
                )}
              >
                {message.user.name}
              </span>
              <span className='ml-2 text-xs text-[#72767d]'>
                {formattedTime}
              </span>
            </div>
          )}

          {/* Message content */}
          <div className='text-[#dcddde] break-words text-sm'>
            {message.content}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ChatListProps {
  chats: Chat[];
  onSelectChat: (chatId: string) => void;
  selectedChatId: string | null;
}

function ChatList({ chats, onSelectChat, selectedChatId }: ChatListProps) {
  const { user } = useAuth();
  const { isUserOnline } = usePresence();

  const getChatDisplayName = (chat: Chat) => {
    if (chat.type === 'GROUP') {
      return chat.name || 'Grupo';
    }

    if (chat.members && Array.isArray(chat.members)) {
      const otherMember = chat.members.find(m => m.userId !== user?.id);
      if (otherMember) {
        return otherMember.name || 'Usuario';
      }
      return 'Usuario';
    }
    return chat.name || 'Chat';
  };

  return (
    <div className='w-60 bg-zinc-800 text-white'>
      <div className='p-4 border-b border-zinc-700'>
        <h2 className='font-semibold'>Mis chats</h2>
      </div>
      <div className='p-2'>
        <div className='text-xs font-semibold text-zinc-400 px-2 py-1'>
          CANALES
        </div>
        <div className='mt-1 space-y-1'>
          {chats
            .filter(c => c.type === 'GROUP')
            .map(chat => (
              <div
                key={chat.id}
                className={cn(
                  'px-2 py-1 text-zinc-400 hover:bg-zinc-700 cursor-pointer rounded flex items-center',
                  selectedChatId === chat.id && 'bg-zinc-700 text-white'
                )}
                onClick={() => onSelectChat(chat.id)}
              >
                # {chat.name}
              </div>
            ))}
        </div>
        <div className='mt-4 text-xs font-semibold text-zinc-400 px-2 py-1'>
          CHATS PRIVADOS
        </div>
        <div className='mt-1 space-y-1'>
          {chats
            .filter(c => c.type === 'PRIVATE')
            .map(chat => {
              const hasOnlineMember =
                chat.members &&
                chat.members.some(
                  m => m.userId !== user?.id && isUserOnline(m.userId)
                );

              return (
                <div
                  key={chat.id}
                  className={cn(
                    'px-2 py-1 text-zinc-400 hover:bg-zinc-700 cursor-pointer rounded flex items-center',
                    selectedChatId === chat.id && 'bg-zinc-700 text-white'
                  )}
                  onClick={() => onSelectChat(chat.id)}
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full mr-2',
                      hasOnlineMember ? 'bg-green-500' : 'bg-zinc-500'
                    )}
                  />
                  {getChatDisplayName(chat)}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function MemberSidebar({ members }: { members: ChatMember[] }) {
  return (
    <div className='w-60 bg-zinc-800 border-l border-zinc-700 p-4'>
      <h3 className='text-xs font-semibold text-zinc-400 mb-2'>
        MIEMBROS - {members && members.length ? members.length : 0}
      </h3>
      <div className='space-y-2'>
        {members &&
          members.map(member => (
            <div
              key={member.id}
              className='flex items-center text-zinc-300 hover:bg-zinc-700 rounded p-1 cursor-pointer'
            >
              <div className='w-8 h-8 rounded-full bg-zinc-300 mr-2 flex items-center justify-center'>
                {member.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className='text-sm font-semibold'>{member.name}</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export function ChatInterface({ chatId }: { chatId: string }) {
  const { chats, currentChat, selectChat, sendMessage } = useChat();
  const { user } = useAuth();
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const markChatAsRead = useMarkChatAsRead();
  const { updatePresence } = usePresence();

  // Handle textarea height adjustment
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const lineCount = (textarea.value.match(/\n/g) || []).length + 1;
      const newHeight = Math.min(textarea.scrollHeight, 150);

      if (lineCount > 1 || newHeight > 24) {
        textarea.classList.remove('overflow-hidden');
        textarea.classList.add('overflow-y-auto');
      } else {
        textarea.classList.add('overflow-hidden');
        textarea.classList.remove('overflow-y-auto');
      }

      textarea.style.height = `${newHeight}px`;
    }
  }, [messageInput]);

  const getChatDisplayName = (chat: Chat) => {
    if (chat.type === 'GROUP') {
      return chat.name || 'Grupo';
    }

    if (chat.members && Array.isArray(chat.members)) {
      const otherMember = chat.members.find(m => m.userId !== user?.id);
      if (otherMember) {
        return otherMember.name || 'Usuario';
      }
    }
    return chat.name || 'Chat';
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentChat?.messages]);

  useEffect(() => {
    if (chatId && user?.id) {
      markChatAsRead.mutate({ chatId, userId: user.id });
    }
  }, [chatId, user?.id, currentChat?.messages, markChatAsRead]);

  const handleSelectChat = (chatId: string) => {
    selectChat(chatId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentChat) return;

    updatePresence();

    setIsSending(true);
    try {
      await sendMessage(currentChat.id, messageInput);
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Prepare messages for UI display
  const prepareMessages = (messages: Message[]): UIMessage[] => {
    return messages.map(msg => ({
      ...msg,
      user: {
        name: msg.user?.name || 'Unknown',
        id: msg.user?.id,
        userId: msg.userId
      }
    }));
  };

  return (
    <div className='flex h-screen bg-background'>
      {/* Sidebar - Servidores/Simulaciones */}
      <div className='w-[72px] bg-zinc-900 flex flex-col items-center py-4 gap-4'>
        <div className='w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold'>
          NC
        </div>
        <div className='h-[1px] w-8 bg-zinc-700' />
        <div className='w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center text-white hover:bg-primary transition-colors cursor-pointer'>
          S1
        </div>
      </div>

      {/* Lista de chats */}
      <ChatList
        chats={chats}
        onSelectChat={handleSelectChat}
        selectedChatId={currentChat?.id || null}
      />

      {/* Área principal del chat - Estilo Discord */}
      <div className='flex-1 flex flex-col bg-[#313338]'>
        {currentChat ? (
          <>
            {/* Header del chat */}
            <div className='h-12 border-b border-[#1e1f22] flex items-center px-4'>
              <div className='flex items-center'>
                <span className='font-medium text-white text-base'>
                  {currentChat.type === 'GROUP'
                    ? `# ${currentChat.name}`
                    : getChatDisplayName(currentChat)}
                </span>
                <span className='ml-2 text-[#b8b9bf] text-sm'>
                  {currentChat.type === 'GROUP'
                    ? 'Chat grupal'
                    : 'Chat privado'}
                </span>
              </div>
            </div>

            {/* Área de mensajes - Estilo Discord */}
            <div className='flex-1 overflow-y-auto bg-[#36393f] px-4'>
              {currentChat.messages.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-full text-center'>
                  <div className='h-16 w-16 rounded-full bg-[#2f3136] flex items-center justify-center mb-4'>
                    <svg
                      className='h-8 w-8 text-[#b9bbbe]'
                      xmlns='http://www.w3.org/2000/svg'
                      width='24'
                      height='24'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    >
                      <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
                    </svg>
                  </div>
                  <p className='text-white text-lg font-semibold mb-1'>
                    ¡No hay mensajes aún!
                  </p>
                  <p className='text-[#b9bbbe] text-sm'>
                    Sé el primero en enviar un mensaje a este chat
                  </p>
                </div>
              ) : (
                prepareMessages(currentChat.messages).map((message, index) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isCurrentUser={message.userId === user?.id}
                    previousMessage={
                      index > 0
                        ? prepareMessages(currentChat.messages)[index - 1]
                        : null
                    }
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensaje - Estilo Discord */}
            <div className='px-4 pb-6 pt-2'>
              <form
                onSubmit={handleSendMessage}
                className='bg-[#40444b] rounded-lg overflow-hidden'
              >
                <div className='px-4 py-3 flex items-center'>
                  <textarea
                    ref={textareaRef}
                    placeholder={`Enviar un mensaje a ${
                      currentChat.type === 'GROUP'
                        ? `#${currentChat.name}`
                        : getChatDisplayName(currentChat)
                    }`}
                    className='bg-transparent flex-1 outline-none text-[#dcddde] w-full resize-none overflow-hidden min-h-[22px] max-h-[150px] placeholder-[#72767d] text-sm'
                    value={messageInput}
                    onChange={e => {
                      setMessageInput(e.target.value);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    disabled={isSending}
                    rows={1}
                  />

                  <Button
                    type='submit'
                    size='icon'
                    variant='ghost'
                    className='ml-2 text-[#b9bbbe] hover:text-white flex-shrink-0 h-8 w-8'
                    disabled={isSending || !messageInput.trim()}
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='18'
                      height='18'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      className='lucide lucide-send'
                    >
                      <path d='m22 2-7 20-4-9-9-4Z' />
                      <path d='M22 2 11 13' />
                    </svg>
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className='flex flex-col items-center justify-center h-full text-center p-4 bg-[#313338]'>
            <svg
              className='h-16 w-16 text-[#72767d] mb-4'
              xmlns='http://www.w3.org/2000/svg'
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
            </svg>
            <h3 className='text-xl font-bold mb-2 text-white'>
              Selecciona un chat
            </h3>
            <p className='text-[#b8b9bf] max-w-md'>
              Selecciona un chat de la lista a la izquierda para ver tus
              mensajes o iniciar una nueva conversación
            </p>
          </div>
        )}
      </div>

      {/* Sidebar - Miembros */}
      {currentChat && currentChat.members && (
        <MemberSidebar members={currentChat.members} />
      )}
    </div>
  );
}
