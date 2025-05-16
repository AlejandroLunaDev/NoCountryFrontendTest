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

interface MessageItemProps {
  message: Message;
  isCurrentUser: boolean;
}

function MessageItem({ message, isCurrentUser }: MessageItemProps) {
  if (!message.user) return null;

  const messageDate = new Date(message.createdAt);
  const formattedTime = format(messageDate, 'HH:mm');
  const formattedDate = format(messageDate, "d 'de' MMMM", { locale: es });

  return (
    <div className='flex items-start mb-4'>
      {!isCurrentUser && (
        <Avatar className='w-10 h-10 rounded-full mr-3 bg-zinc-300'>
          <div className='w-full h-full flex items-center justify-center'>
            {message.user.name.substring(0, 2).toUpperCase()}
          </div>
        </Avatar>
      )}
      <div
        className={cn('flex flex-col max-w-[70%]', isCurrentUser && 'ml-auto')}
      >
        <div className='flex items-center'>
          {!isCurrentUser && (
            <span className='font-semibold text-sm'>{message.user.name}</span>
          )}
          <span className='text-xs text-zinc-500 ml-2'>
            {formattedTime} • {formattedDate}
          </span>
        </div>
        <div
          className={cn(
            'mt-1 rounded-lg py-2 px-3 text-sm',
            isCurrentUser
              ? 'bg-primary text-white rounded-tr-none'
              : 'bg-zinc-200 dark:bg-zinc-700 rounded-tl-none'
          )}
        >
          {message.content}
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
            .map(chat => (
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
                    chat.members.some(m => m.status === 'ONLINE')
                      ? 'bg-green-500'
                      : 'bg-zinc-500'
                  )}
                />
                {chat.name}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

interface MemberSidebarProps {
  members: Chat['members'];
}

function MemberSidebar({ members }: MemberSidebarProps) {
  return (
    <div className='w-60 bg-zinc-800 border-l border-zinc-700 p-4'>
      <h3 className='text-xs font-semibold text-zinc-400 mb-2'>
        MIEMBROS - {members.length}
      </h3>
      <div className='space-y-2'>
        {members.map(member => (
          <div
            key={member.id}
            className='flex items-center text-zinc-300 hover:bg-zinc-700 rounded p-1 cursor-pointer'
          >
            <div className='w-8 h-8 rounded-full bg-zinc-300 mr-2 flex items-center justify-center'>
              {member.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className='text-sm font-semibold'>{member.name}</div>
              <div
                className={cn(
                  'text-xs',
                  member.status === 'ONLINE'
                    ? 'text-green-500'
                    : member.status === 'AWAY'
                    ? 'text-yellow-500'
                    : 'text-zinc-500'
                )}
              >
                {member.status === 'ONLINE'
                  ? 'En línea'
                  : member.status === 'AWAY'
                  ? 'Ausente'
                  : 'Desconectado'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatInterface() {
  const { chats, currentChat, selectChat, sendMessage, isLoading } = useChat();
  const { user } = useAuth();
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automático cuando llegan mensajes nuevos
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentChat?.messages]);

  const handleSelectChat = (chatId: string) => {
    selectChat(chatId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentChat) return;

    setIsSending(true);
    await sendMessage(messageInput.trim());
    setMessageInput('');
    setIsSending(false);
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

      {/* Área del chat */}
      <div className='flex-1 flex flex-col'>
        {currentChat ? (
          <>
            {/* Header del chat */}
            <div className='h-14 border-b flex items-center px-4'>
              <div className='flex items-center'>
                <span className='font-semibold text-lg'>
                  {currentChat.type === 'GROUP'
                    ? `# ${currentChat.name}`
                    : currentChat.name}
                </span>
                <span className='ml-2 text-zinc-500 text-sm'>
                  {currentChat.type === 'GROUP'
                    ? 'Canal general'
                    : 'Chat privado'}
                </span>
              </div>
            </div>

            {/* Mensajes */}
            <div className='flex-1 overflow-y-auto p-4 space-y-4'>
              {currentChat.messages.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-full text-center'>
                  <p className='text-zinc-500 mb-2'>No hay mensajes aún</p>
                  <p className='text-zinc-400 text-sm'>
                    Sé el primero en enviar un mensaje a este chat
                  </p>
                </div>
              ) : (
                currentChat.messages.map(message => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isCurrentUser={message.userId === user?.id}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensaje */}
            <form onSubmit={handleSendMessage} className='p-4 border-t'>
              <div className='bg-zinc-100 dark:bg-zinc-700 rounded-lg px-4 py-2 flex items-center'>
                <input
                  type='text'
                  placeholder={`Enviar un mensaje a ${
                    currentChat.type === 'GROUP'
                      ? `#${currentChat.name}`
                      : currentChat.name
                  }`}
                  className='bg-transparent flex-1 outline-none text-sm'
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  disabled={isSending}
                />
                <Button
                  type='submit'
                  size='icon'
                  variant='ghost'
                  className='ml-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  disabled={isSending || !messageInput.trim()}
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='20'
                    height='20'
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
          </>
        ) : (
          <div className='flex flex-col items-center justify-center h-full text-center p-4'>
            <h3 className='text-xl font-bold mb-2'>Selecciona un chat</h3>
            <p className='text-zinc-500 max-w-md'>
              Selecciona un chat de la lista a la izquierda para ver tus
              mensajes o iniciar una nueva conversación
            </p>
          </div>
        )}
      </div>

      {/* Sidebar - Miembros (solo si hay un chat seleccionado) */}
      {currentChat && <MemberSidebar members={currentChat.members} />}
    </div>
  );
}
