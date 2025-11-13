# Guía de Migración: Firestore a MongoDB

Este documento describe los cambios realizados para migrar el proyecto de Firestore a MongoDB.

## Cambios Principales

### 1. Modelos de Datos (Mongoose Schemas)
- **Ubicación**: `src/lib/mongodb/models/`
- **Modelos creados**:
  - `User.ts` - Perfiles de usuario
  - `Event.ts` - Eventos de la agenda
  - `Speaker.ts` - Perfiles de ponentes
  - `Question.ts` - Preguntas de usuarios

### 2. Conexión a MongoDB
- **Archivo**: `src/lib/mongodb/connect.ts`
- Maneja la conexión a MongoDB con cache para desarrollo
- Requiere variable de entorno `MONGODB_URI`

### 3. API Routes
Todas las operaciones de base de datos ahora se realizan a través de API routes:

- `/api/users` - CRUD de usuarios
- `/api/auth/login` - Autenticación de usuarios y admins
- `/api/events` - CRUD de eventos
- `/api/speakers` - CRUD de speakers
- `/api/questions` - CRUD de preguntas

### 4. Servicios Actualizados
- **`src/services/auth.service.ts`**: Ahora usa fetch a las API routes en lugar de Firestore directamente
- Todas las funciones ahora son asíncronas y usan HTTP requests

### 5. Hooks Personalizados
Nuevos hooks para reemplazar los de Firestore:

- **`useMongoDoc`**: `src/hooks/use-mongodb-doc.ts` - Reemplaza `useDoc`
- **`useMongoCollection`**: `src/hooks/use-mongodb-collection.ts` - Reemplaza `useCollection`

### 6. Contextos y Providers
- **`src/contexts/auth.context.tsx`**: Eliminada dependencia de Firestore
- **`src/firebase/client-provider.tsx`**: Simplificado, ahora solo maneja AuthProvider

## Configuración Requerida

### Variables de Entorno
Crear un archivo `.env.local` con:

```env
MONGODB_URI=mongodb://localhost:27017/campusconnect
```

O para MongoDB Atlas:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/campusconnect
```

### Instalación de Dependencias
```bash
npm install mongoose bcryptjs
npm install --save-dev @types/bcryptjs
```

## Migración de Datos

Si tienes datos existentes en Firestore, necesitarás:

1. Exportar datos de Firestore
2. Transformar el formato a MongoDB
3. Importar a MongoDB usando scripts de migración

## Componentes que Necesitan Actualización

Los siguientes componentes aún pueden estar usando hooks de Firestore y necesitan ser actualizados:

- Componentes que usan `useDoc` → Cambiar a `useMongoDoc`
- Componentes que usan `useCollection` → Cambiar a `useMongoCollection`
- Componentes que acceden directamente a Firestore → Usar API routes

## Notas Importantes

1. **Autenticación**: Ya no se usa Firebase Authentication. La autenticación se maneja completamente a través de MongoDB y sesiones en localStorage.

2. **Seguridad**: Las validaciones de permisos (admin, owner, etc.) ahora deben implementarse en las API routes usando middleware.

3. **Real-time Updates**: Los hooks de MongoDB no tienen actualizaciones en tiempo real por defecto. Si necesitas esta funcionalidad, considera usar polling con `refreshInterval` o implementar WebSockets.

4. **Índices**: Los modelos de Mongoose incluyen índices básicos. Revisa y agrega más índices según tus necesidades de consulta.

## Próximos Pasos

1. Actualizar componentes que aún usan Firestore
2. Implementar middleware de autenticación en API routes
3. Agregar validación de permisos en las rutas
4. Configurar variables de entorno en producción
5. Migrar datos existentes si es necesario

