'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { SocketProvider } from '@/features/chat/providers/socket-provider';
import { PresenceProvider } from '@/features/chat/providers/presence-provider';
import { ChatEventHandler } from '@/features/chat/components/chat-event-handler';
import { NotificationPermission } from '@/features/notifications/components/notification-permission';

interface AuthSocketWrapperProps {
  children: ReactNode;
}

export function AuthSocketWrapper({ children }: AuthSocketWrapperProps) {
  const { user } = useAuth();

  // Only render socket-related providers if user is authenticated
  if (!user) {
    return <>{children}</>;
  }

  // User is authenticated, include socket-related functionality
  return (
    <SocketProvider>
      <PresenceProvider>
        <ChatEventHandler />
        <NotificationPermission />
        {children}
      </PresenceProvider>
    </SocketProvider>
  );
}
