'use strict';

// ─── Listas de palabras para validar respuestas de Basta ─────────────────────
// Si una respuesta está en la lista de su categoría, se acepta sola (✅).
// Si no está, los demás jugadores deciden con 👍 si vale. Se ignoran
// mayúsculas, acentos y plurales sencillos. Para agregar palabras basta con
// añadirlas a la lista (separadas por comas).

const LISTS = {
  pais: `
    afganistan, albania, alemania, andorra, angola, antigua y barbuda, arabia saudita, argelia, argentina, armenia, australia, austria, azerbaiyan,
    bahamas, banglades, bangladesh, barbados, barein, belgica, belice, benin, bielorrusia, birmania, bolivia, bosnia, botsuana, brasil, brunei, bulgaria, burkina faso, burundi, butan,
    cabo verde, camboya, camerun, canada, catar, chad, chile, china, chipre, colombia, comoras, congo, corea, corea del norte, corea del sur, costa de marfil, costa rica, croacia, cuba,
    dinamarca, dominica, ecuador, egipto, el salvador, emiratos arabes unidos, eritrea, escocia, eslovaquia, eslovenia, espana, estados unidos, estonia, etiopia,
    filipinas, finlandia, fiyi, francia, gabon, gales, gambia, georgia, ghana, granada, grecia, groenlandia, guatemala, guinea, guinea ecuatorial, guyana,
    haiti, holanda, honduras, hungria, india, indonesia, inglaterra, irak, iran, irlanda, islandia, israel, italia, jamaica, japon, jordania,
    kazajistan, kenia, kirguistan, kiribati, kosovo, kuwait, laos, lesoto, letonia, libano, liberia, libia, liechtenstein, lituania, luxemburgo,
    macedonia, madagascar, malasia, malaui, maldivas, mali, malta, marruecos, mauricio, mauritania, mexico, micronesia, moldavia, monaco, mongolia, montenegro, mozambique,
    namibia, nauru, nepal, nicaragua, niger, nigeria, noruega, nueva zelanda, oman, paises bajos, pakistan, palaos, palestina, panama, papua nueva guinea, paraguay, peru, polonia, portugal, puerto rico,
    reino unido, republica checa, chequia, republica dominicana, ruanda, rumania, rusia, samoa, san marino, santa lucia, senegal, serbia, seychelles, sierra leona, singapur, siria, somalia, sri lanka, sudafrica, sudan, suecia, suiza, surinam,
    tailandia, taiwan, tanzania, tayikistan, timor oriental, togo, tonga, trinidad y tobago, tunez, turkmenistan, turquia, tuvalu, ucrania, uganda, uruguay, uzbekistan, vanuatu, vaticano, venezuela, vietnam, yemen, yibuti, zambia, zimbabue,
    acapulco, aguascalientes, amsterdam, ankara, antioquia, arequipa, armenia, asuncion, atenas, atlanta, austin,
    bagdad, baja california, bangkok, barcelona, barranquilla, beijing, pekin, belgrado, belem, berlin, berna, bilbao, bogota, boston, brasilia, bruselas, bucaramanga, bucarest, budapest, buenos aires,
    cadiz, cairo, el cairo, calcuta, cali, campeche, cancun, canberra, caracas, cartagena, casablanca, celaya, chiapas, chicago, chihuahua, ciudad de mexico, ciudad juarez, coahuila, colima, copenhague, cordoba, cucuta, cuenca, culiacan, cusco, cuzco,
    dallas, damasco, delhi, denver, detroit, dubai, dublin, durango, edimburgo, ensenada, estambul, estocolmo, florencia, florida, fortaleza, frankfurt,
    ginebra, granada, guadalajara, guanajuato, guayaquil, guerrero, hamburgo, hanoi, hermosillo, hidalgo, hong kong, houston,
    ibague, irapuato, jalisco, jerusalen, juarez, kiev, kioto, la habana, la paz, lagos, las vegas, leon, lima, lisboa, liverpool, londres, los angeles, los cabos,
    madrid, malaga, managua, manchester, manizales, maracaibo, marsella, mazatlan, medellin, melbourne, merida, mexicali, miami, michoacan, milan, monterrey, montevideo, montreal, morelia, morelos, moscu, mumbai, munich,
    nairobi, napoles, nayarit, neiva, nueva delhi, nueva york, oaxaca, orlando, osaka, oslo, ottawa,
    pachuca, palermo, pamplona, paris, pasto, pereira, perth, popayan, praga, puebla, puerto vallarta,
    queretaro, quito, rabat, recife, reynosa, riad, rio de janeiro, roma, rosario,
    salamanca, saltillo, salvador, san diego, san francisco, san jose, san juan, san luis potosi, san salvador, santa marta, santiago, santo domingo, sao paulo, sevilla, seul, shanghai, sidney, sinaloa, sonora,
    tabasco, tamaulipas, tampico, tegucigalpa, tepic, teheran, tijuana, tlaxcala, tokio, toluca, toronto, torreon, toulouse, tunja, turin,
    valencia, valladolid, valparaiso, vancouver, varsovia, venecia, veracruz, viena, villahermosa, vigo, washington, xalapa, yucatan, zacatecas, zapopan, zaragoza, zurich
  `,
  animal: `
    abeja, abejorro, aguila, ajolote, albatros, alce, alacran, alpaca, anaconda, anchoa, anguila, antilope, araña, ardilla, armadillo, atun, avestruz, avispa, ballena, babuino, bacalao, bagre, bisonte, boa, buey, buho, burro, búfalo, bufalo,
    caballo, cabra, cacatua, cachalote, caiman, calamar, camaleon, camello, canario, cangrejo, canguro, caracol, carnero, castor, cebra, cerdo, chacal, chango, chimpance, chinchilla, chinche, ciempies, ciervo, cigüeña, cisne, coati, cobra, cocodrilo, codorniz, colibri, comadreja, condor, conejo, coyote, cucaracha, cuervo, cuyo, cuy,
    delfin, dingo, dromedario, elefante, emu, erizo, escarabajo, escorpion, esponja, estrella de mar, faisan, flamenco, foca, gacela, gallina, gallo, ganso, garrapata, garza, gato, gavilan, gaviota, gorila, gorrion, grillo, guacamaya, guajolote, guepardo, gusano,
    halcon, hamster, hiena, hipopotamo, hormiga, huron, iguana, impala, jabali, jaguar, jirafa, jilguero, koala, langosta, leon, leopardo, libelula, liebre, lince, llama, lobo, lombriz, loro, luciernaga,
    mamut, manati, mandril, mantarraya, mapache, mariposa, mariquita, marmota, medusa, mono, morsa, mosca, mosquito, mula, murcielago, nutria, ñu, ñandu,
    ocelote, oruga, orca, oso, oso hormiguero, oso panda, oso polar, ostra, oveja, paloma, panda, pantera, pato, pavo, pavo real, pelicano, perico, perro, pez, pez espada, pinguino, piojo, piraña, pitón, piton, polilla, pollo, puercoespin, puerco, pulpo, puma,
    rana, rata, raton, reno, rinoceronte, ruiseñor, salamandra, salmon, saltamontes, sapo, sardina, serpiente, suricata, tapir, tarantula, tejon, tiburon, tigre, topo, toro, tortuga, trucha, tucan, urraca, vaca, venado, vibora, vicuña, yak, yegua, zancudo, zarigüeya, zopilote, zorrillo, zorro, zorzal
  `,
  fruta: `
    acelga, aceituna, aguacate, ajo, albaricoque, alcachofa, apio, arandano, arveja, berenjena, betabel, brocoli, calabacin, calabaza, camote, caña, carambola, cebolla, cereza, chabacano, chayote, champiñon, chicharo, chile, chirimoya, ciruela, coco, col, coliflor, curuba,
    durazno, ejote, elote, esparrago, espinaca, frambuesa, fresa, frijol, granada, granadilla, guanabana, guayaba, guisante, haba, higo, jicama, jitomate, kiwi, lechuga, lenteja, lima, limon, lulo,
    maiz, mamey, mandarina, mango, mangostino, manzana, maracuya, melocoton, melon, mora, nabo, naranja, nectarina, nispero, nopal, papa, papaya, patata, pepino, pera, perejil, pimiento, piña, pitahaya, pitaya, platano, pomelo, puerro,
    rabano, remolacha, repollo, rucula, sandia, tamarindo, tomate, toronja, tuna, uva, uchuva, yuca, zanahoria, zapote, zarzamora, zucchini, banana, banano, berro, cilantro, albahaca
  `,
  color: `
    aguamarina, amarillo, ambar, añil, azul, azul marino, beige, beis, blanco, bermellon, borgoña, bronce, cafe, canela, caoba, carmesi, castaño, celeste, cian, cobre, coral, crema, dorado, escarlata, esmeralda, fucsia, granate, gris, hueso,
    indigo, jade, kaki, lavanda, lila, magenta, malva, marfil, marron, morado, mostaza, naranja, negro, ocre, oro, oliva, perla, plata, plateado, purpura, rojo, rosa, rosado, salmon, sepia, terracota, turquesa, ultramar, verde, verde olivo, vino, violeta, zafiro
  `,
  deporte: `
    ajedrez, alpinismo, atletismo, automovilismo, badminton, baloncesto, basquetbol, beisbol, billar, boliche, bolos, boxeo, buceo, canotaje, carrera, ciclismo, clavados, criquet, curling, dardos, equitacion, escalada, esgrima, esqui, futbol, futbol americano, futbol rapido, futbolito,
    gimnasia, golf, halterofilia, handball, balonmano, hipismo, hockey, judo, jabalina, karate, kayak, kickboxing, kung fu, lacrosse, lucha, lucha libre, maraton, motociclismo, natacion, nado sincronizado, padel, paracaidismo, parkour, patinaje, pentatlon, pesca, ping pong, polo,
    racquetbol, rafting, remo, rugby, salto, senderismo, skate, snowboard, softbol, squash, sumo, surf, taekwondo, tenis, tenis de mesa, tiro, tiro con arco, triatlon, vela, voleibol, voley, waterpolo, windsurf, yoga, zumba
  `,
  profesion: `
    abogado, actor, actriz, administrador, agricultor, albañil, analista, arquitecto, artesano, artista, astronauta, astronomo, auditor, azafata, bailarin, banquero, barbero, barrendero, biologo, bombero, botanico, cajero, camarero, camionero, cantante, cantinero, carnicero, carpintero, cartero, chef, chofer, cientifico, cirujano, cocinero, conductor, consultor, contador, costurera, cristalero,
    dentista, deportista, detective, diseñador, doctor, ebanista, economista, editor, electricista, enfermero, entrenador, escritor, escultor, estilista, farmaceutico, filosofo, fisico, florista, fontanero, fotografo, futbolista, geografo, gerente, granjero, guardia, guia,
    herrero, historiador, ilustrador, ingeniero, investigador, jardinero, joyero, juez, lechero, leñador, locutor, maestro, mago, marinero, mecanico, medico, mensajero, mesero, militar, minero, modelo, musico, nadador, notario, nutriologo, nutricionista, obrero, odontologo, oftalmologo, optometrista,
    panadero, paramedico, payaso, peluquero, periodista, pescador, piloto, pintor, plomero, policia, politico, presidente, productor, profesor, programador, psicologo, psiquiatra, quimico, recepcionista, reportero, sastre, secretario, soldado, taxista, tecnico, traductor, vendedor, veterinario, vigilante, zapatero, zootecnista, nominista, analista de nomina
  `,
  planta: `
    acacia, agave, alcatraz, alhelí, alheli, almendro, aloe, amapola, anturio, azalea, azucena, bambu, begonia, bonsai, bugambilia, buganvilia, cactus, camelia, caña, cedro, ceiba, cempasuchil, ciprés, cipres, clavel, crisantemo, dalia, diente de leon, encino, eucalipto, flor de jamaica, fresno, gardenia, geranio, girasol, gladiola, helecho, hiedra, hortensia,
    iris, jacaranda, jazmin, lavanda, laurel, lila, lirio, loto, magnolia, malva, manzanilla, margarita, menta, musgo, narciso, nardo, noche buena, nochebuena, nogal, nopal, olivo, orquidea, ortiga, palma, palmera, pensamiento, peonia, pino, primavera, roble, romero, rosa, ruda, sabila, sauce, secuoya, tabachin, trebol, tulipan, violeta, yuca, zinnia
  `,
  comida: `
    alambre, albondigas, arepa, arroz, arroz con leche, asado, atole, bagel, barbacoa, birria, bistec, bolillo, brownie, burrito, buñuelo, cabrito, caldo, caldo de pollo, camarones, canelones, carne asada, carnitas, cereal, ceviche, chalupa, chicharron, chilaquiles, chile en nogada, chiles rellenos, chocolate, chorizo, churro, cochinita pibil, coctel, consome, crepa, croqueta, cuernito,
    donas, dona, empanada, enchiladas, ensalada, enfrijoladas, espagueti, fajitas, flan, flautas, frijoles, galleta, gelatina, gordita, guacamole, gorditas, hamburguesa, helado, hot dog, huevo, huevos rancheros, hummus, jamon, lasaña, lentejas, licuado,
    macarrones, mermelada, migas, mole, molletes, nachos, natilla, nieve, omelette, paella, palomitas, pan, pan dulce, panqueque, pastel, pasta, pay, pescado, pizza, pollo, pozole, pozol, pupusa, quesadilla, queso, ramen, ravioles, risotto,
    salchicha, sandwich, sancocho, sopa, sopes, sushi, taco, tacos, tamal, tamales, tarta, torta, tortilla, tostada, tlayuda, waffle, yogur, yogurt
  `
};

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const clip = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const SETS = {};
for (const [cat, text] of Object.entries(LISTS)) {
  SETS[cat] = new Set(text.split(',').map(clip).filter(Boolean));
}

// Diccionarios grandes (se cargan una sola vez, la primera vez que se usan):
//   palabras.txt.gz: todas las palabras del español (con plurales y conjugaciones)
//   lugares.txt.gz:  países en español y ciudades del mundo
// Las fuentes y licencias están en games/data/FUENTES.md.
const BIG = {};
function big(name) {
  if (!BIG[name]) {
    try {
      const text = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'data', `${name}.txt.gz`))).toString('utf8');
      BIG[name] = new Set(text.split('\n'));
    } catch {
      BIG[name] = new Set();
    }
  }
  return BIG[name];
}

// Cómo se revisa cada categoría:
//   place: países y ciudades · list+dict: lista propia o cualquier palabra real del español
//   dict: cualquier palabra real · (sin entrada): categoría libre (nombres, marcas, películas…)
const MODE = {
  pais: 'place',
  animal: 'list+dict', fruta: 'list+dict', color: 'list+dict', deporte: 'list+dict',
  profesion: 'list+dict', planta: 'list+dict', comida: 'list+dict',
  cosa: 'dict'
};

const variants = (base) => {
  const list = [base];
  if (base.endsWith('es')) list.push(base.slice(0, -2));
  if (base.endsWith('s')) list.push(base.slice(0, -1));
  return list;
};
const inDict = (text) => text.split(' ').every((w) => w.length < 3 || big('palabras').has(w));

// Devuelve: 'known' (la app la reconoce), 'unknown' (no la reconoce) o null (categoría libre).
function check(cat, answer) {
  const mode = MODE[cat];
  if (!mode) return null;
  const base = clip(answer).replace(/^(el|la|los|las|un|una) /, '');
  if (!base) return 'unknown';
  if (mode === 'place') {
    return variants(base).some((t) => SETS.pais.has(t) || big('lugares').has(t)) ? 'known' : 'unknown';
  }
  if (mode === 'list+dict' && variants(base).some((t) => SETS[cat].has(t))) return 'known';
  return inDict(base) ? 'known' : 'unknown';
}

// Respuestas sin sentido: sin vocales, o la misma letra repetida (p. ej. "Bxx", "aaaa").
function gibberish(answer) {
  const t = clip(answer).replace(/ /g, '');
  if (t.length < 2) return true;
  if (!/[aeiou]/.test(t)) return true;
  if (/(.)\1\1/.test(t)) return true;
  return false;
}

// Carga los diccionarios al arrancar el servidor (así la primera ronda no espera).
function preload() { big('palabras'); big('lugares'); }

module.exports = { check, gibberish, preload };
