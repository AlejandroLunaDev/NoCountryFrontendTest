import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface User {
  id: string;
  name: string | null;
  email?: string | null; // email is optional in the user projection here
}

interface ChatMemberFromSupabase {
  id: string;
  userId: string;
  chatId: string;
  users: User[]; // Changed to User[]
}

interface MessageFromSupabase {
  id: string;
  content: string;
  senderId: string;
  chatId: string;
  createdAt: string;
  sender: User[] | null; // Changed to User[] | null, assuming sender could be an empty array or null
}

interface ChatFromSupabase {
  id: string;
  name: string | null;
  isGroup: boolean;
  createdAt: string;
  members: ChatMemberFromSupabase[];
  // lastMessage will be added in the map, so not part of initial fetch type for this var
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get userId from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 1];

    // Verificar si el usuario está autenticado
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario solicitado sea el mismo que está autenticado
    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado para ver chats de otro usuario' },
        { status: 403 }
      );
    }

    // Obtener todos los chats donde el usuario es miembro
    const { data: chatMembers, error: membersError } = await supabase
      .from('chat_members')
      .select('chatId')
      .eq('userId', userId);

    if (membersError) {
      console.error('Error al obtener miembros del chat:', membersError);
      return NextResponse.json(
        { error: 'Error al obtener chats' },
        { status: 500 }
      );
    }

    if (!chatMembers || !chatMembers.length) {
      return NextResponse.json([]);
    }

    // Extraer IDs de chats
    const chatIds = chatMembers.map(member => member.chatId);

    // Obtener detalles de los chats
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select(
        `
        id,
        name,
        isGroup,
        createdAt,
        members:chat_members(
          id,
          userId,
          chatId,
          users(id, name, email)
        )
      `
      )
      .in('id', chatIds)
      .order('createdAt', { ascending: false });

    if (chatsError) {
      console.error('Error al obtener chats:', chatsError);
      return NextResponse.json(
        { error: 'Error al obtener chats' },
        { status: 500 }
      );
    }

    // Obtener el último mensaje de cada chat
    const chatsWithLastMessage = await Promise.all(
      (chats || []).map(async (chat: ChatFromSupabase) => {
        // Consultar el último mensaje
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select(
            `
            id,
            content,
            senderId,
            chatId,
            createdAt,
            sender:users(id, name)
          `
          )
          .eq('chatId', chat.id)
          .order('createdAt', { ascending: false })
          .limit(1);

        if (messagesError) {
          console.error(
            `Error al obtener mensajes para chat ${chat.id}:`,
            messagesError
          );
          return {
            ...chat,
            lastMessage: null,
            members: chat.members.map((member: ChatMemberFromSupabase) => ({
              id: member.id,
              userId: member.userId,
              chatId: member.chatId,
              name: member.users[0]?.name || 'Usuario' // Accessing users[0]
            }))
          };
        }

        // Ensure messages[0] and messages[0].sender are correctly typed or handled if potentially undefined
        const lastMessage =
          messages && messages.length > 0 ? messages[0] : null;
        const typedLastMessage = lastMessage
          ? ({
              ...lastMessage,
              sender: lastMessage.sender as User[] | null // Explicit cast for sender
            } as MessageFromSupabase)
          : null;

        return {
          ...chat,
          lastMessage: typedLastMessage,
          members: chat.members.map((member: ChatMemberFromSupabase) => ({
            id: member.id,
            userId: member.userId,
            chatId: member.chatId,
            name: member.users[0]?.name || 'Usuario' // Accessing users[0]
          }))
        };
      })
    );

    return NextResponse.json(chatsWithLastMessage);
  } catch (error) {
    console.error('Error en la ruta de obtención de chats por usuario:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
