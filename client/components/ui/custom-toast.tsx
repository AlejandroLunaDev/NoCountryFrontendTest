import React from 'react';
import { toast, ToastT, Toaster } from 'sonner';
import Image from 'next/image';
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface CustomToastProps {
  message: string;
  description?: string;
  type?: ToastType;
}

// Componente personalizado que se usará dentro del toast
const ToastContent = ({
  message,
  description,
  type = 'info'
}: CustomToastProps) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className='h-6 w-6 text-emerald-500' />;
      case 'error':
        return <XCircle className='h-6 w-6 text-red-500' />;
      case 'warning':
        return <AlertCircle className='h-6 w-6 text-amber-500' />;
      case 'info':
      default:
        return <Info className='h-6 w-6 text-blue-500' />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'from-emerald-500/10 to-emerald-500/5';
      case 'error':
        return 'from-red-500/10 to-red-500/5';
      case 'warning':
        return 'from-amber-500/10 to-amber-500/5';
      case 'info':
      default:
        return 'from-blue-500/10 to-blue-500/5';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/20';
      case 'error':
        return 'border-red-500/20';
      case 'warning':
        return 'border-amber-500/20';
      case 'info':
      default:
        return 'border-blue-500/20';
    }
  };

  return (
    <div
      className={`flex p-4 rounded-lg shadow-lg bg-gradient-to-b ${getBgColor()} backdrop-blur-lg border ${getBorderColor()}`}
    >
      <div className='relative h-12 w-12 flex-shrink-0 mr-4 rounded-full flex items-center justify-center bg-zinc-800/80'>
        <Image
          src='https://cdn.prod.website-files.com/65773955177041dbf059ed20/67859e57c83aea3eecbc38c1_Logo%20Nav.svg'
          alt='No Country'
          width={30}
          height={30}
          className='rounded-full'
        />
      </div>
      <div className='flex-1'>
        <div className='flex items-center justify-between mb-1'>
          <h3 className='font-medium text-white text-lg'>{message}</h3>
          <div>{getIcon()}</div>
        </div>
        {description && <p className='text-zinc-300 text-sm'>{description}</p>}
      </div>
    </div>
  );
};

// Wrapper del componente Toaster de Sonner con estilos personalizados
export function CustomToaster() {
  return (
    <Toaster
      position='top-center'
      toastOptions={{
        style: {
          background: 'transparent',
          border: 'none',
          padding: 0,
          boxShadow: 'none',
          width: 'auto',
          maxWidth: '500px'
        },
        className: 'custom-toast'
      }}
    />
  );
}

// Funciones de ayuda para mostrar toast personalizados
export const showToast = {
  success: (message: string, description?: string) => {
    return toast.custom(() => (
      <ToastContent
        message={message}
        description={description}
        type='success'
      />
    ));
  },
  error: (message: string, description?: string) => {
    return toast.custom(() => (
      <ToastContent message={message} description={description} type='error' />
    ));
  },
  warning: (message: string, description?: string) => {
    return toast.custom(() => (
      <ToastContent
        message={message}
        description={description}
        type='warning'
      />
    ));
  },
  info: (message: string, description?: string) => {
    return toast.custom(() => (
      <ToastContent message={message} description={description} type='info' />
    ));
  }
};
