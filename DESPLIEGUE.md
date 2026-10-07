# Publicar Pictionary Online en internet

**Objetivo:** que cada jugador entre desde donde esté, con sus **datos móviles**, abriendo un enlace como `https://pictionary-online.onrender.com`.

Hoy la app corre en tu PC y solo funciona en tu misma red WiFi. Para jugar a distancia tiene que estar en un **servidor en internet** con dirección **https**. El https también es necesario para el micrófono y para instalar la app en el teléfono.

El proyecto ya trae todo preparado:
- `render.yaml`: configuración para Render.
- `Dockerfile`: para cualquier otro servicio.
- `/health`: dirección que usa el servidor para comprobar que la app está viva.

---

## Lo que necesitas
1. Una cuenta de **GitHub** (gratis), donde se guarda el código.
2. Una cuenta de **Render** (render.com), que es el servidor. Te registras con tu cuenta de GitHub.
3. *(Recomendado para la voz)* Una cuenta de un proveedor **TURN**, por ejemplo Metered.ca. Ver el paso 4.

### Costo aproximado
Los precios pueden cambiar; confírmalos en render.com/pricing.

| Opción | Costo | Ventajas | Desventajas |
|---|---|---|---|
| **Starter + disco 1 GB** (recomendada) | ≈ 7–8 USD/mes | Siempre encendida. Las cuentas registradas se guardan. | Tiene costo. |
| **Free** | 0 USD | Sirve para probar. | Se "duerme" tras 15 min sin uso, y el primer ingreso tarda ≈ 1 min. Las cuentas registradas **se borran** al reiniciar o actualizar. |

---

## Paso 1. Subir el proyecto a GitHub
1. Entra a **github.com** y crea tu cuenta.
2. Arriba a la derecha toca **+** y luego **New repository**.
   - Nombre: `pictionary-online`.
   - Elige **Private** para que solo tú veas el código.
   - Toca **Create repository**.
3. En la página del repositorio toca **"uploading an existing file"**.
4. Descomprime `pictionary.zip` y **arrastra todo el contenido de la carpeta `pictionary`**: los archivos y la carpeta `public`. No subas `node_modules` ni `data` si existen.
5. Toca **Commit changes**.

> 💡 Otra opción: crea el repositorio vacío, dime su nombre y **lo subo yo** desde aquí.

## Paso 2. Publicar en Render
**Opción recomendada (Starter, con disco para las cuentas):**
1. Entra a **render.com**, toca **Get Started** y regístrate con **GitHub**.
2. Toca **New +** y luego **Blueprint**.
3. Elige el repositorio `pictionary-online`. Render lee el archivo `render.yaml` y prepara todo solo.
4. Si te pide un valor para `ICE_SERVERS`, déjalo **vacío** por ahora. Se llena en el paso 4.
5. Toca **Apply** y espera de 3 a 5 minutos, hasta que diga **Live** en verde.
6. Arriba aparece tu dirección, por ejemplo `https://pictionary-online.onrender.com`. **¡Esa es la que compartes!**

**Opción gratis (para probar):**
1. Toca **New +** y luego **Web Service**, y elige el repositorio.
2. Llena estos campos:
   - **Build Command:** `npm ci --omit=dev`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
3. Toca **Create Web Service**.

## Paso 3. Jugar a distancia
1. Abre tu dirección `https://…` en el celular.
2. Entra con un **código de sala**, por ejemplo `FAMILIA`.
3. Toca 🔗 y comparte el enlace por WhatsApp. Cada quien entra desde donde esté, con WiFi o datos móviles.

La app está preparada para datos móviles:
- **Corte breve de señal (menos de 20 s):** el jugador vuelve solo y **conserva su lugar y sus puntos**.
- **El dibujante pierde la señal:** se le esperan 15 s antes de cerrar su turno.
- **Mientras no hay conexión:** aparece el aviso "📶 Reconectando…".

## Paso 4. Voz con datos móviles (servidor TURN)
Las compañías de celular suelen bloquear la conexión directa entre teléfonos. El dibujo y el chat funcionan igual, pero **la voz necesita un "relevo" llamado TURN** para pasar entre redes celulares.

1. Crea una cuenta en un proveedor TURN. **Metered.ca** tiene un plan gratuito con límite mensual de uso; Twilio y Cloudflare también ofrecen TURN.
2. En el panel del proveedor, crea una credencial TURN y copia la lista de servidores en formato JSON. Se ve así:
   ```json
   [{"urls":"stun:stun.relay.metered.ca:80"},
    {"urls":"turn:global.relay.metered.ca:80","username":"TU_USUARIO","credential":"TU_CLAVE"},
    {"urls":"turn:global.relay.metered.ca:443","username":"TU_USUARIO","credential":"TU_CLAVE"},
    {"urls":"turns:global.relay.metered.ca:443?transport=tcp","username":"TU_USUARIO","credential":"TU_CLAVE"}]
   ```
3. En Render entra a tu servicio, luego a **Environment**, y crea o edita `ICE_SERVERS`. Pega el JSON y toca **Save**. La app se reinicia sola.

## Paso 5. Instalar la app en el teléfono
1. Abre tu dirección `https://…` en el celular.
2. Toca **"📲 Instalar en mi teléfono"**:
   - **Android:** se abre el cuadro "Instalar app".
   - **iPhone:** abre la página en Safari, toca Compartir ⬆️, luego **"Agregar a inicio"**.

## Actualizar la app más adelante
Sube a GitHub los archivos que cambien y Render **se actualiza solo** en un par de minutos. Las cuentas se conservan si usas el plan con disco.

---

### Otras opciones de servidor
- **Railway (railway.app):** usa la pestaña **New Project**, luego **Deploy from GitHub repo**.
  - Agrega un **Volume** montado en `/data`.
  - Crea la variable `DATA_DIR=/data`.
- **Cualquier servidor con Docker:**
  ```bash
  docker build -t pictionary .
  docker run -p 3000:3000 -v pictionary-datos:/data pictionary
  ```
  Ponle un dominio con HTTPS, por ejemplo con Caddy o Nginx.
