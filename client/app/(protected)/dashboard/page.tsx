import { Metadata } from 'next';
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page';

export const metadata: Metadata = {
  title: 'Dashboard | No Country',
  description: 'Panel de control de la plataforma No Country.'
};

export default function Page() {
  return <DashboardPage />;
}
