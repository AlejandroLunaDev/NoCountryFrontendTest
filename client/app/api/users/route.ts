import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();

    // Verificar si el usuario está autenticado
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener todos los usuarios excepto el actual
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, imageUrl')
      .neq('id', session.user.id)
      .order('name');

    if (error) {
      console.error('Error al obtener usuarios:', error);
      return NextResponse.json(
        { error: 'Error al obtener usuarios' },
        { status: 500 }
      );
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error en la ruta de usuarios:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
