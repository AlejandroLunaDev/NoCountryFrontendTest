import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Verificar si el usuario está autenticado
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener datos de la petición
    const body = await request.json();
    const { name, type = 'INDIVIDUAL', memberIds = [] } = body;

    // Asegurarse de que el usuario actual esté incluido en memberIds
    if (!memberIds.includes(session.user.id)) {
      memberIds.push(session.user.id);
    }

    // Validar que hay al menos dos miembros
    if (memberIds.length < 2) {
      return NextResponse.json(
        { error: 'Un chat debe tener al menos dos miembros' },
        { status: 400 }
      );
    }

    // Crear el chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert([
        {
          name: name || null,
          isGroup: type === 'GROUP'
        }
      ])
      .select()
      .single();

    if (chatError) {
      console.error('Error al crear chat:', chatError);
      return NextResponse.json(
        { error: 'Error al crear el chat' },
        { status: 500 }
      );
    }

    // Crear los miembros del chat
    const chatMembers = memberIds.map(userId => ({
      chatId: chat.id,
      userId
    }));

    const { error: membersError } = await supabase
      .from('chat_members')
      .insert(chatMembers);

    if (membersError) {
      console.error('Error al crear miembros del chat:', membersError);
      // Intentar eliminar el chat creado para no dejar basura
      await supabase.from('chats').delete().eq('id', chat.id);

      return NextResponse.json(
        { error: 'Error al agregar miembros al chat' },
        { status: 500 }
      );
    }

    // Obtener los detalles completos del chat con miembros
    const { data: fullChat, error: fullChatError } = await supabase
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
      .eq('id', chat.id)
      .single();

    if (fullChatError) {
      console.error('Error al obtener chat completo:', fullChatError);
      return NextResponse.json(
        { error: 'Error al obtener detalles del chat' },
        { status: 500 }
      );
    }

    // Formatear la respuesta
    const formattedChat = {
      ...fullChat,
      members: fullChat.members.map((member: any) => ({
        id: member.id,
        userId: member.userId,
        chatId: member.chatId,
        name: member.users?.name || 'Usuario',
        email: member.users?.email
      }))
    };

    return NextResponse.json(formattedChat);
  } catch (error) {
    console.error('Error en la ruta de creación de chats:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
