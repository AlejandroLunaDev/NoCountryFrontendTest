'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../providers/socket-provider';
import { useAuth } from '@/features/auth/providers/auth-provider';
import socket from '@/lib/socket';

// Global map of online users
const onlineUsers = new Map<string, boolean>();

export function usePresence() {
  const { status } = useSocket();
  const { user } = useAuth();
  const [onlineStatus, setOnlineStatus] = useState<Map<string, boolean>>(
    new Map(onlineUsers)
  );

  // Optimized update function that only triggers renders when there's a change
  const updateOnlineStatus = useCallback(
    (userId: string, isOnline: boolean) => {
      const currentValue = onlineUsers.get(userId);

      // Only update if the value actually changed
      if (currentValue !== isOnline) {
        onlineUsers.set(userId, isOnline);
        setOnlineStatus(new Map(onlineUsers));
      }
    },
    []
  );

  useEffect(() => {
    if (status !== 'connected' || !socket || !user?.id) return;

    // Mark current user as online
    updateOnlineStatus(user.id, true);

    // Notify that we're online
    socket.emit('update_presence', {
      userId: user.id,
      isOnline: true
    });

    // Handle presence changes
    const handlePresenceChange = (data: {
      userId: string;
      isOnline: boolean;
    }) => {
      if (data.userId && typeof data.isOnline === 'boolean') {
        updateOnlineStatus(data.userId, data.isOnline);
      }
    };

    // Handler for user_presence_status
    const handleUserPresenceStatus = (data: {
      userId: string;
      chatId: string;
      isOnline: boolean;
      lastSeen?: string;
    }) => {
      if (data.userId && typeof data.isOnline === 'boolean') {
        updateOnlineStatus(data.userId, data.isOnline);
      }
    };

    // Subscribe to presence events
    socket.on('user_presence_changed', handlePresenceChange);
    socket.on('user_presence_status', handleUserPresenceStatus);

    // Request status of all users on start
    socket.emit('get_all_online_users');

    // Cleanup on unmount
    return () => {
      socket.off('user_presence_changed', handlePresenceChange);
      socket.off('user_presence_status', handleUserPresenceStatus);

      if (socket.connected) {
        socket.emit('update_presence', {
          userId: user.id,
          isOnline: false
        });
      }
    };
  }, [status, user?.id, updateOnlineStatus]);

  // Simple function to check if a user is online
  const isUserOnline = (userId: string): boolean => {
    if (!userId) return false;
    return onlineUsers.get(userId) === true;
  };

  // Subscription function for components that need to track specific users
  const subscribeToPresence = useCallback(
    (userId: string, callback: (userId: string, isOnline: boolean) => void) => {
      // Initial callback with current status
      const currentStatus = onlineUsers.get(userId) === true;
      callback(userId, currentStatus);

      // Return a function to check updated status on demand
      return () => {
        const latestStatus = onlineUsers.get(userId) === true;
        callback(userId, latestStatus);
      };
    },
    []
  );

  return {
    onlineUsers: onlineStatus,
    isUserOnline,
    subscribeToPresence,
    updatePresence: () => {
      if (status === 'connected' && socket && user?.id) {
        socket.emit('update_presence', {
          userId: user.id,
          isOnline: true
        });
      }
    }
  };
}
