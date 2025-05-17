'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useSendMessage } from '../hooks/use-chat';
import { Textarea } from '@/components/ui/textarea';
import {
  SmileIcon,
  PaperclipIcon,
  SendIcon,
  PlusCircleIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  chatId: string;
}

export function ChatInput({ chatId }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const { sendMessage, sendTyping, isPending } = useSendMessage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-adjust textarea height
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

    // Re-focus textarea after sending
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message with Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Send typing notification with debounce
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(chatId);
    }, 500);
  };

  const handleEmojiClick = () => {
    // Placeholder for emoji picker
    alert('Emoji picker will be implemented soon');
  };

  const handleAttachmentClick = () => {
    // Placeholder for file attachment
    alert('File attachment will be implemented soon');
  };

  return (
    <div className='px-4 py-3'>
      <div className='relative bg-zinc-800 rounded-lg overflow-hidden'>
        {/* Button row above textarea */}
        <div className='flex items-center px-4 pt-3'>
          <Button
            variant='ghost'
            size='icon'
            className='rounded-full h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
          >
            <PlusCircleIcon className='h-5 w-5' />
          </Button>
        </div>

        {/* Main input area */}
        <div className='flex items-end px-4 pb-2'>
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder='Enviar un mensaje...'
            className='resize-none min-h-[22px] max-h-[120px] border-0 bg-transparent p-0 py-1 text-zinc-200 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:ring-offset-0'
            disabled={isPending}
            rows={1}
          />
        </div>

        {/* Button row below textarea */}
        <div className='flex items-center justify-between px-4 py-2 border-t border-zinc-700'>
          <div className='flex gap-2'>
            <Button
              variant='ghost'
              size='icon'
              className='rounded-full h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              onClick={handleAttachmentClick}
            >
              <PaperclipIcon className='h-5 w-5' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='rounded-full h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              onClick={handleEmojiClick}
            >
              <SmileIcon className='h-5 w-5' />
            </Button>
          </div>

          <Button
            onClick={handleSend}
            disabled={!message.trim() || isPending}
            variant='ghost'
            size='icon'
            className='rounded-full h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <SendIcon className='h-5 w-5' />
          </Button>
        </div>
      </div>
    </div>
  );
}
