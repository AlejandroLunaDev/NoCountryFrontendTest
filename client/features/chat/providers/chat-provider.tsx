'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from 'react';
import { Chat, ChatService, Message } from '../services/chat-service';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { toast } from 'sonner';

interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<boolean>;
  selectChat: (chatId: string) => void;
  createChat: (
    name: string,
    memberIds: string[],
    type: 'GROUP' | 'PRIVATE'
  ) => Promise<Chat | null>;
  addMemberToChat: (chatId: string, memberId: string) => Promise<boolean>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatService] = useState(() => new ChatService());
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();

  // Conectar al WebSocket cuando el usuario esté autenticado
  useEffect(() => {
    if (!user || !session) return;

    const connectToChat = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await chatService.connect(user.id, session.access_token);
        const userChats = await chatService.getChats();

        setChats(userChats);
        setIsLoading(false);
      } catch (err) {
        setError('Error al conectarse al chat');
        setIsLoading(false);
        toast.error('Error de conexión', {
          description:
            'No se pudo establecer la conexión con el servidor de chat'
        });
      }
    };

    connectToChat();

    return () => {
      chatService.disconnect();
    };
  }, [user, session, chatService]);

  // Configurar listeners para eventos de WebSocket
  useEffect(() => {
    if (!user) return;

    // Escuchar nuevos mensajes
    chatService.onNewMessage((message: Message) => {
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.id === message.chatId) {
            return {
              ...chat,
              messages: [...chat.messages, message]
            };
          }
          return chat;
        });
      });

      // Actualizar el chat actual si estamos viendo ese chat
      if (currentChat?.id === message.chatId) {
        setCurrentChat(prevChat => {
          if (!prevChat) return null;
          return {
            ...prevChat,
            messages: [...prevChat.messages, message]
          };
        });
      }
    });

    // Escuchar estados de usuario
    chatService.onUserStatus(({ userId, status }) => {
      setChats(prevChats => {
        return prevChats.map(chat => {
          return {
            ...chat,
            members: chat.members.map(member => {
              if (member.id === userId) {
                return {
                  ...member,
                  status: status as 'ONLINE' | 'OFFLINE' | 'AWAY'
                };
              }
              return member;
            })
          };
        });
      });

      // Actualizar el chat actual si estamos en un chat
      if (currentChat) {
        setCurrentChat(prevChat => {
          if (!prevChat) return null;
          return {
            ...prevChat,
            members: prevChat.members.map(member => {
              if (member.id === userId) {
                return {
                  ...member,
                  status: status as 'ONLINE' | 'OFFLINE' | 'AWAY'
                };
              }
              return member;
            })
          };
        });
      }
    });

    // Escuchar uniones a chats
    chatService.onJoinChat((chat: Chat) => {
      setChats(prevChats => {
        // Si ya existe el chat, actualizarlo
        if (prevChats.some(c => c.id === chat.id)) {
          return prevChats.map(c => (c.id === chat.id ? chat : c));
        }
        // Si no existe, añadirlo
        return [...prevChats, chat];
      });
    });

    return () => {
      chatService.offAllEvents();
    };
  }, [user, currentChat, chatService]);

  // Enviar un mensaje al chat actual
  const sendMessage = async (content: string): Promise<boolean> => {
    if (!currentChat) return false;

    try {
      const success = await chatService.sendMessage(currentChat.id, content);
      return success;
    } catch (err) {
      toast.error('Error al enviar mensaje');
      return false;
    }
  };

  // Seleccionar un chat para ver sus mensajes
  const selectChat = async (chatId: string) => {
    try {
      setIsLoading(true);
      const selectedChat = await chatService.getChatById(chatId);
      if (selectedChat) {
        setCurrentChat(selectedChat);
      }
      setIsLoading(false);
    } catch (err) {
      setError('Error al cargar el chat');
      setIsLoading(false);
    }
  };

  // Crear un nuevo chat
  const createChat = async (
    name: string,
    memberIds: string[],
    type: 'GROUP' | 'PRIVATE'
  ): Promise<Chat | null> => {
    try {
      const newChat = await chatService.createChat(name, memberIds, type);
      if (newChat) {
        setChats(prevChats => [...prevChats, newChat]);
        return newChat;
      }
      return null;
    } catch (err) {
      toast.error('Error al crear el chat');
      return null;
    }
  };

  // Añadir un miembro a un chat
  const addMemberToChat = async (
    chatId: string,
    memberId: string
  ): Promise<boolean> => {
    try {
      const success = await chatService.addMemberToChat(chatId, memberId);
      if (success) {
        // Actualizar la lista de chats
        const updatedChat = await chatService.getChatById(chatId);
        if (updatedChat) {
          setChats(prevChats =>
            prevChats.map(chat => (chat.id === chatId ? updatedChat : chat))
          );

          // Actualizar el chat actual si estamos viendo ese chat
          if (currentChat?.id === chatId) {
            setCurrentChat(updatedChat);
          }
        }
      }
      return success;
    } catch (err) {
      toast.error('Error al añadir miembro al chat');
      return false;
    }
  };

  const value = {
    chats,
    currentChat,
    isLoading,
    error,
    sendMessage,
    selectChat,
    createChat,
    addMemberToChat
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
