# Instrucciones para Insertar Datos en MongoDB

## Método 1: Usando la API Route (Recomendado)

1. Asegúrate de que el servidor de desarrollo esté corriendo:
```bash
npm run dev
```

2. Ejecuta una petición POST a la ruta de seed usando cualquiera de estos métodos:

### Opción A: Usando curl (Terminal/PowerShell)
```bash
curl -X POST http://localhost:3000/api/seed
```

### Opción B: Usando PowerShell (Windows)
```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/seed -Method POST
```

### Opción C: Usando el navegador o Postman
- Abre tu navegador o Postman
- URL: `http://localhost:3000/api/seed`
- Método: `POST`
- Envía la petición

### Opción D: Usando fetch en la consola del navegador
Abre la consola del navegador (F12) y ejecuta:
```javascript
fetch('http://localhost:3000/api/seed', { method: 'POST' })
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

## Respuesta Esperada

Si todo sale bien, recibirás una respuesta JSON como esta:

```json
{
  "success": true,
  "message": "Datos insertados correctamente",
  "results": {
    "speakers": {
      "inserted": 5,
      "errors": []
    },
    "events": {
      "inserted": 38,
      "errors": []
    },
    "users": {
      "inserted": 3,
      "errors": []
    },
    "questions": {
      "inserted": 0,
      "errors": [
        "Speaker \"Dr. Emily Carter\" no encontrado - se omite la pregunta",
        "Speaker \"Dr. Ben Hanson\" no encontrado - se omite la pregunta"
      ]
    }
  }
}
```

## Notas Importantes

1. **Duplicados**: El script verifica si los datos ya existen antes de insertarlos. Si intentas ejecutarlo varias veces, solo insertará los datos nuevos.

2. **Preguntas**: Las preguntas en `placeholder-data.ts` hacen referencia a speakers que no existen en los datos (Dr. Emily Carter, Dr. Ben Hanson). Estas preguntas se omitirán automáticamente.

3. **Mapeo de IDs**: Los `speakerIds` en los eventos se mapean automáticamente de los IDs de placeholder ('1', '2', etc.) a los IDs reales de MongoDB.

4. **Base de Datos**: Los datos se insertarán en la base de datos `Pcn-Cardio` configurada en `src/lib/mongodb/connect.ts`.

## Verificar los Datos

Después de ejecutar el seed, puedes verificar los datos usando las rutas API:

- `GET /api/speakers` - Ver todos los speakers
- `GET /api/events` - Ver todos los eventos
- `GET /api/users` - Ver todos los usuarios
- `GET /api/questions` - Ver todas las preguntas

## Solución de Problemas

Si encuentras errores:

1. **Error de conexión**: Verifica que MongoDB Atlas esté accesible y que la cadena de conexión sea correcta.

2. **Error de duplicados**: Es normal si ejecutas el script varias veces. Los duplicados se omiten automáticamente.

3. **Error de validación**: Verifica que los modelos de MongoDB coincidan con los datos en `placeholder-data.ts`.

