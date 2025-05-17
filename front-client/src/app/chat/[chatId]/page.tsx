'use client';

import { useParams } from 'next/navigation';
import { ChatWindow } from '@/features/chat/components/chat-window';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ChatList } from '@/features/chat/components/chat-list';
import { Avatar } from '@/components/ui/avatar';
import { AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlusIcon, Settings } from 'lucide-react';

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if no session
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Get chat details
  const { data: chat, isLoading } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      const response = await fetch(`/api/chats/${chatId}`);
      if (!response.ok) {
        throw new Error('Error al obtener el chat');
      }
      return response.json();
    },
    enabled: !!chatId && !!user?.id
  });

  // Determine chat name
  let chatName = chat?.name || 'Chat';

  if (!chat?.name && chat?.members) {
    // If not a group, take the other user's name
    const otherMember = chat.members.find((m: any) => m.userId !== user?.id);
    if (otherMember) {
      chatName = otherMember.name;
    }
  }

  if (authLoading) {
    return (
      <div className='flex items-center justify-center h-screen bg-zinc-900'>
        <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirecting to login...
  }

  return (
    <div className='flex h-screen overflow-hidden'>
      {/* Server list sidebar */}
      <div className='w-[72px] bg-zinc-950 flex flex-col items-center py-3 gap-2 select-none'>
        {/* Home button */}
        <Button
          className='h-12 w-12 rounded-[24px] bg-zinc-700 hover:bg-primary hover:rounded-[16px] transition-all duration-200 flex items-center justify-center'
          onClick={() => router.push('/dashboard')}
        >
          <span className='text-white font-bold text-2xl'>NC</span>
        </Button>

        <div className='w-8 h-[2px] bg-zinc-800 rounded-full my-1'></div>

        {/* Server icons */}
        <Button
          className='h-12 w-12 rounded-[24px] bg-zinc-700 hover:bg-emerald-600 hover:rounded-[16px] transition-all duration-200 flex items-center justify-center'
          onClick={() => router.push('/chat')}
        >
          <span className='text-white font-bold'>Chat</span>
        </Button>

        {/* Add server button */}
        <Button className='h-12 w-12 rounded-[24px] bg-zinc-700 hover:bg-green-600 hover:rounded-[16px] transition-all duration-200 flex items-center justify-center mt-2'>
          <PlusIcon className='h-6 w-6 text-green-500 hover:text-white' />
        </Button>

        {/* Settings */}
        <Button className='h-12 w-12 rounded-[24px] bg-zinc-700 hover:bg-zinc-600 hover:rounded-[16px] transition-all duration-200 flex items-center justify-center mt-auto'>
          <Settings className='h-5 w-5 text-zinc-400 hover:text-white' />
        </Button>
      </div>

      {/* Channel list */}
      <ChatList />

      {/* Chat area */}
      <div className='flex-1'>
        <ChatWindow
          chatId={chatId}
          chatName={chatName}
          isGroup={chat?.isGroup || false}
        />
      </div>
    </div>
  );
}
