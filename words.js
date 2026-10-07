// Banco de palabras por tema. La ruleta toma sus casillas del tema elegido.
// Cada tema tiene 60 palabras: con el máximo de 12 jugadores y 5 rondas
// (60 turnos) ninguna palabra se repite en una misma partida.
// Para agregar un tema nuevo basta con añadir una entrada a este objeto:
// aparecerá automáticamente en el menú del lobby. "colors" son los dos
// colores con los que se pinta la interfaz cuando se juega ese tema.
module.exports = {
  peliculas: {
    label: 'Nombres de películas',
    emoji: '🎬',
    colors: ['#e03131', '#f59f00'], // colores de la interfaz con este tema
    words: [
      'Titanic', 'Avatar', 'El Rey León', 'Toy Story', 'Buscando a Nemo',
      'Jurassic Park', 'Harry Potter', 'Star Wars', 'Frozen', 'Shrek',
      'Coco', 'Batman', 'Spiderman', 'Tiburón', 'El Padrino',
      'Matrix', 'Los Increíbles', 'Ratatouille', 'Up', 'Cars',
      'Piratas del Caribe', 'El Señor de los Anillos', 'King Kong', 'Gladiador', 'Rocky',
      'Volver al Futuro', 'Intensamente', 'Aladdín', 'La Sirenita', 'Superman',
      'ET el Extraterrestre', 'Godzilla', 'Madagascar', 'Kung Fu Panda', 'Monsters Inc',
      'Mi Villano Favorito', 'Minions', 'Encanto', 'Moana', 'Mulán',
      'La Bella y la Bestia', 'Cenicienta', 'Blancanieves', 'Pinocho', 'Dumbo',
      'Bambi', 'Hércules', 'Tarzán', 'Rapunzel', 'Valiente',
      'Wall-E', 'Zootopia', 'Avengers', 'Iron Man', 'Indiana Jones',
      'Karate Kid', 'Los Cazafantasmas', 'Mi Pobre Angelito', 'Lilo y Stitch', 'El Grinch'
    ]
  },
  verbos: {
    label: 'Verbos',
    emoji: '🏃',
    colors: ['#0ca678', '#1c7ed6'], // colores de la interfaz con este tema
    words: [
      'Correr', 'Saltar', 'Nadar', 'Cocinar', 'Dormir',
      'Bailar', 'Cantar', 'Leer', 'Escribir', 'Pintar',
      'Volar', 'Llorar', 'Reír', 'Comer', 'Beber',
      'Pescar', 'Barrer', 'Escalar', 'Conducir', 'Abrazar',
      'Estornudar', 'Bostezar', 'Gritar', 'Patinar', 'Esquiar',
      'Lavar', 'Planchar', 'Silbar', 'Empujar', 'Besar',
      'Caminar', 'Gatear', 'Aplaudir', 'Cavar', 'Cortar',
      'Coser', 'Tejer', 'Dibujar', 'Fotografiar', 'Llamar',
      'Escuchar', 'Mirar', 'Oler', 'Lanzar', 'Atrapar',
      'Patear', 'Rezar', 'Soñar', 'Pensar', 'Peinar',
      'Afeitar', 'Remar', 'Bucear', 'Surfear', 'Votar',
      'Construir', 'Sembrar', 'Saludar', 'Tropezar', 'Toser'
    ]
  },
  acciones: {
    label: 'Acciones',
    emoji: '🎯',
    colors: ['#f76707', '#e64980'], // colores de la interfaz con este tema
    words: [
      'Lavarse los dientes', 'Atarse los zapatos', 'Pasear al perro', 'Tomar una foto', 'Andar en bicicleta',
      'Hacer fila', 'Cambiar una llanta', 'Pedir un taxi', 'Jugar al fútbol', 'Regar las plantas',
      'Hacer ejercicio', 'Tocar la guitarra', 'Lanzar una pelota', 'Abrir un regalo', 'Soplar las velas',
      'Hacer una llamada', 'Montar a caballo', 'Construir un castillo de arena', 'Volar una cometa', 'Subir una escalera',
      'Tender la cama', 'Hacer malabares', 'Cortar el césped', 'Inflar un globo', 'Pescar un pez',
      'Cepillarse el pelo', 'Tomar café', 'Leer el periódico', 'Ver la televisión', 'Lavar los platos',
      'Sacar la basura', 'Planchar la ropa', 'Bañar al perro', 'Hornear un pastel', 'Comer palomitas',
      'Tomar el autobús', 'Cruzar la calle', 'Hacer un muñeco de nieve', 'Tirarse a la piscina', 'Acampar en el bosque',
      'Encender una fogata', 'Subir a la montaña rusa', 'Jugar a las cartas', 'Armar un rompecabezas', 'Pintar una pared',
      'Cambiar un foco', 'Pagar la cuenta', 'Hacer yoga', 'Levantar pesas', 'Correr un maratón',
      'Saltar la cuerda', 'Jugar al escondite', 'Tocar el timbre', 'Abrir un paraguas', 'Atrapar una mariposa',
      'Dar un discurso', 'Ordeñar una vaca', 'Esperar el ascensor', 'Hacer una pizza', 'Ponerse un sombrero'
    ]
  },
  deportes: {
    label: 'Deportes',
    emoji: '⚽',
    colors: ['#2b8a3e', '#f08c00'], // colores de la interfaz con este tema
    words: [
      'Fútbol', 'Básquetbol', 'Béisbol', 'Tenis', 'Natación',
      'Ciclismo', 'Boxeo', 'Golf', 'Voleibol', 'Atletismo',
      'Karate', 'Esgrima', 'Surf', 'Esquí', 'Patinaje',
      'Gimnasia', 'Rugby', 'Hockey', 'Ping pong', 'Bádminton',
      'Escalada', 'Remo', 'Lucha libre', 'Clavados', 'Maratón',
      'Salto de longitud', 'Salto con garrocha', 'Lanzamiento de jabalina', 'Levantamiento de pesas', 'Tiro con arco',
      'Equitación', 'Fútbol americano', 'Balonmano', 'Waterpolo', 'Triatlón',
      'Patineta', 'Snowboard', 'Motocross', 'Fórmula 1', 'Ajedrez',
      'Billar', 'Boliche', 'Dardos', 'Paracaidismo', 'Kayak',
      'Regata', 'Taekwondo', 'Judo', 'Sumo', 'Frontón',
      'Carrera de relevos', 'Medalla de oro', 'Portero', 'Árbitro', 'Trofeo',
      'Silbato', 'Raqueta', 'Canasta', 'Penal', 'Gol'
    ]
  },
  objetos: {
    label: 'Objetos cotidianos',
    emoji: '🏠',
    colors: ['#1c7ed6', '#7048e8'], // colores de la interfaz con este tema
    words: [
      'Silla', 'Reloj', 'Lámpara', 'Tijeras', 'Paraguas',
      'Llave', 'Taza', 'Cuchara', 'Teléfono', 'Gafas',
      'Cepillo de dientes', 'Mochila', 'Bombilla', 'Martillo', 'Escoba',
      'Almohada', 'Peine', 'Televisor', 'Refrigerador', 'Lápiz',
      'Calcetín', 'Botella', 'Sartén', 'Control remoto', 'Vela',
      'Billetera', 'Toalla', 'Espejo', 'Enchufe', 'Zapato',
      'Mesa', 'Cama', 'Puerta', 'Ventana', 'Libro',
      'Computadora', 'Audífonos', 'Cámara', 'Bicicleta', 'Guitarra',
      'Plato', 'Tenedor', 'Cuchillo', 'Olla', 'Licuadora',
      'Microondas', 'Lavadora', 'Ventilador', 'Sombrero', 'Bufanda',
      'Guantes', 'Cinturón', 'Anillo', 'Maleta', 'Candado',
      'Tornillo', 'Escalera', 'Jabón', 'Calculadora', 'Globo'
    ]
  }
};
