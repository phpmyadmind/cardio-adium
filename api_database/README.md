# API Database - Cardio Adium

API REST con Express, MySQL y nodemon basada en la estructura de datos de **cardio-adium**.

## Requisitos

- Node.js 18+
- MySQL 5.7+ (o MariaDB 10.2+)

## Instalación

```bash
npm install
```

## Configuración

Edita el archivo `.env` con tus credenciales de MySQL:

```env
DB_HOST=179.50.79.19
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=cardio_adium
DB_PORT=3306
JWT_SECRET=tu-secret-jwt
PORT=5040
```

## Crear la base de datos

Ejecuta el schema SQL para crear las tablas:

```bash
mysql -h 179.50.79.19 -u root -p < database/schema.sql
```

O conecta a MySQL y ejecuta el contenido de `database/schema.sql`. Si usas otro nombre de base de datos, modifica la línea `CREATE DATABASE` y `USE` en el archivo.

## Ejecutar

**Desarrollo** (con recarga automática con nodemon):

```bash
npm run dev
```

**Producción**:

```bash
npm start
```

El servidor estará en `http://localhost:5040`.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servidor y conexión DB |
| POST | `/api/auth/login` | Login (identifier, password, isAdmin) |
| GET/POST | `/api/users` | CRUD usuarios |
| GET/POST | `/api/event-trackers` | CRUD event trackers |
| GET/POST | `/api/speakers` | CRUD speakers |
| GET/POST | `/api/agenda` | CRUD agenda |
| GET/POST | `/api/events` | CRUD eventos |
| GET/POST | `/api/questions` | CRUD preguntas Q&A |
| GET/POST | `/api/surveys` | CRUD encuestas |
| GET/POST | `/api/survey-questions` | CRUD preguntas de encuesta |
| GET/POST | `/api/survey-responses` | CRUD respuestas de encuesta |
| GET/POST | `/api/settings` | CRUD configuración key-value |

## Estructura

```
api_database/
├── src/
│   ├── config/db.js      # Conexión MySQL
│   ├── routes/           # Rutas API
│   ├── utils/uuid.js     # Generador de IDs
│   └── index.js          # Servidor Express
├── database/
│   └── schema.sql       # Schema MySQL
├── .env
├── nodemon.json
└── package.json
```
