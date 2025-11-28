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

 {/* Pestañas de días (nivel inferior) - se muestran cuando hay una especialidad seleccionada */}
      {selectedSpecialty && filteredAgendaItems.length > 0 ? (
        <Tabs defaultValue={defaultDate} className="w-full mt-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 h-auto mb-6 gap-2 bg-transparent p-0">
          {sortedDates.map((date) => {
            const formattedDate = format(parseISO(date), "EEE dd/MM", { locale: es });
            // Capitalizar la primera letra del día
            const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
            
            return (
              <TabsTrigger 
                key={date} 
                value={date}
                className="text-sm sm:text-base font-bold rounded-xl bg-[#F00808] hover:bg-[#d00707] text-white shadow-md data-[state=active]:bg-[#F00808] data-[state=active]:text-white data-[state=active]:shadow-md py-2 px-3"
              >
                {capitalizedDate}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sortedDates.map((date) => {
          const items = sortedAgendaByDay[date];
          // Agrupar items por sección temática
          const itemsBySection: Record<string, AgendaItem[]> = {};
          let currentSection: string | null = null;
          let sectionCounter = 0;
          
          items.forEach((item) => {
            if (item.section) {
              currentSection = item.section;
              if (!itemsBySection[currentSection]) {
                itemsBySection[currentSection] = [];
              }
              itemsBySection[currentSection].push(item);
            } else {
              // Items sin sección (bienvenida, breaks, comidas, cierre)
              // Los colocamos en una sección "general" con un contador para mantener el orden
              const sectionKey = `general-${sectionCounter++}`;
              if (!itemsBySection[sectionKey]) {
                itemsBySection[sectionKey] = [];
              }
              itemsBySection[sectionKey].push(item);
            }
          });

          return (
            <TabsContent key={date} value={date} className="space-y-4 mt-0">
              <div className="bg-[#2E61FA] text-white rounded-lg p-4">
                <h3 className="text-2xl font-bold font-headline">
                  {format(parseISO(date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
                </h3>
              </div>

              {Object.entries(itemsBySection).map(([section, sectionItems]) => (
                <div key={section} className="space-y-3">
                  {/* Encabezado de sección temática */}
                  {!section.startsWith('general') && (
                    <div className="bg-[#2E61FA]/10 border-l-4 border-[#2E61FA] rounded-lg p-3 mb-2">
                      <h4 className="text-lg font-bold text-[#2E61FA]">{section}</h4>
                      {sectionItems[0]?.moderator && (
                        <p className="text-sm text-gray-600 mt-1">
                          Moderado por: <span className="font-semibold">{sectionItems[0].moderator}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Items de la sección */}
                  {sectionItems.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-white rounded-lg p-4 border-2 ${getTypeColor(item.type)} shadow-md`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        {/* Hora */}
                        <div className={`flex-shrink-0 flex items-center gap-2 text-sm font-semibold ${item.type === 'welcome' ? 'text-black' : ''}`}>
                          <Clock className="h-4 w-4" />
                          <span>{item.startTime} - {item.endTime}</span>
                        </div>

                        {/* Contenido */}
                        <div className="flex-grow">
                          <div className="flex items-start gap-2 mb-2">
                            {getTypeIcon(item.type)}
                            <h4 className={`font-bold text-lg ${item.type === 'welcome' ? 'text-black' : ''}`}>{item.title || item.topic}</h4>
                          </div>

                          {/* Conferencistas */}
                          {(item.speakerIds.length > 0 || item.participants) && (
                            <div className="mb-2">
                              <p className={`text-sm font-semibold mb-2 ${item.type === 'welcome' ? 'text-black' : 'text-gray-700'}`}>Conferencista(s):</p>
                              <div className="flex flex-wrap gap-3 items-center">
                                {/* Speakers */}
                                {item.speakerIds.map((speakerId) => {
                                  const speaker = getSpeaker(speakerId);
                                  if (!speaker) {
                                    // Si no se encuentra el speaker, mostrar el ID como fallback para debugging
                                    console.warn(`Speaker no encontrado para ID: ${speakerId}`, {
                                      availableSpeakers: speakers.map(s => ({ speakerId: s.speakerId, name: s.name })),
                                      speakerIds: item.speakerIds,
                                      eventTrackerId
                                    });
                                    return (
                                      <div key={`missing-${speakerId}`} className="flex items-center gap-2">
                                        <Avatar className="h-10 w-10">
                                          <AvatarFallback className="text-xs bg-gray-200 text-gray-600">?</AvatarFallback>
                                        </Avatar>
                                        <span className={`text-sm font-medium ${item.type === 'welcome' ? 'text-black' : 'text-gray-800'}`}>
                                          Speaker ID: {speakerId}
                                        </span>
                                      </div>
                                    );
                                  }
                                  // Normalizar la URL de la imagen con fallback al nombre
                                  const imageSrc = normalizeImageUrl(speaker.imageUrl || '', speaker.name);
                                  // Asegurarse de que imageSrc no esté vacío
                                  const finalImageSrc = imageSrc || normalizeImageUrl('', speaker.name);
                                  
                                  return (
                                    <div key={speaker.speakerId} className="flex items-center gap-2">
                                      <Avatar className="h-10 w-10">
                                        {finalImageSrc ? (
                                          <AvatarImage
                                            src={finalImageSrc}
                                            alt={speaker.name}
                                            data-ai-hint={speaker.imageHint}
                                            onError={(e) => {
                                              // Si la imagen falla, ocultar el AvatarImage para mostrar el fallback
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                            }}
                                          />
                                        ) : null}
                                        <AvatarFallback className="text-xs">{speaker.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <span className={`text-sm font-medium ${item.type === 'welcome' ? 'text-black' : 'text-gray-800'}`}>{speaker.name}</span>
                                    </div>
                                  );
                                })}
                                {/* Participantes que no son speakers */}
                                {item.participants && item.participants.map((participantName, index) => (
                                  <div key={`participant-${index}`} className="flex items-center gap-2">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback className="text-xs bg-gray-200 text-gray-600">{participantName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className={`text-sm font-medium ${item.type === 'welcome' ? 'text-black' : 'text-gray-800'}`}>{participantName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Ubicación */}
                          {item.location && (
                            <p className={`text-xs mt-2 ${item.type === 'welcome' ? 'text-black' : 'text-gray-500'}`}>
                              📍 {item.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </TabsContent>
          );
        })}
        </Tabs>
      ) : selectedSpecialty && filteredAgendaItems.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No hay eventos de agenda disponibles para la especialidad "{selectedSpecialty}".</p>
        </div>
      ) : null}

      {agendaItems.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No hay eventos de agenda disponibles para este evento.</p>
        </div>
      )}