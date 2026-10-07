# Pictionary Online: notas para retomar

**Última sesión:** 7 de octubre de 2026

## Hecho y probado
- Registro con 8 caras animadas, lobby con temas, lienzo en tiempo real, chat con detección de aciertos, turnos, pistas, puntos y podio.
- Chat de voz WebRTC con silencio automático del dibujante.
- **Rediseño mobile-first:**
  - Partida en vertical sin scroll; el chat o las herramientas quedan abajo, al alcance del pulgar.
  - Manejo del teclado: el lienzo se encoge y la franja de jugadores se oculta.
  - Reconexión con puntaje: el jugador se identifica con una clave por pestaña y tiene 45 s para volver.
  - App instalable (PWA), vibración, pantalla siempre encendida y botón de compartir nativo.
  - Diseños para celular horizontal, tablet y escritorio.
- **🎡 Ruleta de palabras** al inicio de cada turno, con 8 palabras del tema elegido:
  - el servidor decide el resultado y todos ven el mismo giro;
  - quienes adivinan ven "?";
  - gira sola a los 10 s.
- **Ajustes para iPhone (Safari):** desbloqueo de audio, toques en SVG, prefijos `-webkit-`, sin menú al mantener presionado y reproducción de voz tras un toque.
- **v1.3.0:**
  - pantalla de bienvenida con nombre, "by Miguel Mendez" y versión;
  - anuncio de aciertos en pantalla y en voz alta ("Laura ganó 180 puntos");
  - botón 🔊/🔇.
- **v1.4.0:**
  - tema en menú desplegable;
  - 60 palabras por tema;
  - la ruleta toma las palabras solo del tema;
  - avatar personalizable: sexo, piel, cabello, ojos, labios, barba y fondo.
- **v1.5.0:**
  - avatar con cuello, hombros y playera lisa o de rayas (2 colores);
  - 10 puntos por acierto, acumulables, que vuelven a 0 al desconectarse;
  - perfil editable en todo momento;
  - cuentas con usuario y contraseña.
- **v1.6.0:**
  - lentes (4 tipos, 10 colores de marco, cristales transparentes o de color);
  - interfaz llamativa con título animado;
  - un color de interfaz por tema;
  - portada con objetos animados al azar;
  - ícono nuevo y botón para instalar en el teléfono.
- **v1.7.0:**
  - 1 minuto fijo por turno con barra de tiempo y "tic" final;
  - si nadie adivina, los 10 puntos son para el dibujante.
- **v1.8.0:**
  - lista para publicar (`DESPLIEGUE.md`, `render.yaml`, `Dockerfile`);
  - tolerante a cortes de datos móviles;
  - turno de 1:30 con cronómetro grande;
  - tema Deportes.
- **v1.8.1:** solo ganan puntos quienes adivinan; ya no hay puntos para el dibujante.
- Las respuestas ignoran mayúsculas, acentos **y espacios**.
- Probado con emulación de iPhone (390 px), Android pequeño (360 px), celular horizontal y escritorio, sin scroll ni desbordes.

## Siguiente
1. **Probar en celulares reales.** Aquí solo hubo Chromium (el motor de Android), así que el **iPhone falta probarlo en un equipo real**:
   - ruleta y sonido "tic-tic";
   - voz del anunciador;
   - teclado;
   - dibujo con el dedo;
   - voz.
2. **Publicarlo con HTTPS** siguiendo `DESPLIEGUE.md` (Render + disco para las cuentas + TURN para la voz). en Render, Railway o Fly.io, para tener un enlace fijo, micrófono e instalación como app.
3. Temas personalizados escritos por el anfitrión.
4. Elegir entre 3 palabras, deshacer el último trazo y sonidos.

## Cómo ejecutarlo en tu PC
```bash
cd pictionary
npm install
npm start          # http://localhost:3000
```
Para probar desde el celular en tu misma red WiFi: `http://IP-DE-TU-PC:3000`. Ahí funciona todo menos el micrófono y la instalación como app, que necesitan HTTPS. Para tenerlos, usa `npx cloudflared tunnel --url http://localhost:3000`.
