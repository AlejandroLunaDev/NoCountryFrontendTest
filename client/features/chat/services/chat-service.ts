import { io, Socket } from 'socket.io-client';
import type { ChatMember as ApiChatMember } from '../lib/api';

export interface Message {
  id: string;
  chatId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface Chat {
  id: string;
  name: string;
  type: 'PRIVATE' | 'GROUP';
  members: ApiChatMember[];
  messages: Message[];
}

export class ChatService {
  private socket: Socket | null = null;
  private baseUrl: string;
  private token?: string;

  constructor(token?: string) {
    this.token = token;
    this.baseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'https://nocountrytest.onrender.com/';
  }

  connect(userId: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.baseUrl, {
          auth: {
            token,
            userId
          }
        });

        this.socket.on('connect', () => {
          resolve();
        });

        this.socket.on('connect_error', error => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onNewMessage(callback: (message: Message) => void): void {
    if (!this.socket) return;
    this.socket.on('message:new', callback);
  }

  onUserStatus(
    callback: (data: { userId: string; status: string }) => void
  ): void {
    if (!this.socket) return;
    this.socket.on('user:status', callback);
  }

  onJoinChat(callback: (chat: Chat) => void): void {
    if (!this.socket) return;
    this.socket.on('chat:join', callback);
  }

  async sendMessage(chatId: string, content: string): Promise<boolean> {
    if (!this.socket) return false;

    return new Promise(resolve => {
      this.socket?.emit(
        'message:send',
        { chatId, content },
        (success: boolean) => {
          resolve(success);
        }
      );
    });
  }

  async getChats(): Promise<Chat[]> {
    if (!this.socket) return [];

    return new Promise(resolve => {
      this.socket?.emit('chat:list', (chats: Chat[]) => {
        resolve(chats);
      });
    });
  }

  async getChatById(chatId: string): Promise<Chat | null> {
    if (!this.socket) return null;

    return new Promise(resolve => {
      this.socket?.emit('chat:get', { chatId }, (chat: Chat | null) => {
        resolve(chat);
      });
    });
  }

  async createChat(
    name: string,
    memberIds: string[],
    type: 'PRIVATE' | 'GROUP'
  ): Promise<Chat | null> {
    if (!this.socket) return null;

    return new Promise(resolve => {
      this.socket?.emit(
        'chat:create',
        { name, memberIds, type },
        (chat: Chat | null) => {
          resolve(chat);
        }
      );
    });
  }

  async addMemberToChat(chatId: string, memberId: string): Promise<boolean> {
    if (!this.socket) return false;

    return new Promise(resolve => {
      this.socket?.emit(
        'chat:addMember',
        { chatId, memberId },
        (success: boolean) => {
          resolve(success);
        }
      );
    });
  }

  offAllEvents(): void {
    if (!this.socket) return;
    this.socket.removeAllListeners();
  }
}
