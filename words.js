// Banco de palabras por tema. La ruleta toma sus casillas del tema elegido.
// Cada tema tiene al menos 60 palabras: con el máximo de 12 jugadores y
// 5 rondas (60 turnos) ninguna palabra se repite en una misma partida.
// Para agregar un tema nuevo basta con añadir una entrada a este objeto:
// aparecerá automáticamente en el menú del lobby. "colors" son los dos
// colores con los que se pinta la interfaz cuando se juega ese tema.
module.exports = {
  peliculas: {
    label: 'Películas y series',
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
      'Karate Kid', 'Los Cazafantasmas', 'Mi Pobre Angelito', 'Lilo y Stitch', 'El Grinch',
      'Los Simpson', 'Friends', 'Stranger Things', 'El Chavo del 8', 'Bob Esponja',
      'Breaking Bad', 'La Casa de Papel', 'Game of Thrones', 'Merlina', 'El Juego del Calamar',
      'Dragon Ball', 'Pokémon', 'Scooby-Doo', 'Tom y Jerry', 'Los Picapiedra',
      'La Pantera Rosa', 'Plaza Sésamo', 'Betty la Fea', 'El Chapulín Colorado', 'Rebelde',
      'Jumanji', 'Mary Poppins', 'El Mago de Oz', 'Los Pitufos', 'Ghost',
      'Rápidos y Furiosos', 'Misión Imposible', 'Terminador', 'Alien', 'Barbie',
      'Oppenheimer', 'Top Gun', 'Black Panther', 'Spider-Verse', 'Los Vengadores',
      'Garfield', 'Pato Donald', 'Mickey Mouse', 'Peter Pan', 'El Libro de la Selva'
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
      'Construir', 'Sembrar', 'Saludar', 'Tropezar', 'Toser',
      'Abrir', 'Cerrar', 'Subir', 'Bajar', 'Empacar',
      'Regar', 'Martillar', 'Serruchar', 'Taladrar', 'Maquillar',
      'Jugar', 'Ganar', 'Perder', 'Esconder', 'Buscar',
      'Encontrar', 'Tocar', 'Golpear', 'Morder', 'Masticar',
      'Tragar', 'Escupir', 'Soplar', 'Aspirar', 'Exprimir',
      'Mezclar', 'Hornear', 'Freír', 'Hervir', 'Congelar',
      'Derretir', 'Encender', 'Apagar', 'Enchufar', 'Rascar',
      'Estirarse', 'Arrodillarse', 'Temblar', 'Sudar', 'Despertar'
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
      'Dar un discurso', 'Ordeñar una vaca', 'Esperar el ascensor', 'Hacer una pizza', 'Ponerse un sombrero',
      'Hacer la tarea', 'Cargar el celular', 'Tomar una selfie', 'Mandar un mensaje', 'Ir al cine',
      'Comprar en el súper', 'Cobrar la quincena', 'Firmar un contrato', 'Hacer una videollamada', 'Imprimir un documento',
      'Tomar el metro', 'Esperar el camión', 'Cantar en la regadera', 'Hacer una carne asada', 'Romper una piñata',
      'Bailar salsa', 'Jugar videojuegos', 'Ver el partido', 'Hacer una fiesta sorpresa', 'Ir al dentista',
      'Ponerse una inyección', 'Pedir comida a domicilio', 'Hacer la maleta', 'Volar en avión', 'Hacer surf',
      'Montar en elefante', 'Ordenar el clóset', 'Colgar un cuadro', 'Pintarse las uñas', 'Rasurarse la barba',
      'Hacer una trenza', 'Tejer una bufanda', 'Lavar el carro', 'Estacionar el carro', 'Echar gasolina',
      'Ver las estrellas', 'Hacer un brindis', 'Bailar en una boda', 'Dar un abrazo'
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
      'Silbato', 'Raqueta', 'Canasta', 'Penal', 'Gol',
      'Rafting', 'Parapente', 'Buceo', 'Pesca deportiva', 'Senderismo',
      'Spinning', 'Zumba', 'Crossfit', 'Pádel', 'Squash',
      'Polo', 'Críquet', 'Lacrosse', 'Curling', 'Bobsleigh',
      'Salto de esquí', 'Patinaje artístico', 'Nado sincronizado', 'Pentatlón', 'Decatlón',
      'Lanzamiento de bala', 'Lanzamiento de disco', 'Salto de altura', 'Vallas', 'Carrera de caballos',
      'Rodeo', 'Charrería', 'Tauromaquia', 'Kickboxing', 'Muay thai',
      'Capoeira', 'Parkour', 'BMX', 'Ciclismo de montaña', 'Vela',
      'Windsurf', 'Kitesurf', 'Esquí acuático', 'Uniforme', 'Estadio'
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
      'Tornillo', 'Escalera', 'Jabón', 'Calculadora', 'Globo',
      'Sacapuntas', 'Borrador', 'Engrapadora', 'Clip', 'Cuaderno',
      'Regla', 'Pegamento', 'Cinta adhesiva', 'Sobre', 'Estampilla',
      'Perchero', 'Gancho de ropa', 'Plancha', 'Tostadora', 'Cafetera',
      'Batidora', 'Exprimidor', 'Colador', 'Rallador', 'Abrelatas',
      'Destapador', 'Termo', 'Lonchera', 'Florero', 'Maceta',
      'Regadera', 'Manguera', 'Carretilla', 'Pala', 'Rastrillo',
      'Linterna', 'Pila', 'Cargador', 'Memoria USB', 'Teclado',
      'Mouse', 'Impresora', 'Bocina', 'Despertador', 'Cortina'
    ]
  },
  animales: {
    label: 'Animales',
    emoji: '🐾',
    colors: ['#2f9e44', '#e8590c'], // colores de la interfaz con este tema
    words: [
      'Perro', 'Gato', 'Elefante', 'Jirafa', 'León',
      'Tigre', 'Mono', 'Cebra', 'Caballo', 'Vaca',
      'Cerdo', 'Oveja', 'Gallina', 'Pato', 'Conejo',
      'Tortuga', 'Serpiente', 'Cocodrilo', 'Rana', 'Pez',
      'Tiburón', 'Ballena', 'Delfín', 'Pulpo', 'Cangrejo',
      'Medusa', 'Pingüino', 'Oso polar', 'Panda', 'Koala',
      'Canguro', 'Camello', 'Hipopótamo', 'Rinoceronte', 'Murciélago',
      'Búho', 'Águila', 'Loro', 'Flamenco', 'Pavo real',
      'Colibrí', 'Abeja', 'Mariposa', 'Hormiga', 'Araña',
      'Caracol', 'Lombriz', 'Mosquito', 'Catarina', 'Ardilla',
      'Ratón', 'Hámster', 'Erizo', 'Zorro', 'Lobo',
      'Ciervo', 'Alce', 'Mapache', 'Zorrillo', 'Castor',
      'Foca', 'Morsa', 'Avestruz', 'Burro', 'Ajolote',
      'Iguana', 'Camaleón', 'Gorila', 'Dinosaurio'
    ]
  },
  comida: {
    label: 'Comida',
    emoji: '🍔',
    colors: ['#f08c00', '#e03131'], // colores de la interfaz con este tema
    words: [
      'Pizza', 'Hamburguesa', 'Hot dog', 'Tacos', 'Burrito',
      'Quesadilla', 'Enchiladas', 'Tamales', 'Pozole', 'Guacamole',
      'Nachos', 'Sushi', 'Espagueti', 'Lasaña', 'Sopa',
      'Ensalada', 'Huevo frito', 'Hot cakes', 'Waffles', 'Cereal',
      'Sándwich', 'Torta', 'Empanada', 'Arepa', 'Paella',
      'Ceviche', 'Pollo asado', 'Costillas', 'Papas fritas', 'Palomitas',
      'Helado', 'Pastel', 'Galletas', 'Dona', 'Churros',
      'Flan', 'Gelatina', 'Chocolate', 'Paleta', 'Algodón de azúcar',
      'Manzana', 'Plátano', 'Sandía', 'Piña', 'Uvas',
      'Fresa', 'Naranja', 'Limón', 'Aguacate', 'Zanahoria',
      'Elote', 'Brócoli', 'Pan', 'Queso', 'Leche',
      'Café', 'Jugo', 'Refresco', 'Agua de horchata', 'Taco al pastor',
      'Chiles en nogada', 'Mole', 'Concha', 'Bolillo', 'Croissant',
      'Pay de queso', 'Brownie', 'Malteada', 'Licuado', 'Coctel de camarón'
    ]
  },
  profesiones: {
    label: 'Profesiones',
    emoji: '👷',
    colors: ['#1971c2', '#f59f00'], // colores de la interfaz con este tema
    words: [
      'Doctor', 'Enfermera', 'Dentista', 'Bombero', 'Policía',
      'Maestro', 'Cocinero', 'Mesero', 'Piloto', 'Azafata',
      'Astronauta', 'Bailarina', 'Cantante', 'Pintor', 'Fotógrafo',
      'Carpintero', 'Plomero', 'Electricista', 'Mecánico', 'Albañil',
      'Arquitecto', 'Ingeniero', 'Abogado', 'Juez', 'Contador',
      'Nominista', 'Secretaria', 'Cajero', 'Cartero', 'Taxista',
      'Chofer de camión', 'Granjero', 'Pescador', 'Jardinero', 'Panadero',
      'Carnicero', 'Peluquero', 'Sastre', 'Zapatero', 'Veterinario',
      'Científico', 'Programador', 'Diseñador', 'Periodista', 'Reportero del clima',
      'Locutor', 'Actor', 'Payaso', 'Mago', 'Malabarista',
      'Futbolista', 'Árbitro', 'Salvavidas', 'Soldado', 'Marinero',
      'Detective', 'Espía', 'Guardia de seguridad', 'Barrendero', 'Minero',
      'Leñador', 'Vaquero', 'Pirata', 'Rey', 'Reina',
      'Presidente', 'Youtuber', 'Influencer', 'Repartidor', 'Recepcionista'
    ]
  },
  lugares: {
    label: 'Lugares',
    emoji: '🗺️',
    colors: ['#0c8599', '#7048e8'], // colores de la interfaz con este tema
    words: [
      'Playa', 'Montaña', 'Volcán', 'Desierto', 'Selva',
      'Bosque', 'Cascada', 'Lago', 'Río', 'Isla',
      'Cueva', 'Granja', 'Zoológico', 'Acuario', 'Museo',
      'Cine', 'Teatro', 'Estadio', 'Gimnasio', 'Hospital',
      'Escuela', 'Universidad', 'Biblioteca', 'Supermercado', 'Mercado',
      'Panadería', 'Farmacia', 'Banco', 'Oficina', 'Fábrica',
      'Aeropuerto', 'Estación de tren', 'Puerto', 'Gasolinera', 'Restaurante',
      'Hotel', 'Parque de diversiones', 'Circo', 'Iglesia', 'Castillo',
      'Pirámide', 'Torre Eiffel', 'Estatua de la Libertad', 'Gran Muralla China', 'Machu Picchu',
      'Chichén Itzá', 'Coliseo romano', 'Polo Norte', 'Luna', 'Espacio',
      'Faro', 'Puente', 'Túnel', 'Rascacielos', 'Casa del árbol',
      'Iglú', 'Cárcel', 'Cementerio', 'Peluquería', 'Lavandería',
      'Alberca', 'Jardín', 'Cocina', 'Baño', 'Recámara',
      'Sala', 'Elevador', 'Azotea', 'Estacionamiento', 'Plaza'
    ]
  },
  personajes: {
    label: 'Personajes',
    emoji: '🦸',
    colors: ['#c2255c', '#1c7ed6'], // colores de la interfaz con este tema
    words: [
      'Superman', 'Batman', 'Spiderman', 'La Mujer Maravilla', 'Hulk',
      'Iron Man', 'Capitán América', 'Thor', 'Flash', 'Aquaman',
      'Wolverine', 'Mickey Mouse', 'Minnie Mouse', 'Pato Donald', 'Goofy',
      'Bugs Bunny', 'Pikachu', 'Mario Bros', 'Sonic', 'Pac-Man',
      'Bob Esponja', 'Patricio', 'Homero Simpson', 'Bart Simpson', 'Shrek',
      'Burro', 'Buzz Lightyear', 'Woody', 'Nemo', 'Dory',
      'Elsa', 'Olaf', 'Simba', 'Stitch', 'Winnie Pooh',
      'Pinocho', 'Peter Pan', 'Campanita', 'Blancanieves', 'Cenicienta',
      'Caperucita Roja', 'El lobo feroz', 'Santa Claus', 'Los Reyes Magos', 'El conejo de Pascua',
      'Drácula', 'Frankenstein', 'La Momia', 'Un fantasma', 'Una bruja',
      'Un vampiro', 'Un zombi', 'Un extraterrestre', 'Un robot', 'Una sirena',
      'Un unicornio', 'Un dragón', 'Un ninja', 'Un pirata', 'Un caballero',
      'Una princesa', 'El Chavo del 8', 'La Chilindrina', 'El Chapulín Colorado', 'Goku',
      'Naruto', 'Harry Potter', 'Darth Vader', 'Yoda', 'El Grinch'
    ]
  }
};
