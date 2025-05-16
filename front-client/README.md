# No Country - Frontend Client

Este proyecto es un cliente frontend para la plataforma No Country, desarrollado con Next.js, TypeScript, Tailwind CSS y shadcn/ui.

## Características

- Autenticación con Supabase
- Interfaz de chat inspirada en Discord con WebSockets
- Arquitectura feature-first
- Diseño responsive y accesible
- Tema claro/oscuro

## Tecnologías

- **Next.js 15**: Framework de React para renderizado del lado del servidor y generación estática.
- **TypeScript**: Para un desarrollo seguro y con tipado fuerte.
- **Tailwind CSS**: Utility-first CSS framework para diseño rápido y consistente.
- **shadcn/ui**: Componentes de UI reutilizables y accesibles.
- **Supabase**: Para autenticación y base de datos.
- **Socket.io-client**: Para comunicación en tiempo real.

## Estructura del proyecto

```
src/
  ├── app/                  # Rutas y páginas de la aplicación
  │   ├── login/            # Página de inicio de sesión
  │   ├── register/         # Página de registro
  │   ├── dashboard/        # Dashboard de usuario
  │   └── chat/             # Interfaz de chat
  │
  ├── components/           # Componentes compartidos
  │   └── ui/               # Componentes de UI de shadcn
  │
  ├── features/             # Carpetas organizadas por funcionalidad
  │   ├── auth/             # Características de autenticación
  │   │   ├── components/   # Componentes relacionados con auth
  │   │   └── providers/    # Proveedores de contexto para auth
  │   │
  │   ├── chat/             # Características de chat
  │   │   ├── components/   # Componentes relacionados con chat
  │   │   └── hooks/        # Hooks personalizados para chat
  │   │
  │   └── layout/           # Componentes de layout y proveedores
  │       └── providers/    # Proveedores de contexto para layout
  │
  └── lib/                  # Utilidades y configuraciones
      ├── utils.ts          # Funciones de utilidad genéricas
      └── supabase.ts       # Cliente de Supabase
```

## Principios de diseño

Este proyecto sigue:

- **Arquitectura feature-first**: Organización por funcionalidad en lugar de por tipo de archivo.
- **Principios SOLID**: Especialmente SRP (Single Responsibility Principle) y OCP (Open-Closed Principle).
- **Clean Code**: Nombres descriptivos, funciones pequeñas, y código autoexplicativo.

## Cómo ejecutar localmente

1. Clona el repositorio
2. Instala las dependencias con `npm install`
3. Copia el archivo `.env.local.example` a `.env.local` y completa las variables de entorno
4. Ejecuta el servidor de desarrollo con `npm run dev`
5. Abre [http://localhost:3001](http://localhost:3001) en tu navegador

## Variables de entorno

- `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto de Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima de tu proyecto de Supabase
- `NEXT_PUBLIC_API_URL`: URL del backend (por defecto: http://localhost:3000)

## Getting Started

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
