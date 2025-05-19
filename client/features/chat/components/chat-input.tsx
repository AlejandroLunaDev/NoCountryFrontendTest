'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Smile } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onTyping: (value: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
  typingUsers?: string[];
}

export function ChatInput({
  onSend,
  onTyping,
  isDisabled = false,
  placeholder = 'Escribe un mensaje...',
  typingUsers = []
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea y manejar scroll
  const adjustTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Resetear altura
    textarea.style.height = 'auto';

    // Calcular si hay múltiples líneas
    const lineCount = (textarea.value.match(/\n/g) || []).length + 1;
    const newHeight = Math.min(textarea.scrollHeight, 200);

    // Mostrar scroll solo cuando hay múltiples líneas
    if (lineCount > 1 || newHeight > textarea.clientHeight) {
      textarea.classList.remove('overflow-hidden');
      textarea.classList.add('overflow-y-auto');
    } else {
      textarea.classList.add('overflow-hidden');
      textarea.classList.remove('overflow-y-auto');
    }

    // Ajustar altura
    textarea.style.height = `${newHeight}px`;
  };

  // Ajustar cuando se monta y cuando cambia el mensaje
  useEffect(() => {
    if (!textareaRef.current) return;
    adjustTextarea();

    const textarea = textareaRef.current;
    textarea.addEventListener('input', adjustTextarea);
    return () => {
      textarea.removeEventListener('input', adjustTextarea);
    };
  }, [message]);

  // Handle sending a message
  const handleSend = () => {
    if (!message.trim() || isDisabled) return;

    onSend(message.trim());
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.classList.add('overflow-hidden');
      textareaRef.current.classList.remove('overflow-y-auto');
    }
  };

  // Handle form submission (Enter key)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle input change and trigger typing event
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping(e.target.value);
  };

  return (
    <div className='relative'>
      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className='absolute -top-6 left-2 right-2'>
          <p className='text-xs text-zinc-400 italic'>
            {typingUsers.length === 1
              ? `${typingUsers[0]} está escribiendo...`
              : typingUsers.length === 2
              ? `${typingUsers[0]} y ${typingUsers[1]} están escribiendo...`
              : 'Varias personas están escribiendo...'}
          </p>
        </div>
      )}

      <div className='relative'>
        <Textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          className={`min-h-10 max-h-40 py-3 pr-24 resize-none bg-zinc-800 border-zinc-700 focus-visible:ring-zinc-600 text-white placeholder:text-zinc-400 rounded-md transition overflow-hidden ${
            isDisabled ? 'opacity-70' : 'opacity-100'
          }`}
          rows={1}
        />

        <div className='absolute right-2 bottom-1.5 flex items-center gap-1.5'>
          <Button
            type='button'
            size='icon'
            variant='ghost'
            className='rounded-full h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
            disabled={isDisabled}
          >
            <Paperclip className='h-4 w-4' />
            <span className='sr-only'>Adjuntar archivo</span>
          </Button>

          <Button
            type='button'
            size='icon'
            variant='ghost'
            className='rounded-full h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
            disabled={isDisabled}
          >
            <Smile className='h-4 w-4' />
            <span className='sr-only'>Emojis</span>
          </Button>

          <Button
            onClick={handleSend}
            type='button'
            size='icon'
            disabled={!message.trim() || isDisabled}
            className='rounded-full h-8 w-8 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors'
          >
            <Send className='h-4 w-4' />
            <span className='sr-only'>Enviar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
