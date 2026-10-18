const INITIAL_BCV_RATE = 54.5;
const INITIAL_USERS = [];
const INITIAL_MENU_ITEMS = [
  // --- PESCADOS Y ESPECIALIDADES (con tostones con queso, salsa de tomate y mayonesa, papas fritas, arepas y ensalada) ---
  {
    id: "m-pargo-crispy",
    name: "Pargo Rojo Frito Playero",
    category: "pescados",
    priceUsd: 25,
    priceExcursionUsd: 20,
    menuTarget: "all",
    waiterShareUsd: 2,
    description: "Pargo rojo entero fresco frito al punto crujiente. Servido con tostones con queso blanco rallado, salsa de tomate y mayonesa, papas fritas, arepitas fritas, ensalada fresca y lim\xF3n.",
    imageUrl: "/menu/pargo.jpg",
    estimatedMinutes: "20-25 min",
    isAvailable: true,
    tag: "Pesca del D\xEDa",
    servingSize: "~600g - 700g"
  },
  {
    id: "m-medregal",
    name: "Medregal Frito o a la Plancha",
    category: "pescados",
    priceUsd: 22,
    priceExcursionUsd: 18,
    menuTarget: "all",
    waiterShareUsd: 2,
    description: "Rueda gruesa de medregal fresco del Caribe. Acompa\xF1ado de tostones con queso blanco y salsas, papas fritas, arepitas y ensalada fresca.",
    imageUrl: "/menu/carite.jpg",
    estimatedMinutes: "20 min",
    isAvailable: true,
    tag: "Especialidad Buche",
    servingSize: "Rueda 450g"
  },
  {
    id: "m-robalo",
    name: "R\xF3balo Frito en Rueda",
    category: "pescados",
    priceUsd: 23,
    priceExcursionUsd: 19,
    menuTarget: "all",
    waiterShareUsd: 2,
    description: "Rueda de r\xF3balo fresco de carne blanca y tierna, frito al punto dorado. Con tostones con queso y salsas, papas fritas, arepitas y ensalada.",
    imageUrl: "/menu/carite.jpg",
    estimatedMinutes: "20 min",
    isAvailable: true,
    tag: "Carne Blanca Noble",
    servingSize: "Rueda 450g"
  },
  {
    id: "m-carite",
    name: "Carite Frito en Ruedas",
    category: "pescados",
    priceUsd: 20,
    priceExcursionUsd: 16,
    menuTarget: "all",
    waiterShareUsd: 1.5,
    description: "Tradicional rueda de carite fresco frito crujiente con sal marina y lim\xF3n. Servido con tostones con queso blanco rallado, salsa de tomate y mayonesa, papas fritas, arepitas y ensalada.",
    imageUrl: "/menu/carite.jpg",
    estimatedMinutes: "18 min",
    isAvailable: true,
    tag: "Tradicional Playero",
    servingSize: "Ruedas de Carite"
  },
  {
    id: "m-churrasco",
    name: "Churrasco a la Plancha",
    category: "pescados",
    priceUsd: 22,
    priceExcursionUsd: 18,
    menuTarget: "all",
    waiterShareUsd: 2,
    description: "Jugoso churrasco sellado a la plancha con hierbas arom\xE1ticas y ajo. Acompa\xF1ado de tostones con queso blanco y salsas, papas fritas, arepitas y ensalada fresca con aguacate.",
    imageUrl: "/menu/churrasco.jpg",
    estimatedMinutes: "18-20 min",
    isAvailable: true,
    tag: "A la Plancha",
    servingSize: "Corte ~400g"
  },
  {
    id: "m-nuggets",
    name: "Nuggets Playeros Crujientes",
    category: "pescados",
    priceUsd: 15,
    priceExcursionUsd: 12,
    menuTarget: "all",
    waiterShareUsd: 1.5,
    description: "Crujientes bocados empanizados de pescado o pollo. Servidos con tostones con queso blanco y salsas, papas fritas doradas, arepitas y salsa t\xE1rtara casera.",
    imageUrl: "/menu/nuggets.jpg",
    estimatedMinutes: "12-15 min",
    isAvailable: true,
    tag: "Para Toda la Familia",
    servingSize: "Bandeja completa"
  },
  // --- ALMUERZOS Y SOPAS MARINERAS ---
  {
    id: "m-sopa-pescado",
    name: "Sopa de Pescado Playera",
    category: "mariscos",
    priceUsd: 12,
    priceExcursionUsd: 10,
    menuTarget: "all",
    waiterShareUsd: 1,
    description: "Sancocho de pescado concentrado con trozos de pescado fresco, ocumo, yuca, pl\xE1tano, cilantro y lim\xF3n criollo. Acompa\xF1ado de arepitas fritas.",
    imageUrl: "/menu/sopa.jpg",
    estimatedMinutes: "15 min",
    isAvailable: true,
    tag: "Sancocho Criollo",
    servingSize: "Taz\xF3n Grande"
  },
  {
    id: "m-fosforera",
    name: "Fosforera Especial de Playa Buche",
    category: "mariscos",
    priceUsd: 18,
    priceExcursionUsd: 15,
    menuTarget: "all",
    waiterShareUsd: 1.5,
    description: "Caldo rojo concentrado de 7 mariscos: camarones, calamares, chipichipi, pulpo, cangrejo y pescado con aj\xED dulce oriental, culantro, arepitas y lim\xF3n.",
    imageUrl: "/menu/fosforera.jpg",
    estimatedMinutes: "15 min",
    isAvailable: true,
    tag: "Levanta Muertos",
    servingSize: "Taz\xF3n Marinero"
  },
  // --- CEVICHES ---
  {
    id: "m-ceviche-pescado",
    name: "Ceviche de Pescado Virgen del Valle",
    category: "mariscos",
    priceUsd: 16,
    priceExcursionUsd: 13,
    menuTarget: "all",
    waiterShareUsd: 1.5,
    description: "Dados frescos de pescado blanco marinados al momento en zumo de lima y lim\xF3n criollo, cebolla morada en pluma, aj\xED dulce y cilantro. Con tostones crujientes.",
    imageUrl: "/menu/ceviche.jpg",
    estimatedMinutes: "10 min",
    isAvailable: true,
    tag: "C\xEDtrico & Fresco",
    servingSize: "Copa / Bowl"
  },
  {
    id: "m-ceviche-mixto",
    name: "Ceviche Mixto Playero",
    category: "mariscos",
    priceUsd: 19,
    priceExcursionUsd: 16,
    menuTarget: "all",
    waiterShareUsd: 1.5,
    description: "Combinaci\xF3n fresca de dados de pescado blanco, camarones caribe\xF1os y calamares macerados en leche de tigre playera, aj\xED dulce, aguacate y tostones dorados.",
    imageUrl: "/menu/ceviche.jpg",
    estimatedMinutes: "10-12 min",
    isAvailable: true,
    tag: "Pescado & Mariscos",
    servingSize: "Copa Especial"
  },
  // --- TOSTONES ---
  {
    id: "m-tostones-normal",
    name: "Tostones Normal Playero",
    category: "entradas",
    priceUsd: 10,
    priceExcursionUsd: 8,
    menuTarget: "all",
    waiterShareUsd: 1,
    description: "Rueda de tostones dorados bien crujientes con abundante queso blanco llanero rallado, salsa de tomate y mayonesa.",
    imageUrl: "/menu/tostones.jpg",
    estimatedMinutes: "8 min",
    isAvailable: true,
    tag: "Crujientes",
    servingSize: "Raci\xF3n Normal"
  },
  {
    id: "m-tostones-full",
    name: "Tostones Full Virgen del Valle",
    category: "entradas",
    priceUsd: 14,
    priceExcursionUsd: 11,
    menuTarget: "all",
    waiterShareUsd: 1,
    description: "Bandeja grande para compartir de tostones crujientes con doble monta\xF1a de queso blanco rallado, ensalada rallada fresca, mayonesa y salsa de tomate.",
    imageUrl: "/menu/tostones.jpg",
    estimatedMinutes: "10 min",
    isAvailable: true,
    tag: "Para Compartir",
    servingSize: "Bandeja Grande"
  },
  // --- DESAYUNO: EMPANADAS PLAYERAS ---
  {
    id: "m-empanada-pescado",
    name: "Empanada de Pescado / Caz\xF3n",
    category: "entradas",
    priceUsd: 2.5,
    priceExcursionUsd: 2,
    menuTarget: "all",
    waiterShareUsd: 0.25,
    description: "Masa fina de ma\xEDz frita dorada y crujiente, rellena del aut\xE9ntico guiso playero oriental de caz\xF3n con aj\xED dulce.",
    imageUrl: "/menu/empanadas.jpg",
    estimatedMinutes: "6 min",
    isAvailable: true,
    tag: "La Reina de Buche",
    servingSize: "1 Unidad Grande"
  },
  {
    id: "m-empanada-carne",
    name: "Empanada de Carne Molida",
    category: "entradas",
    priceUsd: 2.5,
    priceExcursionUsd: 2,
    menuTarget: "all",
    waiterShareUsd: 0.25,
    description: "Empanada frita rellena de carne molida sazonada con sofrito casero tradicional venezolano.",
    imageUrl: "/menu/empanadas.jpg",
    estimatedMinutes: "6 min",
    isAvailable: true,
    tag: "Desayuno Criollo",
    servingSize: "1 Unidad Grande"
  },
  {
    id: "m-empanada-pollo",
    name: "Empanada de Pollo",
    category: "entradas",
    priceUsd: 2.5,
    priceExcursionUsd: 2,
    menuTarget: "all",
    waiterShareUsd: 0.25,
    description: "Masa crujiente rellena de jugoso pollo mechado guisado con cebolla, piment\xF3n y aj\xED dulce.",
    imageUrl: "/menu/empanadas.jpg",
    estimatedMinutes: "6 min",
    isAvailable: true,
    tag: "Pollo Mechado",
    servingSize: "1 Unidad Grande"
  },
  {
    id: "m-empanada-queso",
    name: "Empanada de Queso",
    category: "entradas",
    priceUsd: 2.5,
    priceExcursionUsd: 2,
    menuTarget: "all",
    waiterShareUsd: 0.25,
    description: "Rellena de abundante queso blanco derretido al fre\xEDr, masa crujiente dorada.",
    imageUrl: "/menu/empanadas.jpg",
    estimatedMinutes: "6 min",
    isAvailable: true,
    tag: "Queso Derretido",
    servingSize: "1 Unidad Grande"
  },
  {
    id: "m-empanada-camaron",
    name: "Empanada de Camar\xF3n",
    category: "entradas",
    priceUsd: 3.5,
    priceExcursionUsd: 3,
    menuTarget: "all",
    waiterShareUsd: 0.35,
    description: "Camarones frescos salteados en sofrito al ajillo con hierbas marinas en masa dorada crujiente.",
    imageUrl: "/menu/empanadas.jpg",
    estimatedMinutes: "6 min",
    isAvailable: true,
    tag: "Especial Marina",
    servingSize: "1 Unidad Grande"
  },
  {
    id: "m-empanada-mixta",
    name: "Empanada Mixta Playera",
    category: "entradas",
    priceUsd: 3.5,
    priceExcursionUsd: 3,
    menuTarget: "all",
    waiterShareUsd: 0.35,
    description: "Combinaci\xF3n especial al gusto: camar\xF3n con queso, caz\xF3n con queso o carne con queso.",
    imageUrl: "/menu/empanadas.jpg",
    estimatedMinutes: "6 min",
    isAvailable: true,
    tag: "Doble Relleno",
    servingSize: "1 Unidad Grande"
  },
  // --- BEBIDAS Y POSTRES ---
  {
    id: "m-coco-loco",
    name: "Coco Loco Playa Buche",
    category: "bebidas",
    priceUsd: 9.5,
    priceExcursionUsd: 7.5,
    menuTarget: "all",
    waiterShareUsd: 1,
    description: "Agua de coco natural batida con crema de coco, ron blanco venezolano, ron oscuro a\xF1ejo y un toque de canela fresca.",
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
    estimatedMinutes: "5 min",
    isAvailable: true,
    tag: "Con Ron A\xF1ejo",
    servingSize: "En Coco Natural"
  },
  {
    id: "m-papelon",
    name: "Papel\xF3n con Lim\xF3n Playero",
    category: "bebidas",
    priceUsd: 3,
    priceExcursionUsd: 2,
    menuTarget: "all",
    waiterShareUsd: 0.25,
    description: "Infusi\xF3n artesanal de panela de ca\xF1a pura con abundante zumo de limones criollos reci\xE9n exprimidos y hielo frapp\xE9.",
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
    estimatedMinutes: "3 min",
    isAvailable: true,
    tag: "Refrescante",
    servingSize: "Vaso 500ml"
  },
  {
    id: "m-balde-polar",
    name: "Balde Polar Negra / Pilsen (x6)",
    category: "bebidas",
    priceUsd: 15,
    priceExcursionUsd: 12,
    menuTarget: "all",
    waiterShareUsd: 0.5,
    description: "Cubeta galvanizada playera cargada de hielo y sal marina con 6 botellas de Polar Negra o Pilsen vestidas de novia.",
    imageUrl: "https://images.unsplash.com/photo-1608270546103-975c788df67f?auto=format&fit=crop&w=800&q=80",
    estimatedMinutes: "2 min",
    isAvailable: true,
    tag: "En Hielo",
    servingSize: "Cubeta 6 botellas"
  },
  {
    id: "m-tres-leches",
    name: "Tres Leches Costera",
    category: "postres",
    priceUsd: 7,
    priceExcursionUsd: 5,
    menuTarget: "all",
    waiterShareUsd: 0.5,
    description: "Bizcocho esponjoso sumergido en tres leches enriquecidas con leche de coco artesanal y merengue tostado al soplete.",
    imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80",
    estimatedMinutes: "Inmediato",
    isAvailable: true,
    tag: "Casero",
    servingSize: "Porci\xF3n individual"
  },
  // Platos y combos exclusivos para Excursiones y Grupos Marítimos
  {
    id: "m-combo-excursion-pargo",
    name: "Combo Almuerzo Excursi\xF3n Mar\xEDtima",
    category: "pescados",
    priceUsd: 25,
    priceExcursionUsd: 18,
    menuTarget: "excursions",
    description: "Paquete de grupo: Pescado frito o churrasco con tostones, queso y salsas, papas fritas, arepas, ensalada y bebida fr\xEDa para pasajeros.",
    imageUrl: "/menu/pargo.jpg",
    estimatedMinutes: "20 min",
    isAvailable: true,
    tag: "Exclusivo Excursi\xF3n",
    servingSize: "Plato Completo + Bebida"
  },
  {
    id: "m-picoteo-lancha",
    name: "Bandeja Picoteo Lanchas & Yates (x24)",
    category: "entradas",
    priceUsd: 40,
    priceExcursionUsd: 32,
    menuTarget: "excursions",
    description: "Surtido playero para compartir a bordo: 8 mini empanaditas de caz\xF3n, 8 tostones con queso y salsas, 8 nuggets y salsas mixtas.",
    imageUrl: "/menu/tostones.jpg",
    estimatedMinutes: "15 min",
    isAvailable: true,
    tag: "Para Lanchas",
    servingSize: "Bandeja 24 piezas"
  },
  // Plato exclusivo para toldos de playa (atención personalizada mesonero)
  {
    id: "m-vip-coctel-toldo",
    name: "Coco Loco Doble Ron Reserva Toldo VIP",
    category: "bebidas",
    priceUsd: 13.5,
    priceExcursionUsd: 13.5,
    menuTarget: "waiters",
    waiterShareUsd: 2.5,
    description: "Bebida premium servida en coco tallado al fr\xEDo con Ron Santa Teresa Gran Reserva y canela en rama servida directo a tu poltrona.",
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
    estimatedMinutes: "5 min",
    isAvailable: true,
    tag: "Exclusivo Toldo",
    servingSize: "Coco Natural Gigante"
  }
];
const INITIAL_SPOTS = [
  {
    id: "spot-14",
    number: "14",
    zone: "beach",
    name: "Toldo VIP 14",
    typeDesc: "Frente al agua \u2022 4 Poltronas",
    status: "selected",
    distanceDesc: "5m del mar",
    assignedWaiterId: "u-yender",
    assignedWaiterName: "Yender Rodr\xEDguez",
    capacity: 6
  },
  {
    id: "spot-15",
    number: "15",
    zone: "beach",
    name: "Toldo 15",
    typeDesc: "Frente al agua \u2022 Mesa de centro",
    status: "available",
    distanceDesc: "6m del mar",
    assignedWaiterId: "u-yender",
    assignedWaiterName: "Yender Rodr\xEDguez",
    capacity: 4
  },
  {
    id: "spot-12",
    number: "12",
    zone: "beach",
    name: "Toldo 12",
    typeDesc: "En servicio de mesa",
    status: "occupied",
    distanceDesc: "8m del mar",
    assignedWaiterId: "u-yender",
    assignedWaiterName: "Yender Rodr\xEDguez",
    capacity: 4
  },
  {
    id: "spot-16",
    number: "16",
    zone: "beach",
    name: "Toldo 16",
    typeDesc: "Segunda l\xEDnea de palmeras",
    status: "available",
    distanceDesc: "14m del mar",
    assignedWaiterId: "u-yender",
    assignedWaiterName: "Yender Rodr\xEDguez",
    capacity: 6
  },
  {
    id: "spot-c4",
    number: "C4",
    zone: "churuata",
    name: "Mesa Churuata 04",
    typeDesc: "Mesa madera teca \u2022 6 personas",
    status: "available",
    distanceDesc: "Bar a 8m",
    assignedWaiterId: "u-marcos",
    assignedWaiterName: "Marcos Alvarado",
    capacity: 6
  },
  {
    id: "spot-m2",
    number: "M2",
    zone: "muelle",
    name: "Muelle Posto VIP 2",
    typeDesc: "Lancha 'Do\xF1a Delia' fondeada",
    status: "occupied",
    distanceDesc: "Embarcaci\xF3n",
    assignedWaiterId: "u-keiver",
    assignedWaiterName: "Keiver Pinto",
    boatName: "Do\xF1a Delia",
    capacity: 12
  }
];
const INITIAL_ORDERS = [];
const INITIAL_EXCURSION = {
  id: "exc-morrocoy-01",
  tourCode: "TOUR-BUCHE-882",
  boatName: "Do\xF1a Delia VIP",
  captainName: "Capit\xE1n Manuel D\xEDaz",
  passengersCount: 18,
  agencyName: "Morrocoy & Buche Tours C.A.",
  braceletsColor: "Verde Ne\xF3n VIP",
  menuIncluded: "Almuerzo Marinero Pargo + Bebida + Toldo",
  departureTime: "10:30 AM",
  arrivalTime: "01:15 PM",
  estimatedServingTime: "01:45 PM",
  orderNote: "Atraque en Muelle Central Buche. Servir cuando el grupo se instale.",
  knotsSpeed: 22,
  isApproachingNotified: false,
  kdsStatus: "En Fuego (Cocci\xF3n Iniciada)",
  items: [],
  subtotalUsd: 0,
  tipPercent: 0,
  totalUsd: 0,
  isSettled: false,
  paymentPreference: "cash_usd",
  paymentStatus: "pending"
};
const INITIAL_WAITERS_CLOSINGS = [];
const INITIAL_DRAWER_BILLS = {
  d100: 0,
  d50: 0,
  d20: 0,
  d10: 0,
  d5: 0,
  d1: 0
};
const INITIAL_BANK_CONFIG = {
  pagoMovilBank: "Banesco (0134)",
  pagoMovilPhone: "0414-2394861",
  pagoMovilRif: "J-40536768-7",
  pagoMovilHolder: "INV Virgen del Valle C.A.",
  zelleEmail: "pagos@playabuche.com",
  zelleHolder: "INV Virgen del Valle C.A.",
  zelleMemoInstruction: "Colocar \xFAnicamente n\xFAmero de toldo o comanda"
};
const INITIAL_AUDIT_LOGS = [];
const INITIAL_ARENA_SUPPLIES = [];
const INITIAL_CARGO_BOAT = {
  guideNumber: "",
  boatName: "",
  captain: "",
  vhfChannel: "",
  origin: "",
  destination: "",
  travelTimeMinutes: 0,
  departureTime: "",
  estimatedArrival: "",
  status: "in_transit",
  items: []
};
const INITIAL_WASTE_REPORTS = [];
const RBAC_ROLE_DEFINITIONS = [
  {
    role: "OWNER",
    label: "Due\xF1o / Socio Administrador",
    identifier: "OWNER",
    devices: "M\xF3vil / Tablet / Desktop",
    authMethod: "Correo Corporativo + Clave Maestra + 2FA Satelital",
    permissions: [
      "Universal Full Access (CRUD en todos los m\xF3dulos)",
      "Cambio Tasa del d\xEDa con propagaci\xF3n Starlink",
      "Configuraci\xF3n Cuentas Bancarias y Pasarelas",
      "Cierre y Liquidaci\xF3n de Mesoneros",
      "Emisi\xF3n de Paz y Salvo Fiscal SHA-256",
      "Generaci\xF3n de Acta Z y Arqueo Central",
      "Auditor\xEDa y Gesti\xF3n de Personal y PINs"
    ]
  },
  {
    role: "WAITER",
    label: "Mesonero / Capit\xE1n de Playa",
    identifier: "WAITER",
    devices: "M\xF3vil PWA + Smart Band BLE",
    authMethod: "PIN Num\xE9rico de 4 D\xEDgitos asignado por Socio",
    permissions: [
      "Selecci\xF3n de Toldos y Apertura de Mesas",
      "Toma de Comandas de Playa y Env\xEDo a KDS",
      "Recepci\xF3n de Alertas H\xE1pticas (Pase de Cocina Listo)",
      "Cobro Bimonetario y Reporte de Pago M\xF3vil",
      "Reporte R\xE1pido de Mermas en Arena",
      "Revisi\xF3n de su Liquidaci\xF3n y Paz y Salvo"
    ]
  },
  {
    role: "KITCHEN",
    label: "Jefe de Cocina / KDS Master",
    identifier: "KITCHEN",
    devices: "Pantalla T\xE1ctil KDS / M\xF3vil",
    authMethod: "PIN de Estaci\xF3n (K-01 Cocina, K-02 Barra)",
    permissions: [
      "Visualizaci\xF3n KDS en Tiempo Real",
      "Pase de Cocina (En Fuego \u2794 Emplatado \u2794 Listo Pase)",
      "Calibraci\xF3n de Tiempos de Preparaci\xF3n KDS",
      "Disparo de Alerta H\xE1ptica a Smart Band de Mesonero",
      "Control de Stock de Pescados y Cavas Marinas"
    ]
  },
  {
    role: "EXCURSION_LEAD",
    label: "Coordinador de Excursiones / Muelle",
    identifier: "EXCURSION_LEAD",
    devices: "M\xF3vil Rugged / Radio VHF",
    authMethod: "PIN de Muelle / Credencial QR de Agencia",
    permissions: [
      "Manifiesto de Zarpe y Desembarque de Pasajeros",
      "Control de Brazaletes de Agencia (All-Inclusive)",
      "Pre-\xF3rdenes de Men\xFA Paquete de Lanchas",
      "Canales VHF Marina 16 / 72 Activos"
    ]
  },
  {
    role: "CLIENT",
    label: "Cliente / Comensal de Playa",
    identifier: "CLIENT",
    devices: "M\xF3vil Personal (Web / PWA)",
    authMethod: "Acceso Abierto por QR de Toldo / Invitado",
    permissions: [
      "Exploraci\xF3n de Men\xFA Gastron\xF3mico y Cocteler\xEDa",
      "C\xE1lculo Bimonetario Autom\xE1tico ($ USD / Bs. BCV)",
      "Env\xEDo de Pedidos con Localizaci\xF3n de Toldo",
      "Reporte de Comprobante Pago M\xF3vil y Zelle",
      "Seguimiento en Vivo del Estado de su Comanda",
      "Visualizaci\xF3n de Factura Fiscal Digital"
    ]
  }
];
const INITIAL_GIVEAWAY_STATE = {
  id: "sorteo-inauguracion-200",
  title: "Gran Sorteo Inaugural \xB7 Primeras 200 Personas",
  prizeTitle: "Tour VIP Todo Incluido a Playa Buche",
  prizeDescription: "\xA1Disfruta de un d\xEDa de playa de ensue\xF1o totalmente cubierto por Playa Buche e Inversiones Virgen del Valle! Incluye traslado terrestre, mar\xEDtimo, almuerzo y barra de bebidas.",
  prizeItems: [
    "\u{1F68C} Pasaje en autob\xFAs ida y vuelta completamente gratis",
    "\u{1F6A4} Traslado en lancha r\xE1pida muelle \u2194 Playa Buche ida y vuelta gratis",
    "\u{1F37D}\uFE0F Almuerzo playero completo de la casa gratis",
    "\u{1F379} Bebidas refrescantes durante todo el d\xEDa gratis"
  ],
  maxParticipants: 200,
  isActive: true,
  participants: [],
  winner: null,
  drawnAt: null
};
export {
  INITIAL_ARENA_SUPPLIES,
  INITIAL_AUDIT_LOGS,
  INITIAL_BANK_CONFIG,
  INITIAL_BCV_RATE,
  INITIAL_CARGO_BOAT,
  INITIAL_DRAWER_BILLS,
  INITIAL_EXCURSION,
  INITIAL_GIVEAWAY_STATE,
  INITIAL_MENU_ITEMS,
  INITIAL_ORDERS,
  INITIAL_SPOTS,
  INITIAL_USERS,
  INITIAL_WAITERS_CLOSINGS,
  INITIAL_WASTE_REPORTS,
  RBAC_ROLE_DEFINITIONS
};
