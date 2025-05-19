'use client';

import { createContext, useContext, ReactNode } from 'react';
import { usePresence as usePresenceHook } from '../hooks/use-presence';

type PresenceCallback = (userId: string, isOnline: boolean) => void;

interface PresenceContextType {
  isUserOnline: (userId: string) => boolean;
  onlineUsers: Map<string, boolean>;
  updatePresence: () => void;
  subscribeToPresence: (
    userId: string,
    callback: PresenceCallback
  ) => () => void;
}

const PresenceContext = createContext<PresenceContextType | undefined>(
  undefined
);

export function PresenceProvider({ children }: { children: ReactNode }) {
  const presenceData = usePresenceHook();

  return (
    <PresenceContext.Provider value={presenceData}>
      {children}
    </PresenceContext.Provider>
  );
}

export const usePresence = () => {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence debe usarse dentro de un PresenceProvider');
  }
  return context;
};
