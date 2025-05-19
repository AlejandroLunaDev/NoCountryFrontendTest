// URL base del backend
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://nocountrytest.onrender.com/';

// Caché simple
const apiCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_DURATION = 5000; // 5 segundos

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
  readBy: string[];
}

export interface Chat {
  id: string;
  name: string | null;
  isGroup: boolean;
  type: 'INDIVIDUAL' | 'GROUP';
  createdAt: string;
  members: ChatMember[];
  lastMessage?: Message;
  unreadCount?: number;
}

// API para usuarios
export const userApi = {
  // Obtener todos los usuarios
  getUsers: async (): Promise<User[]> => {
    const cacheKey = 'users';

    // Verificar caché
    if (
      apiCache[cacheKey] &&
      Date.now() - apiCache[cacheKey].timestamp < CACHE_DURATION
    ) {
      return apiCache[cacheKey].data;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();

      // Guardar en caché
      apiCache[cacheKey] = {
        data: data.data || [],
        timestamp: Date.now()
      };

      return data.data || [];
    } catch (error) {
      console.error('Error al obtener usuarios:', error);

      // Usar caché vencida en caso de error
      if (apiCache[cacheKey]) {
        console.warn('Usando caché vencida como fallback');
        return apiCache[cacheKey].data;
      }

      return [];
    }
  },

  // Obtener un usuario por ID
  getUserById: async (userId: string): Promise<User> => {
    const cacheKey = `user_${userId}`;

    // Verificar caché
    if (
      apiCache[cacheKey] &&
      Date.now() - apiCache[cacheKey].timestamp < CACHE_DURATION
    ) {
      return apiCache[cacheKey].data;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();

      // Guardar en caché
      apiCache[cacheKey] = {
        data: data.data,
        timestamp: Date.now()
      };

      return data.data;
    } catch (error) {
      // Usar caché vencida en caso de error
      if (apiCache[cacheKey]) {
        return apiCache[cacheKey].data;
      }
      throw error;
    }
  }
};

// API para chats
export const chatApi = {
  // Obtener todos los chats de un usuario
  getUserChats: async (userId: string): Promise<Chat[]> => {
    const cacheKey = `chats_${userId}`;

    // Verificar caché
    if (
      apiCache[cacheKey] &&
      Date.now() - apiCache[cacheKey].timestamp < CACHE_DURATION
    ) {
      return apiCache[cacheKey].data;
    }

    // Retry with exponential backoff
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount <= maxRetries) {
      try {
        console.log(
          `Fetching chats for user ${userId}, attempt ${retryCount + 1}`
        );
        const response = await fetch(
          `${API_BASE_URL}/api/chats/users/${userId}`
        );

        if (!response.ok) {
          const errorText = await response
            .text()
            .catch(() => 'No error details');
          console.error(`Error ${response.status} fetching chats:`, errorText);

          // If it's a 500 error, and we have cached data, use it
          if (response.status === 500 && apiCache[cacheKey]) {
            console.warn('Server error, using cached data');
            return apiCache[cacheKey].data;
          }

          // If not a 500 or we have no cache, throw to trigger retry
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        // Guardar en caché
        apiCache[cacheKey] = {
          data: data.data || [],
          timestamp: Date.now()
        };

        return data.data || [];
      } catch (error) {
        console.error(`Error attempt ${retryCount + 1} fetching chats:`, error);
        retryCount++;

        // Use cached data in case of any error if available
        if (apiCache[cacheKey]) {
          console.warn('Using cached data as fallback');
          return apiCache[cacheKey].data;
        }

        // If we haven't reached max retries, wait before trying again
        if (retryCount <= maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If all retries failed and no cache, return empty array
    console.error('All retry attempts failed, returning empty array');
    return [];
  },

  // Obtener un chat por ID
  getChatById: async (chatId: string): Promise<Chat> => {
    const cacheKey = `chat_${chatId}`;

    // Verificar caché
    if (
      apiCache[cacheKey] &&
      Date.now() - apiCache[cacheKey].timestamp < CACHE_DURATION
    ) {
      return apiCache[cacheKey].data;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();

      // Guardar en caché
      apiCache[cacheKey] = {
        data: data.data,
        timestamp: Date.now()
      };

      return data.data;
    } catch (error) {
      // Usar caché vencida en caso de error
      if (apiCache[cacheKey]) {
        return apiCache[cacheKey].data;
      }
      throw error;
    }
  },

  // Crear un nuevo chat
  createChat: async (params: {
    name?: string | null;
    type: 'INDIVIDUAL' | 'GROUP';
    memberIds: string[];
  }): Promise<Chat> => {
    try {
      console.log('API createChat called with params:', JSON.stringify(params));

      // Ensure name is explicitly null if not provided
      const requestBody = {
        ...params,
        name: params.name || null
      };

      const response = await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Unknown error' }));
        console.error('Error creating chat:', errorData);
        throw new Error(
          `Error: ${response.status} - ${errorData.message || 'Unknown error'}`
        );
      }

      const data = await response.json();

      // Invalidar caché de chats
      Object.keys(apiCache).forEach(key => {
        if (key.startsWith('chats_')) {
          delete apiCache[key];
        }
      });

      return data.data;
    } catch (error) {
      console.error('Error al crear chat:', error);
      throw error;
    }
  },

  // Añadir un miembro a un chat grupal existente
  addMemberToChat: async (chatId: string, userId: string): Promise<Chat> => {
    try {
      console.log(
        `API addMemberToChat called with chatId: ${chatId}, userId: ${userId}`
      );

      const response = await fetch(
        `${API_BASE_URL}/api/chats/${chatId}/members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId })
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Unknown error' }));
        console.error('Error adding member to chat:', errorData);
        throw new Error(
          `Error: ${response.status} - ${errorData.message || 'Unknown error'}`
        );
      }

      const data = await response.json();

      // Invalidar caché del chat
      delete apiCache[`chat_${chatId}`];

      // Invalidar caché de chats del usuario
      Object.keys(apiCache).forEach(key => {
        if (key.startsWith('chats_')) {
          delete apiCache[key];
        }
      });

      return data.data;
    } catch (error) {
      console.error('Error al añadir miembro al chat:', error);
      throw error;
    }
  }
};

// API para mensajes
export const messageApi = {
  // Obtener mensajes de un chat
  getChatMessages: async (chatId: string): Promise<Message[]> => {
    if (!chatId) {
      console.error('ID de chat no válido');
      return [];
    }

    const cacheKey = `messages_${chatId}`;

    // Verificar caché (duración más corta para mensajes)
    if (
      apiCache[cacheKey] &&
      Date.now() - apiCache[cacheKey].timestamp < 3000
    ) {
      return apiCache[cacheKey].data;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/messages?chatId=${chatId}`
      );

      // Implementar reintentos para error 500
      if (response.status === 500) {
        console.warn('Error 500 al cargar mensajes, intentando nuevamente...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return messageApi.getChatMessages(chatId);
      }

      if (!response.ok) {
        console.error(`Error ${response.status} al cargar mensajes`);
        // Para error 500, devolver array vacío en lugar de lanzar error
        return [];
      }

      const data = await response.json();

      // Asegurar que cada mensaje tenga un array readBy
      const messagesWithReadBy = (data.data || []).map((msg: Message) => ({
        ...msg,
        readBy: msg.readBy || [msg.senderId]
      }));

      // Guardar en caché
      apiCache[cacheKey] = {
        data: messagesWithReadBy,
        timestamp: Date.now()
      };

      return messagesWithReadBy;
    } catch (error) {
      console.error('Error al obtener mensajes:', error);

      // Usar caché vencida en caso de error
      if (apiCache[cacheKey]) {
        console.warn('Usando caché vencida como fallback para mensajes');
        return apiCache[cacheKey].data;
      }

      return [];
    }
  },

  // Enviar un mensaje
  sendMessage: async (params: {
    chatId: string;
    content: string;
    senderId: string;
    replyToId?: string;
  }): Promise<Message> => {
    try {
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

      // Invalidar caché de mensajes para este chat
      delete apiCache[`messages_${params.chatId}`];

      return data.data;
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      throw error;
    }
  }
};
