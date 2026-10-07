# Publicar Pictionary Online en internet, 100% gratis

**Objetivo:** que cada jugador entre desde donde esté, con sus **datos móviles**, abriendo un enlace como `https://pictionary-online.onrender.com`.

El código ya está en GitHub: **https://github.com/Miguel-Mendez1737/pictionary-online**

## Las 3 piezas (todas con plan gratuito)
| Pieza | Servicio | Para qué | ¿Obligatorio? |
|---|---|---|---|
| Servidor de la app | **Render**, plan Free | El enlace `https://` para jugar desde cualquier lugar | Sí |
| Cuentas de jugadores | **Neon** (PostgreSQL gratis) | Que las cuentas no se borren | Recomendado |
| Voz con datos móviles | **Metered** (TURN gratis) | Que la voz pase entre redes celulares | Solo si usan voz |

> Los planes gratuitos pueden cambiar con el tiempo; revisa las condiciones de cada servicio al registrarte. Al momento de preparar esta guía, ninguno de los tres pedía pagar para su plan gratis.

**Lo único que hay que saber del plan gratis de Render:** si nadie usa la app por **15 minutos**, se "duerme". El siguiente que la abra esperará **cerca de 1 minuto** mientras despierta. Después funciona normal. 💡 Truco: abre el enlace un minuto antes de que empiecen a jugar.

---

## Paso 1. Base de datos gratis para las cuentas (Neon)
El plan gratis de Render borra sus archivos cada vez que se duerme. Por eso las cuentas se guardan en una base de datos aparte.

1. Entra a **https://neon.tech** y regístrate con tu cuenta de **GitHub** o Google.
2. Crea un proyecto:
   - **Nombre:** `pictionary`.
   - **Región:** la más cercana a ti, por ejemplo *US East*.
   - Toca **Create project**.
3. En el panel del proyecto busca **Connection string** (o el botón **Connect**) y **copia** la dirección. Se ve así:
   ```
   postgresql://usuario:clave@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Guárdala; la usarás en el paso 2. **No la compartas:** es la llave de tu base de datos.

> Si te saltas este paso, el juego funciona igual, pero las cuentas registradas se perderán cada vez que Render se duerma. Los jugadores pueden entrar como invitados.

## Paso 2. Publicar la app en Render (plan Free)
1. Entra a **https://render.com**, toca **Get Started** y regístrate con **GitHub**.
2. Toca **New +** y luego **Blueprint**.
3. Elige el repositorio **`pictionary-online`**. Render lee el archivo `render.yaml`, que ya está configurado con el **plan Free**.
4. Te pedirá dos valores:
   - **`DATABASE_URL`:** pega la dirección de Neon del paso 1.
   - **`ICE_SERVERS`:** escribe **`[]`** por ahora (Render no acepta el campo vacío); se cambia en el paso 4.
5. Toca **Apply** y espera de 3 a 5 minutos, hasta que diga **Live** en verde.
6. Arriba aparece tu dirección, por ejemplo `https://pictionary-online.onrender.com`. **¡Esa es la que compartes!**

> Si Render ofrece un plan de pago durante el proceso, elige siempre **Free**.

## Paso 3. Jugar a distancia
1. Abre tu dirección `https://…` en el celular. La primera vez del día puede tardar ~1 minuto.
2. Entra con un **código de sala**, por ejemplo `FAMILIA`.
3. Toca 🔗 y comparte el enlace por WhatsApp. Cada quien entra desde donde esté, con WiFi o datos móviles.

La app está preparada para datos móviles:
- **Corte breve de señal (menos de 20 s):** el jugador vuelve solo y conserva su lugar y sus puntos.
- **El dibujante pierde la señal:** se le esperan 15 s antes de cerrar su turno.
- **Mientras no hay conexión:** aparece el aviso "📶 Reconectando…".

## Paso 4. Voz con datos móviles (TURN gratis), opcional
El dibujo, el chat y los puntos funcionan sin esto. Solo hace falta si van a **hablar por voz**, porque las compañías de celular suelen bloquear la conexión directa entre teléfonos.

1. Entra a **https://www.metered.ca/stun-turn** y crea una cuenta gratuita.
2. En el panel crea una credencial TURN y copia la lista de servidores en formato JSON. Se ve así:
   ```json
   [{"urls":"stun:stun.relay.metered.ca:80"},
    {"urls":"turn:global.relay.metered.ca:80","username":"TU_USUARIO","credential":"TU_CLAVE"},
    {"urls":"turn:global.relay.metered.ca:443","username":"TU_USUARIO","credential":"TU_CLAVE"},
    {"urls":"turns:global.relay.metered.ca:443?transport=tcp","username":"TU_USUARIO","credential":"TU_CLAVE"}]
   ```
3. En Render entra a tu servicio, luego a **Environment**, y pega el JSON en `ICE_SERVERS`. Toca **Save**; la app se reinicia sola.

## Paso 5. Instalar la app en el teléfono
1. Abre tu dirección `https://…` en el celular.
2. Toca **"📲 Instalar en mi teléfono"**:
   - **Android:** se abre el cuadro "Instalar app".
   - **iPhone:** abre la página en Safari, toca Compartir ⬆️, luego **"Agregar a inicio"**.

## Actualizar la app más adelante
Cada vez que se suben cambios al repositorio de GitHub, Render **se actualiza solo** en un par de minutos. Las cuentas quedan guardadas en Neon y no se pierden.

---

### Si algún día quieres que nunca se duerma
Render tiene planes de pago (≈ 7 USD/mes). Ahí basta con cambiar `plan: free` por `plan: starter` en `render.yaml`. No es necesario para jugar con amigos.
