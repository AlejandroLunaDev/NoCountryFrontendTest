import Link from 'next/link';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { NotificationCenter } from '@/features/notifications/components/notification-center';

export function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className='flex min-h-screen flex-col'>
        <header className='border-b bg-background sticky top-0 z-10'>
          <div className='container flex h-16 items-center justify-between py-4'>
            <div className='font-bold text-xl'>No Country</div>
            <div className='flex items-center gap-4'>
              <nav className='flex items-center gap-4 mr-4'>
                <Link
                  href='/dashboard'
                  className='text-sm text-muted-foreground'
                >
                  Simulaciones
                </Link>
                <Link href='/chat' className='text-sm'>
                  Chats
                </Link>
              </nav>
              <NotificationCenter />
            </div>
          </div>
        </header>
        <div className='container flex-1 py-6'>
          <h1 className='text-3xl font-bold mb-6'>Bienvenido a No Country</h1>
          <p className='text-muted-foreground mb-4'>
            Aquí podrás ver todas tus simulaciones laborales activas y
            participar en ellas.
          </p>

          <div className='mt-8 grid gap-4'>
            <div className='rounded-lg border bg-card text-card-foreground shadow p-6'>
              <h2 className='text-xl font-semibold mb-2'>
                Chat en vivo disponible
              </h2>
              <p className='text-sm text-muted-foreground mb-4'>
                Hemos implementado la funcionalidad de chat para que puedas
                comunicarte con tu equipo durante las simulaciones laborales.
              </p>
              <Link
                href='/chat'
                className='inline-flex h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md items-center justify-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'
              >
                Ir al chat
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
