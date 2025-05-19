import { ChatPage } from '@/features/chat/pages/chat-page';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat | No Country',
  description: 'Sistema de chat para comunicación en simulaciones laborales.'
};

export default function Page() {
  return <ChatPage />;
}
