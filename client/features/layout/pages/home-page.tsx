import { redirect } from 'next/navigation';

export function HomePage() {
  redirect('/login');
  return null;
}
