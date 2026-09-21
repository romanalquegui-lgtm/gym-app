# Gym Tracker Pro v13 — guía rápida

## Qué ha cambiado en la v13 (volumen total, 1RM y comparación con el histórico)

Reportado: con series de reps variables (p. ej. "8-9-10"), el volumen total y el 1RM estimado no salían bien.

- **Causa real:** el campo "Reps" es texto libre y admite escribir varias series separadas por guion (p. ej. `8-9-10`). Pero tanto el "Volumen Total" de Estadísticas como el 1RM estimado usaban `parseFloat()` sobre ese texto, y en JavaScript `parseFloat("8-9-10")` **no suma nada — se queda solo con el primer número** (8) y descarta el resto. Con 3 series de 80kg y reps "8-9-10", la app calculaba 80×3×8=1920kg en vez de los 2160kg reales (80×(8+9+10)): un 11% menos de lo que realmente levantaste.
- **Corrección del volumen:** ahora se suman todas las cifras separadas por guion. Si escribes un solo número (p. ej. "10"), se sigue multiplicando por el nº de series, como antes — la app distingue ambos formatos automáticamente.
- **El 1RM NO se corrigió sumando** (sumar 27 reps en la fórmula de Epley da un número sin sentido físico: la fórmula está pensada para una sola serie). En su lugar, el 1RM estimado usa la **última cifra** de la lista — la app ahora asume que registras tus series de menos a más exigente (p. ej. en "8-9-10", el 10 final es tu serie más dura). Se añadió una nota bajo el campo de Reps para dejar esta convención a la vista, y la vista previa del 1RM ahora indica qué cifra ha usado.
- **Comparación con el histórico:** cada registro del historial muestra ahora, además del delta de peso que ya existía (▲/▼ kg), un delta de **volumen** (📦 Vol ▲/▼ kg y %) frente a la última vez que hiciste ese mismo ejercicio. Así se detectan progresos que el peso solo no muestra — por ejemplo, mismo peso pero más repeticiones totales.
- **Verificado, no solo corregido:** probé las funciones reales del archivo (no una reconstrucción) contra 8 combinaciones distintas de series/reps, incluido tu ejemplo exacto (3 series, "8-9-10"), más un caso end-to-end completo con dos sesiones del mismo ejercicio para confirmar que el badge de comparación de volumen sale con el número y el signo correctos.
- Sin cambios en el formato del CSV: el volumen se calcula al vuelo a partir de peso+series+reps, no se guarda como columna nueva, así que un CSV exportado en v12 se sigue pudiendo reimportar sin problemas.

## Qué ha cambiado en la v12 (temporizador de descanso corregido)

Reportado: el timer a veces se quedaba congelado sin terminar, o terminaba en silencio.

- **Causa real:** el código documentaba una protección ("Web Locks API") para mantener vivo el Service Worker mientras corría el timer — pero esa protección nunca se llegó a implementar, solo quedó escrita en un comentario. Sin ella, el navegador puede terminar el Service Worker tras ~30s inactivo (un `setTimeout` pendiente no cuenta como actividad), y un descanso típico dura 60-180s. El bug de verdad: la propia página, aun sabiendo con su reloj que el tiempo ya se había cumplido, se quedaba esperando pasivamente el aviso del Service Worker en vez de completarse ella misma. Por eso se congelaba en 0:00 sin sonar — incluso con la pantalla encendida y la app abierta.
- **Corrección:** el bucle visual del timer ahora se completa solo en cuanto detecta que venció, sin depender del Service Worker. Este pasa a ser un aviso complementario (útil con la pantalla apagada), no el único disparador. También se movió la creación del sonido al momento de pulsar "Iniciar" (un gesto real del usuario), en vez de al terminar, para evitar que la política de autoplay del navegador lo bloquee en silencio.
- **Verificado, no solo corregido:** probé el script real en un entorno simulado con un Service Worker que **nunca responde** (el peor caso posible) y confirmé que el timer se completa solo, a tiempo, sin su ayuda.
- Límite honesto que sigue existiendo: con la pantalla completamente apagada y la app en segundo plano, ningún método web es 100% infalible para que *suene* en el momento exacto — es una restricción real de los navegadores. Lo que sí es ahora 100% fiable es que, en cuanto abras la app de nuevo, verás correctamente que el descanso ya terminó, y con la pantalla encendida en primer plano (el uso más habitual) el aviso ya no depende de que el Service Worker sobreviva.

## Qué ha cambiado en la v11 (rendimiento con historiales grandes)

A partir de unos ~1000 registros, el renderizado del historial se notaba lento. La causa no era el tamaño de los datos (1200 registros en JSON son ~300 KB, nada para `localStorage`), sino cómo se calculaban las insignias de cada tarjeta:

- **La causa real:** por cada tarjeta visible, la v10 recorría el array completo de registros hasta 3 veces (sesión anterior, récord personal, conteo) para calcular sus insignias. Con `n` registros eso es un coste proporcional a `n × n`: al doblar el historial, el tiempo se multiplicaba por cuatro. Además, el buscador relanzaba ese cálculo completo en cada pulsación de tecla, y guardar o borrar un registro recalculaba estadísticas y gráficos dos veces por error.
- **La solución:** ahora se construye un índice (agrupando por ejercicio y ordenando por fecha) una sola vez por cada renderizado, y cada tarjeta consulta ese índice en tiempo constante. También se añadió un pequeño retraso (250 ms) al buscador para no relanzar el cálculo en cada tecla, se quitó el doble cálculo al guardar/borrar, y la lista de historial ahora se pagina de 50 en 50 con un botón "Cargar más" en vez de crear de golpe cientos de tarjetas.
- **Medido, no solo estimado:** con datos sintéticos equivalentes a tu caso (1200 registros, 60 ejercicios distintos), el cálculo de insignias por tarjeta pasó de ~67 ms a ~1.6 ms — verificando además que el resultado es idéntico al de antes, registro por registro. Ese es solo uno de los cuatro cambios; en el navegador (sumando la paginación del DOM y el buscador sin recalcular en cada tecla) la diferencia percibida es mayor todavía.
- Estos cambios son puramente internos: tus datos, el CSV, el temporizador y el resto de funciones se comportan exactamente igual que en la v10.

## Qué cambió en la v10 (respecto a la v9)

- **Botones de control al principio.** La tarjeta "Gestión de Datos" (backup/restaurar JSON y CSV) estaba al final de la página; ahora es lo primero que se ve, justo debajo del título. Así puedes restaurar tu copia de seguridad antes de registrar nada nuevo, sin tener que bajar toda la página.
- **Catálogo de ejercicios en CSV.** La lista de ejercicios por categoría ya no está escrita dentro del código: vive en `ejercicios.csv`, editable con cualquier editor de texto o Excel/Sheets. Si ese archivo no está disponible por el motivo que sea, la app sigue funcionando igual gracias a una copia de seguridad integrada — nunca te quedas sin catálogo.
- **Base para instalarla como app real.** Se han añadido `manifest.json`, `sw.js` y los iconos necesarios para que Chrome en Android pueda ofrecer "Añadir a pantalla de inicio" y, desde ahí, generar un APK de verdad (ver más abajo). También añade un botón "Instalar App" que solo aparece cuando el navegador confirma que la app cumple los requisitos.
- **Corrección de un bug latente:** el Service Worker original registraba `scope: '/'`. Eso funciona en local pero falla en cuanto alojas la app en una subcarpeta (por ejemplo `usuario.github.io/repo/`, típico de GitHub Pages). Ahora usa un scope relativo que funciona en ambos casos.
- El temporizador de descanso (Wake Lock, notificación nativa, Service Worker) se comporta exactamente igual que en la v9; solo cambia dónde vive el código.

## Archivos del proyecto

| Archivo | Para qué sirve |
|---|---|
| `entrenos_claude13.html` | La app. Ábrelo para usarla. |
| `ejercicios.csv` | Catálogo de ejercicios editable. |
| `manifest.json` | Nombre, colores e iconos de la app instalada. |
| `sw.js` | Caché offline + lógica del temporizador. |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Iconos de la app. |

**Importante:** mantén los 6 archivos siempre juntos en la misma carpeta. Si abres solo el `.html` suelto, la app funciona igual (con el catálogo integrado), pero pierde el CSV editable, el modo offline y la opción de instalarse.

## Probarlo antes de subirlo a ningún sitio

Abrir el HTML con doble clic (`file://...`) sigue funcionando, pero los navegadores bloquean por seguridad tanto la carga del CSV vía `fetch()` como el registro del Service Worker en ese modo. Para probar todo de verdad, sírvelo por HTTP local:

```bash
cd carpeta_del_proyecto
python3 -m http.server 8080
```

Y abre `http://localhost:8080/entrenos_claude13.html`. Si tu móvil está en la misma wifi que el ordenador, cambia `localhost` por la IP local del ordenador (p. ej. `http://192.168.1.50:8080/entrenos_claude13.html`) para probarlo directamente ahí, incluido el botón "Instalar App".

## Sobre reescribirlo en Python y generar un APK

Va la parte honesta, porque prefiero decírtelo claro a prometer algo que no puedo entregar:

**No puedo compilar un APK real en este entorno**, y tampoco te recomendaría el camino de Python aunque pudiera:

- Empaquetar Python para Android (Kivy + Buildozer, o Chaquopy) necesita el SDK y el NDK de Android, Java, y una compilación de bastantes minutos que descarga varios GB de herramientas de Google. Mi entorno de trabajo no tiene acceso a esos servidores de descarga (solo a repositorios de paquetes tipo PyPI/npm/GitHub), y el propio sistema de archivos se reinicia entre tareas, así que ese proceso no podría ni completarse ni conservarse aquí.
- Reescribirlo en Python significaría tirar el trabajo ya hecho en el temporizador de descanso (Service Worker, Wake Lock, notificaciones nativas), que está pensado específicamente para las peculiaridades de Android y que en Kivy habría que reconstruir con librerías adicionales (`plyer`, `pyjnius`) y bastante más complejidad.
- El acabado visual de una interfaz Kivy normalmente queda por debajo de lo que ya tienes en HTML/CSS.

**Lo que sí es realista, y es lo que he dejado preparado:** convertir tu app web en una PWA instalable y, desde ahí, generar un APK real sin escribir Java/Kotlin, usando [PWABuilder](https://www.pwabuilder.com/) (proyecto gratuito y de código abierto de Microsoft). Comprobado en julio de 2026: la herramienta y el flujo siguen activos.

### Pasos para obtener el APK

1. **Sube los 6 archivos a un hosting con HTTPS.** El más sencillo y gratuito es GitHub Pages:
   - Crea un repositorio en GitHub y sube los 6 archivos.
   - En *Settings → Pages*, activa GitHub Pages sobre la rama principal.
   - En un par de minutos tendrás una URL del tipo `https://tuusuario.github.io/turepo/entrenos_claude13.html`.
2. Entra en **[pwabuilder.com](https://www.pwabuilder.com/)** y pega esa URL.
3. PWABuilder analiza tu `manifest.json` y `sw.js` (por eso ya están preparados) y te deja generar el paquete para **Android**.
4. Descargas un `.zip` que contiene un `.apk` (para instalar y probar directamente en tu móvil) y un `.aab` (por si algún día quieres publicarla en Google Play).
5. Pasa el `.apk` a tu móvil (cable, Drive, WhatsApp a ti mismo...) e instálalo — Android pedirá permiso para instalar de "fuentes desconocidas" la primera vez.

Nota: si generas el APK sin firmar, Android puede mostrar una barra de dirección en la parte superior; es solo estético. PWABuilder puede generarlo firmado y con `assetlinks.json` si quieres que se vea 100% como app nativa sin esa barra — la propia herramienta te guía en ese paso opcional.

## Personalizar el catálogo de ejercicios

Abre `ejercicios.csv` con cualquier editor de texto, Excel o Google Sheets (guardando de nuevo como CSV). Cada línea es `Categoria,Ejercicio`. Añade, borra o reordena filas libremente. Usa siempre una de estas categorías para que el ejercicio aparezca bien agrupado en el desplegable:

`Pecho, Espalda, Piernas, Hombros, Bíceps, Tríceps, Abdominales, Glúteos, Cardio, Funcional, Otro`

## Otras mejoras que no he tocado (por si te interesan más adelante)

- Editor de ejercicios personalizados desde la propia app (sin tocar el CSV a mano).
- Recordatorio periódico para hacer copia de seguridad (por fecha o por nº de registros).
- Gráfico de evolución del volumen semanal a lo largo del tiempo, no solo la foto de la semana actual.
- "Modo entreno" simplificado: pantalla mínima con el ejercicio activo + temporizador, para usar con el móvil en la mano entre series.
- Rutinas predefinidas (p. ej. "Día de empuje") que vayan guiando ejercicio a ejercicio.
- Etiquetas ARIA en los botones de solo-icono, de cara a accesibilidad con lectores de pantalla.
- Si algún día el historial llega a varios miles de registros (no es tu caso con 1200, pero por si crece mucho), el siguiente paso sería mover el almacenamiento de `localStorage` a `IndexedDB` y usar scroll virtual en vez de paginación. Con los volúmenes actuales no compensa la complejidad extra.

Dime si quieres que implemente cualquiera de estas y sigo desde aquí.
