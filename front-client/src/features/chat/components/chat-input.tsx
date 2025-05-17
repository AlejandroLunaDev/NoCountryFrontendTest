'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useSendMessage } from '../hooks/use-chat';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  chatId: string;
}

export function ChatInput({ chatId }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const { sendMessage, sendTyping, isPending } = useSendMessage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ajustar automáticamente la altura del textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (!message.trim() || isPending) return;

    sendMessage(chatId, message);
    setMessage('');

    // Enfocar nuevamente el textarea después de enviar
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enviar mensaje con Enter (sin Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Enviar notificación de escritura con debounce
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(chatId);
    }, 500);
  };

  return (
    <div className='p-3 relative'>
      <div className='flex items-end gap-2'>
        <div className='relative w-full'>
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder='Escribe un mensaje...'
            className='resize-none min-h-[40px] max-h-[120px] pr-10 py-2.5'
            disabled={isPending}
            rows={1}
          />

          <button
            onClick={handleSend}
            disabled={!message.trim() || isPending}
            className='absolute right-2 bottom-2 text-primary hover:text-primary/80 disabled:text-gray-300 disabled:cursor-not-allowed'
            aria-label='Enviar mensaje'
          >
            <PaperAirplaneIcon className='h-5 w-5' />
          </button>
        </div>
      </div>
    </div>
  );
}
