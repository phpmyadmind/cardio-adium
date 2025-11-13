# Configuración de MongoDB

## Conexión Configurada

La aplicación está configurada para conectarse a MongoDB Atlas con los siguientes parámetros:

- **Cadena de conexión**: `mongodb+srv://maalvima1_db_user:yisdUlLc8kmEKGc8@cluster0.lawrc6d.mongodb.net/Pcn-Cardio?retryWrites=true&w=majority&appName=Cluster0`
- **Base de datos**: `Pcn-Cardio`
- **Cluster**: Cluster0 en MongoDB Atlas

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. La cadena de conexión ya está configurada en el código. Si deseas usar una variable de entorno, crea un archivo `.env.local`:

```env
MONGODB_URI=mongodb+srv://maalvima1_db_user:yisdUlLc8kmEKGc8@cluster0.lawrc6d.mongodb.net/Pcn-Cardio?retryWrites=true&w=majority&appName=Cluster0
```

## Estructura de la Base de Datos

La base de datos `Pcn-Cardio` contiene las siguientes colecciones:

1. **users** - Perfiles de usuarios (médicos y administradores)
2. **events** - Eventos de la agenda
3. **speakers** - Perfiles de ponentes
4. **questions** - Preguntas de usuarios

## Modelos de Datos

Todos los modelos están definidos en `src/lib/mongodb/models/`:
- `User.ts` - Modelo de usuario
- `Event.ts` - Modelo de evento
- `Speaker.ts` - Modelo de ponente
- `Question.ts` - Modelo de pregunta

## API Routes

Todas las operaciones de base de datos se realizan a través de API routes en `src/app/api/`:
- `/api/users` - CRUD de usuarios
- `/api/auth/login` - Autenticación
- `/api/events` - CRUD de eventos
- `/api/speakers` - CRUD de speakers
- `/api/questions` - CRUD de preguntas

## Notas Importantes

- La conexión se cachea automáticamente para mejorar el rendimiento
- Los modelos de Mongoose incluyen índices para búsquedas eficientes
- Las contraseñas se hashean usando bcrypt antes de guardarse
- La base de datos se especifica tanto en la URI como en la opción `dbName` para mayor seguridad

