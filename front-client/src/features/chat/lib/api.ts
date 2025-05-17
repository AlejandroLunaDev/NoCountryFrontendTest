// URL base del backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Tipos
export interface User {
  id: string;
  name: string | null;
  email: string;
  role?: string;
  imageUrl?: string;
}

export interface ChatMember {
  id: string;
  userId: string;
  chatId: string;
  name: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  chatId: string;
  createdAt: string;
  replyToId?: string;
  sender?: {
    id: string;
    name: string;
  };
}

export interface Chat {
  id: string;
  name: string | null;
  isGroup: boolean;
  createdAt: string;
  members: ChatMember[];
  lastMessage?: Message;
}

// API para usuarios
export const userApi = {
  // Obtener todos los usuarios
  getUsers: async (): Promise<User[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      throw error;
    }
  },

  // Obtener un usuario por ID
  getUserById: async (userId: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`);
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  }
};

// API para chats
export const chatApi = {
  // Obtener todos los chats de un usuario
  getUserChats: async (userId: string): Promise<Chat[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chats/users/${userId}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error al obtener chats:', error);
      throw error;
    }
  },

  // Obtener un chat por ID
  getChatById: async (chatId: string): Promise<Chat> => {
    const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`);
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  },

  // Crear un nuevo chat
  createChat: async (params: {
    name?: string;
    type: 'INDIVIDUAL' | 'GROUP';
    memberIds: string[];
  }): Promise<Chat> => {
    const response = await fetch(`${API_BASE_URL}/api/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  }
};

// API para mensajes
export const messageApi = {
  // Obtener mensajes de un chat
  getChatMessages: async (chatId: string): Promise<Message[]> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/messages?chatId=${chatId}`
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error al obtener mensajes:', error);
      throw error;
    }
  },

  // Enviar un mensaje
  sendMessage: async (params: {
    chatId: string;
    content: string;
    senderId: string;
    replyToId?: string;
  }): Promise<Message> => {
    const response = await fetch(`${API_BASE_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  }
};
