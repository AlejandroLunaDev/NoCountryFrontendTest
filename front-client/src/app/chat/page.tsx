import { Metadata } from 'next';
import { ChatProvider } from '@/features/chat/providers/chat-provider';
import { ChatInterface } from '@/features/chat/components/chat-interface';
import { ProtectedRoute } from '@/features/auth/components/protected-route';

export const metadata: Metadata = {
  title: 'Chat | No Country',
  description: 'Sistema de chat para comunicación en simulaciones laborales.'
};

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatProvider>
        <ChatInterface />
      </ChatProvider>
    </ProtectedRoute>
  );
}
