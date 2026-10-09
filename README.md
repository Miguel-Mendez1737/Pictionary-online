# Adivina el Garabato

Juego interactivo multijugador: dibuja, adivina y suma puntos con tus amigos en tiempo real, cada quien desde su celular.

**by Miguel Mendez** · versión 1.19.2 (la versión se toma de `package.json`)

Juego de dibujar y adivinar multijugador en tiempo real con **Node.js + Express + Socket.io** y frontend en **HTML5 / CSS / JavaScript vanilla**.

## Ejecutar localmente

Requisitos: Node.js 18 o superior.

```bash
npm install
npm start            # o: npm run dev  (se reinicia al guardar cambios)
```

Abre http://localhost:3000 en dos o más pestañas o dispositivos.
Para jugar con otras personas en tu red, compartan `http://TU-IP-LOCAL:3000/?sala=CODIGO`.

## Estructura

```
pictionary/
├── package.json
├── server.js              # Express + Socket.io: salas, turnos, puntos, reconexión y voz
├── accounts.js            # Cuentas de jugador (registro, inicio de sesión, perfil)
├── data/users.json        # Se crea solo al registrarse el primer usuario
├── words.js               # Banco de palabras: 5 temas × 60 palabras
├── DESPLIEGUE.md          # Guía para publicar la app en internet (jugar a distancia)
├── render.yaml / Dockerfile  # Configuración para publicar
└── public/
    ├── index.html         # Registro, lobby y pantalla de juego
    ├── style.css          # Diseño mobile-first + caras animadas en CSS
    ├── app.js             # Cliente: lienzo, chat, voz, ruleta, teclado móvil, vibración
    ├── avatar.js          # Avatar personalizable en SVG
    ├── manifest.webmanifest  # App instalable (PWA)
    ├── sw.js              # Service worker
    └── icons/             # Íconos de la app
```

## Chat de voz entre jugadores

Pulsa **🎙️ Unirse al audio** (en el lobby o durante la partida) y acepta el permiso del micrófono.

- 🎤 / 🔇 silencia o activa tu micrófono · 📞 sale del audio.
- En la lista de jugadores, 🎙️ = conectado al audio, 🔇 = silenciado, y la cara se ilumina en verde mientras esa persona habla.
- El anfitrión puede activar **"Silenciar el micrófono de quien dibuja"** (activado por defecto) para que el dibujante no diga la respuesta.
- El audio viaja directo entre navegadores (WebRTC); el servidor solo ayuda a conectarlos. Recomendado hasta ~8 personas en audio.

### Importante: el micrófono requiere HTTPS

Los navegadores solo permiten el micrófono en `https://` o en `localhost`. Para jugar con voz desde otros equipos:

**Opción A – túnel (la más fácil):**
```bash
npm start
npx cloudflared tunnel --url http://localhost:3000   # comparte la URL https que imprime
```

**Opción B – certificado propio:**
```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=localhost"
SSL_KEY=key.pem SSL_CERT=cert.pem npm start           # https://TU-IP:3000 (acepta la advertencia del navegador)
```

**Redes restrictivas (empresas, datos móviles):** si alguien no se escucha, configura un servidor TURN:
```bash
ICE_SERVERS='[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:mi-turn:3478","username":"u","credential":"p"}]' npm start
```

## Pensado para el celular (mobile-first)

- **Partida en vertical sin scroll:** arriba van la palabra y el tiempo, luego la franja de jugadores, el lienzo y abajo el chat o las herramientas.
- **Teclado:** al escribir, el lienzo se encoge y la franja de jugadores se oculta para que sigas viendo el dibujo y el último mensaje.
- **Dibujo con el dedo** sin zoom, sin scroll ni menús accidentales. Se ignora un segundo dedo, por ejemplo la palma.
- **Reconexión:** si bloqueas el celular, cambias de red o recargas la página, vuelves a la partida con tu puntaje (tienes 45 s).
- **Instalable:** "Agregar a pantalla de inicio" la abre a pantalla completa, como una app. Requiere HTTPS.
- **Vibración** al acertar, cuando te toca dibujar y cuando se acaba el tiempo. La pantalla no se apaga durante la partida.
- **Compartir:** el botón 🔗 abre el menú del celular (WhatsApp, etc.).
- **Celular en horizontal:** el lienzo queda a la izquierda y el chat a la derecha. En tablet y PC hay un diseño de 3 columnas.

## 🎡 Ruleta de palabras

Cada turno empieza con una ruleta de 8 palabras del tema que eligió el anfitrión.

- **Quién gira:** el dibujante, tocando la ruleta o el botón. Si no gira en 10 s, gira sola.
- **Mismo giro para todos:** el servidor decide dónde cae, así que todos ven exactamente el mismo giro, con "tic-tic" y vibración (en Android).
- **Quienes adivinan** ven la ruleta girar con **"?"** en vez de palabras. Solo el dibujante ve la palabra que salió.
- **Más temas:** para agregar un tema basta con añadirlo en `words.js` y la ruleta lo usa automáticamente.

## Compatibilidad
- **Android:** Chrome, Samsung Internet o Firefox recientes.
- **iPhone/iPad:** Safari con iOS 15 o superior. El código tiene ajustes específicos para Safari:
  - audio y sonidos que se activan con el primer toque;
  - toque sobre la ruleta;
  - teclado manejado con `visualViewport`;
  - sin menú de copiar ni lupa al dibujar;
  - márgenes para el notch.
- **iPhone no vibra:** Safari no lo permite. Todo lo demás funciona igual.

## Bienvenida y anuncios
- **Bienvenida:** al abrir la app aparece una pantalla con el nombre, **by Miguel Mendez** y la versión. Se cierra sola a los 2 s o con un toque. Los créditos quedan también al pie del registro.
- **Cambiar la versión:** edita `"version"` en `package.json` y se actualiza en toda la app.
- **Anuncio de aciertos:** cuando alguien escribe la palabra exacta (sin importar mayúsculas, acentos ni espacios), todos ven el aviso **"¡Miguel ganó 170 puntos!"** y la app lo **dice en voz alta** con la voz en español del celular. Quien acierta oye "¡Correcto! Ganaste 170 puntos".
- **Silencio:** el botón 🔊/🔇 apaga los sonidos y la voz. La preferencia se recuerda.

## Temas y ruleta (v1.4)
- **Elegir el tema:** el anfitrión lo elige en un **menú desplegable** del lobby.
- **Palabras:** cada tema tiene **60 palabras**. Con el máximo de 12 jugadores y 5 rondas (60 turnos), ninguna palabra se repite en una partida.
- **La ruleta** toma sus 8 casillas solo del tema elegido y prefiere las palabras que aún no han salido.

## Avatar personalizable (v1.4)
- **Rasgos que se eligen:**
  - sexo;
  - color de piel (6);
  - tipo de cabello (8) y su color (8);
  - tipo de ojos (6) y su color (6);
  - tipo de labios (6);
  - barba (6, solo para hombre);
  - color de fondo (8).
- **Animación y extras:** el avatar está dibujado en SVG y parpadea y se mueve. Tiene un botón 🎲 para crear uno al azar y se recuerda en el celular.

## Novedades v1.5
### Avatar con cuello, hombros y playera
- **Playera** lisa o con rayas (Rayas, Rayitas, Verticales), con **color principal** y **color de rayas** (10 colores cada uno).

### Puntaje
- **10 puntos** por adivinar la palabra del turno. Se cambia en `server.js` con `POINTS_GUESS`. `POINTS_DRAWER` da puntos al dibujante y está en 0.
- **Se acumulan** mientras sigas conectado, aunque se jueguen varias partidas seguidas.
- **Si te desconectas, tus puntos vuelven a 0.**

### Todo editable
- **Cómo editar:** botón ✏️ del lobby, o tocar tu propia ficha en el lobby o en la partida.
- **Qué se puede cambiar:** nombre y avatar completo. Con cuenta, también el **usuario** y la **contraseña**.
- **En la sala:** todos ven el cambio al instante.

### Cuentas
- **Crear cuenta:** al crear tu jugador, abre "💾 Crear cuenta", elige usuario y contraseña, y listo.
- **Volver a entrar:** la próxima vez la app te saluda ("¡Hola, Miguel!") y entras directo con tu nombre y avatar. En otro celular, usa "Inicia sesión".
- **Seguridad:**
  - contraseñas cifradas con scrypt (nunca en texto);
  - sesiones con token;
  - límite de intentos por minuto.
- **Dónde se guardan:** en `data/users.json`, o en la carpeta indicada por la variable `DATA_DIR`.
  - Al publicar gratis en Render, usa una base de datos PostgreSQL gratuita (variable `DATABASE_URL`, ver v1.9.0 y `DESPLIEGUE.md`).
  - Para muchos usuarios conviene migrar a una base de datos.

## Novedades v1.6
- **Lentes en el avatar:**
  - 4 tipos: redondos, cuadrados, aviador y ojo de gato;
  - 10 colores de marco;
  - cristales **transparentes (solo marco)** o de color: oscuros, azules, rosas, verdes, amarillos y morados.
- **Interfaz llamativa:**
  - título "Pictionary" con letras de colores que rebotan;
  - fondo con manchas de color y botones con degradado.
- **Un color por tema:** películas en rojo y dorado, verbos en verde y azul, acciones en naranja y rosa, objetos en azul y morado. Los colores se definen en `words.js` (`colors`).
- **Portada animada:** cada vez que se abre la app aparecen objetos distintos:
  - algo que vuela (avión, cohete, ovni…);
  - algo que rueda (carro, taxi, bici…);
  - una herramienta (martillo, llave…);
  - protagonistas icónicos de películas (dinosaurio, tiburón, león, robot, fantasma…);
  - objetos (pelota, pizza, reloj…).
  Al tocarlos, saltan y suenan.
- **Ícono nuevo** y botón **"📲 Instalar en mi teléfono"**.

## Instalar la app en el teléfono (acceso directo)
1. **Abre la app en el celular:**
   - en la misma red WiFi que tu PC, entra a `http://IP-DE-TU-PC:3000`;
   - o, mejor, abre la dirección pública con `https`, cuando la app esté publicada.
2. **Toca "📲 Instalar en mi teléfono"** en la pantalla de inicio.
   - **Android (Chrome):** se abre el cuadro "Instalar app". Con `http` sin publicar, usa el menú ⋮ → "Agregar a la pantalla principal".
   - **iPhone (Safari):** botón Compartir ⬆️ → "Agregar a inicio" → Agregar.
3. **Listo:** aparece el ícono en tu pantalla de inicio y la app abre a pantalla completa.

Para la instalación completa en Android, y para el micrófono, la app debe abrirse con **https**, es decir, publicada.

## Novedades v1.7: el minuto para adivinar
- **Tiempo fijo:** cada turno dura **1 minuto** (`TURN_SECONDS` en `server.js`). El lobby lo muestra fijo, ya no hay selector.
- **Cuenta regresiva visible:**
  - reloj circular y una **barra de tiempo** sobre el lienzo, que se pone amarilla a los 20 s y roja y parpadeando a los 10 s;
  - "tic" en los últimos 5 segundos y vibración a los 10 y a los 3.
- **Si alguien adivina:** gana **10 puntos**.
- **Si se acaba el tiempo y nadie adivinó:** nadie suma puntos (regla actualizada en v1.8.1).
- **Pistas:** siguen saliendo letras a los 30 s y a los 15 s.

## Novedades v1.8: jugar a distancia
- **Publicar en internet** para que cada quien juegue con sus datos móviles: ver **`DESPLIEGUE.md`**. Incluye `render.yaml` y `Dockerfile`.
- **Preparada para datos móviles:**
  - un corte de señal de menos de **20 s** no hace perder los puntos ni el lugar;
  - al dibujante se le esperan **15 s** antes de cerrar su turno;
  - aviso "📶 Reconectando…" mientras no hay conexión.
- **Tiempo por turno: 1:30.** Hay un cronómetro grande `⏱️ 1:30 → 0:00` sobre el lienzo, visible para todos. Se pone amarillo a los 30 s y rojo a los 10 s.
- **Nuevo tema ⚽ Deportes** con 60 palabras y colores verde y naranja.

## v1.8.1: regla de puntos
- **Solo ganan los que adivinan:** 10 puntos cada uno.
- **El dibujante no suma puntos.**
- **Si se acaba el tiempo (1:30) y nadie adivinó,** nadie suma puntos en ese turno.

## v1.9.0: publicar gratis
- **`render.yaml`** ahora usa el **plan Free** de Render.
- **Cuentas en base de datos:** si existe la variable `DATABASE_URL`, las cuentas se guardan en **PostgreSQL**, por ejemplo **Neon**, que es gratis. Así no se pierden cuando Render se duerme.
  - Sin `DATABASE_URL`, se guardan en `data/users.json`, como antes.
  - Si la base de datos no responde, el juego sigue funcionando y solo se pausan las cuentas.
- **Guía:** `DESPLIEGUE.md` explica el camino 100% gratuito: Render Free + Neon + Metered.

## v1.10.0: salas privadas solo para amigos 🔒
- **Mis amigos:** cada cuenta tiene su lista de amigos y los agrega con su **usuario** (`@laura`).
- **Crear sala privada:** quien tiene cuenta toca **"🔒 Crear sala privada"**. Se genera un código aleatorio de 6 caracteres, por ejemplo `A69FB7`.
- **Quién entra:** **solo el dueño y sus amigos**.
  - Alguien que no es amigo ve "🔒 Esta sala es privada… pídele que te agregue".
  - Los invitados sin cuenta no pueden entrar.
- **Agregar amigos desde el lobby:** el dueño puede hacerlo en el momento, y ya pueden entrar.
- **Salas abiertas:** las salas por código siguen abiertas para cualquiera que tenga el código.
- **Enlaces de invitación:** al abrir uno (`?sala=CODIGO`), la app lleva a esa sala aunque estuvieras en otra.

## v1.10.1: conexión más robusta con la base de datos
- **Reconexión automática:** si la base de datos no responde al arrancar, la app **se reconecta sola** (10 s, 20 s, 40 s… hasta cada 5 min). Mientras tanto se puede jugar como invitado.
- **Dirección limpia:** a la dirección `DATABASE_URL` se le quitan las comillas o espacios pegados por error.
- **Errores claros:** los Logs explican la causa en español, por ejemplo una contraseña incorrecta o una dirección mal copiada.

**App publicada:** https://pictionary-online.onrender.com

## v1.11.0: tiempo para adivinar editable
- **Elegir el tiempo:** en el lobby, el anfitrión elige en **"Tiempo por turno"** entre **0:30, 0:45, 1:00, 1:30 (por defecto), 2:00, 2:30 y 3:00**. Las opciones están en `TIME_OPTIONS`, en `server.js`.
- **Quién lo ve:** los demás jugadores ven el tiempo elegido, pero no pueden cambiarlo. La regla del lobby muestra el tiempo con palabras.
- **Se ajusta solo:** el cronómetro, las pistas (a la mitad y al 25 % del tiempo) y los colores de la barra se adaptan al tiempo elegido.

## v1.12.0: nuevo nombre "Adivina el Garabato"
- **Qué cambia:** el nombre visible pasa a **"Adivina el Garabato"** en la bienvenida, la portada, la pestaña del navegador y el ícono instalado (que muestra "Garabato").
- **Qué se mantiene:** la dirección web, las cuentas, los amigos y las sesiones guardadas no cambian.

## v1.13.0: tres juegos en una app
En el lobby, el anfitrión elige **¿A qué jugamos?**: 🎨 Garabato, ✋ Basta o 🎲 Parchís. Los tres usan las mismas salas (también las privadas), cuentas, avatares, chat de voz y puntos acumulados.

### ✋ Basta / Stop (`games/basta.js`, `public/basta.js`)
- **Categorías:** el anfitrión elige de 3 a 8 entre 14 (Nombre, Apellido, País o ciudad, Animal, Fruta o verdura, Color, Cosa, Comida, Marca, Profesión, Película o serie, Artista, Deporte, Flor o planta). También elige las rondas (3, 5, 7 o 10) y el tiempo máximo por ronda (1 a 3 minutos).
- **La letra:** sale al azar con una animación, sin K, Ñ, Q, W, X, Y ni Z, y no se repite en la partida.
- **¡BASTA!:** quien llena todo puede tocarlo; los demás tienen 3 segundos para terminar. Mientras se escribe solo se ve cuántas categorías lleva cada uno, no las respuestas.
- **Revisión:** todos ven las respuestas y pueden votar 👎 las que no valen; se anulan por mayoría de los demás. Puntos por categoría: 20 si fue el único con respuesta válida, 10 si nadie la repitió y 5 si se repitió. Se ignoran mayúsculas y acentos.

### 🎲 Parchís (`games/parchis.js`, `public/parchis.js`)
- **Jugadores:** de 2 a 6. Con 2 a 4 se usa el tablero clásico; con 5 o 6, un tablero hexagonal con 6 colores. Si hay más personas en la sala, miran la partida.
- **Reglas:** un dado; se sale con 5 (obligatorio); con 6 se tira otra vez y tres 6 seguidos regresan la última ficha a casa. Hay seguros ⭐ y barreras de dos fichas. Comer una ficha da +20 casillas y llegar a la meta +10. La meta requiere tirada exacta.
- **Puntos para la tabla general:** comer +5, ficha en la meta +10, ganar +30.
- **Turnos:** si alguien no juega en 25 s (o se desconecta), la app juega por él. Si solo hay una jugada posible, se mueve sola.

## v1.13.1: en Garabato solo gana el primero
- **Primer acierto:** el primero que escribe la palabra gana 10 puntos y el turno termina en ese momento. El reloj se va a 0 y, tras mostrar la palabra, sigue el siguiente turno.
- **Aciertos tardíos:** quien escribe la palabra después ya no suma puntos.

## v1.14.0: ❓ Trivia (`games/trivia.js`, `games/trivia-data.js`, `public/trivia.js`)
- **Contenido:** 12 temas. Hay 193 preguntas escritas en 10 temas (Geografía, Historia, Ciencia, Deportes, Cine y TV, Música, Cultura general, Animales, Comida y Tecnología), más dos temas con imágenes y emojis:
  - 🚩 **Banderas:** 88 países, con imágenes en `public/flags`, del proyecto flag-icons (licencia MIT). Unas veces se ve la bandera y se elige el país; otras se da el país y se elige entre 4 banderas.
  - 🍿 **Películas con emojis:** 32 películas.
- **Ajustes del anfitrión:** temas (o "Todos"), cantidad de preguntas (10, 15, 20 o 30) y segundos por pregunta (10, 15, 20 o 30).
- **Cómo se juega:** todos responden a la vez y la respuesta correcta solo se envía al revelarla. Correcta: 10 puntos; la más rápida: +5.
- **Agregar preguntas:** se añaden líneas en `games/trivia-data.js`, con el formato `[pregunta, correcta, incorrecta, incorrecta, incorrecta]`.

## v1.15.0: Parchís / Parqués configurable (hasta 10 jugadores)
- **Tablero:** de 2 a 10 jugadores. Hasta 4 se usa el tablero clásico; de 5 a 10, un tablero con un brazo por color (10 colores).
- **Ajustes del anfitrión:**
  - cuántos juegan: todos los de la sala o un número fijo; el resto mira;
  - fichas por jugador: 2, 3 o 4;
  - dados: 1 (Parchís, se sale con 5) o 2 (Parqués, se sale con pares y cada dado mueve una ficha).
- **Menú de reglas (selección múltiple):**
  - repetir con 6 o pares;
  - tres intentos para salir;
  - cualquier par saca todas;
  - seguros;
  - comer en la salida;
  - barreras;
  - premio por comer (+20) y por coronar (+10);
  - llegada exacta;
  - tres seguidos: a la cárcel;
  - tres pares sacan (coronan) una ficha;
  - soplar;
  - robar cielo: con el número exacto desde la entrada de un rival se cae sobre su ficha en su pasillo, se la come y se corona por ese cielo.

## v1.16.0: Basta revisa las respuestas, más palabras en Garabato y mejoras al Parqués
- **✋ Basta: "Solo aceptar respuestas correctas"** (activada por defecto). Cada respuesta se marca ✅ aceptada o ❌ rechazada.
  - **Cómo revisa:** usa un diccionario del español (635 mil palabras, con plurales y conjugaciones), una lista de países y ciudades del mundo (45 mil nombres) y listas propias por categoría (`games/basta-words.js`). Las fuentes y licencias están en `games/data/FUENTES.md`.
  - **Respuestas sin sentido:** se rechazan solas, por ejemplo "Bxx" o "aaaa".
  - **Corrección por votos:** si la app rechazó una palabra válida, la mayoría la rescata con 👍; si aceptó una que no va en esa categoría, la mayoría la anula con 👎.
  - **Categorías libres:** Nombre, Apellido, Marca, Película y Artista solo revisan la letra.
- **🎨 Garabato:**
  - 40 palabras más en cada tema; "Nombres de películas" ahora es "Películas y series".
  - 5 temas nuevos: 🐾 Animales, 🍔 Comida, 👷 Profesiones, 🗺️ Lugares y 🦸 Personajes.
  - En total hay 848 palabras.
- **🎲 Parqués:** con pares y fichas ya en juego, el jugador elige entre tocar la cárcel para sacar fichas o mover cada dado con una ficha distinta. Sin pares, cada dado mueve una ficha distinta, como antes.

## v1.16.1: dos temas nuevos en Garabato
- **🏢 Cosas de la oficina:** 70 palabras, como engrapadora, reloj checador, recibo de nómina o sala de juntas.
- **🎵 Instrumentos musicales:** 70 palabras, como guitarrón, marimba, charango o güiro.

## v1.16.2: regla "Pata de perro" 🐾
- **Qué hace:** con 2 dados, si sale **2 y 1**, en lugar de avanzar una ficha retrocede 3 casillas (el jugador elige cuál).
- **Detalles:** solo retroceden las fichas que están en el circuito y que no quedan antes de su salida. Si al retroceder cae sobre un rival fuera de un seguro, se lo come. Si ninguna ficha puede retroceder, se pierde el turno.
- **Cómo activarla:** está en el menú de reglas y viene activada.

## v1.16.3: Parqués en contra de las manecillas, última ficha y soplar corregido
- **Sentido de juego:** las fichas avanzan en contra de las manecillas del reloj. El tablero se dibuja en espejo.
- **Nueva regla "Última ficha: un solo dado"** (activada): con 2 dados, cuando la última ficha de un jugador va por el pasillo del cielo, usa un solo dado y el otro no se usa.
- **Soplar corregido:** al tirar, la app anota qué fichas podían comer, con cualquiera de los dos dados o con la suma. Si al terminar de usar la tirada no comió, se sopla la ficha que pudo comer y vuelve a la cárcel. Antes solo se revisaba el dado que se usaba y se castigaba a la ficha que se movió.

## v1.16.4: botón 🌬️ Soplar
- **Cómo se sopla:** ya no es automático. Con la regla "Soplar" activada, todos ven el botón **🌬️ ¡Soplar!**. Si alguien pudo comer (con un dado o con la suma) y no lo hizo, cualquier otro jugador puede tocarlo antes de que tire el siguiente.
- **Qué revisa la app:** si es cierto, la ficha que pudo comer vuelve a la cárcel. Si no, responde "No había nada que soplar" y nadie es castigado. Nadie puede soplarse a sí mismo.

## v1.16.5: "un solo dado" automático
- **Cuándo aplica:** con 2 dados, al tirar se revisa si al jugador le queda una sola ficha, esa ficha ya está en el pasillo del cielo y le faltan 6 casillas o menos.
- **Qué hace:** si es así, solo usa un dado y el otro no cuenta (no se suman). Ya no es una opción del menú de reglas.

## v1.16.6: el segundo dado se bloquea 🔒
- **Cuándo:** con 2 dados, en cuanto la última ficha queda a 6 casillas o menos del cielo, aunque sea en medio de la misma tirada.
- **Qué pasa:** el otro dado se bloquea solo. En el historial sale "🔒 … el otro dado se bloquea" y el dado se ve con un candado.

## v1.16.7: banderas en cualquier celular y Basta sin bloqueos
- **❓ Trivia: banderas para cualquier celular.**
  - Las banderas ahora son imágenes PNG (antes SVG) y pesan la mitad.
  - La bandera de la siguiente pregunta se descarga antes.
  - Si una imagen no carga, la app reintenta y, si sigue fallando, muestra la bandera en emoji.
  - El service worker ya no devuelve la portada cuando falla una imagen.
- **✋ Basta: la app ya no bloquea palabras que no conoce.**
  - Si una palabra no está en su diccionario, se acepta igual ✅ con una nota, y la mayoría puede anularla con 👎.
  - Solo se rechazan solas las que no empiezan con la letra y las que no parecen palabra, y estas últimas se pueden rescatar con 👍.
  - Todos los votos se pueden quitar.

## v1.17.0: Basta revisa que la respuesta sea de la categoría
- **Qué revisa:** con "Solo aceptar respuestas correctas", cada respuesta debe ser de su categoría. En Animal un animal, en Color un color, en País un país o ciudad, en Profesión una profesión (también en femenino), y así con frutas y verduras, deportes, flores y plantas y comida.
- **Listas:** están en `games/data/categorias.js`, más 546 colores y 9 mil países y ciudades de más de 50 mil habitantes.
- **Si la app rechaza una que sí vale:** sale ❌ "No parece un animal" y basta un 👍 de otro jugador para aceptarla. Todo tiene reversa: si quita el 👍, vuelve a ❌.
- **Si acepta una que no vale:** la mayoría la anula con 👎.
- **Categorías libres:** Nombre, Apellido, Marca, Película y Artista solo revisan la letra; Cosa revisa que sea una palabra del español.

## v1.18.0: nuevo juego de cartas (hoy ONE) (`games/cartas.js`, `public/cartas.js`)
- **Qué es:** juego de cartas de colores, estilo clásico, para 2 a 10 jugadores con baraja de 108 cartas: números del 0 al 9, ⊘ Salta, ⇄ Reversa, +2, Comodín y Comodín +4. Cada quien ve solo sus cartas.
- **Cómo se juega:** se tira una carta del mismo color o número, o un comodín (y se elige el color). Si no puedes, robas; la carta robada se puede tirar si sirve.
- **📣 ¡Última!:** al quedarte con una carta debes tocarlo. Si se te olvida, cualquiera puede tocar 🚨 ¡Te atrapé! antes de que juegue el siguiente: robas 2 y quien atrapa gana +5.
- **Menú de reglas:** acumular +2 y +4, robar hasta poder jugar, ¡Última! obligatorio y +4 libre.
- **Turnos:** si alguien no juega en 30 s (o se desconecta), la app juega por él.
- **Puntos:** ganar +30.
- **Nombre:** se llama "¡Última!" para no usar la marca registrada "UNO".

## v1.18.1: banderas más rápidas
- **Formato:** WebP de 240×180; las 88 banderas pesan 192 KB (antes 494 KB en PNG). Si un celular no muestra WebP, usa el PNG, y si tampoco carga, el emoji.
- **Precarga:** al elegir Trivia con banderas en el lobby se descargan todas; durante "¡Prepárate!" se precargan las de la partida.
- **Caché:** el servidor las marca para guardarse 30 días y el service worker las sirve desde el celular (caché aparte que no se borra con las actualizaciones).

## v1.19.0: colores en el Parchís, sin repeticiones y el juego ONE
- **🎲 Parchís: cada jugador elige su color.** En el lobby hay 10 colores para todos, también para el anfitrión, y un color ocupado muestra el avatar de su dueño. Quien no elige recibe el primer color libre y el tablero se pinta con los colores elegidos. También se corrigió la lista de jugadores dentro de la partida, que no se veía por un id repetido.
- **No repetir:** cada sala recuerda lo que ya salió, también entre partidas. Las salas privadas lo recuerdan por dueño. Aplica a:
  - las palabras de Garabato por tema;
  - las preguntas de Trivia (cada bandera, en sus dos formas);
  - las letras de Basta.
  
  No se repite nada hasta agotar el tema. La memoria vive en el servidor y se borra si se reinicia.
- **Trivia:** 59 preguntas nuevas, 252 en total.
- **🃏 El juego de cartas ahora se llama ONE.** El botón dice "📣 ¡ONE!".

## v1.19.1: elegir dado y un solo dado al final
- **🎲 Elegir con qué dado mover primero:** con dos dados distintos, toca el que quieras usar. El elegido se marca con ✓ y el otro se ve apagado. Un aviso dice "Mueves primero con el X · toca el otro dado para cambiar".
- **🏁 Un solo dado al final:** si tu última ficha está en el pasillo del cielo a 6 casillas o menos de coronar, se tira y se muestra un solo dado. Si llegas a esa distancia a mitad de jugada, el segundo dado se bloquea.

## v1.19.2: arreglo al elegir el dado
- **🎲 Parchís:** al tocar el otro dado, la app seguía moviendo con el primero cuando el servidor guardaba los dados en otro orden (por ejemplo 6 y 5 contra 5 y 6). Ahora se mueve con el dado que marcaste con ✓.
