import { supabase } from './supabase.js';

// Lista de productos a insertar (bloque compartido por el usuario)
const productosAInsertar = [
  { nombre: 'ETORICOXIB 120 MG CAJA X 7 TABS - GENFAR', categoria: 'DOLOR Y FIEBRE' },
  { nombre: 'EVINET 0 75 MG X 2 TABS (LEVONORGESTREL) - PROCAPS', categoria: 'SALUD SEXUAL' },
  { nombre: 'Eye Zul Nafazolina 0.1% Solución Oftálmica Gotero X7 Ml', categoria: 'GOTAS' },
  { nombre: 'GAVISCON DOBLE ACCION 10 ML X 12 SOBRES -RECKITT', categoria: 'CUIDADO DIGESTIVO' },
  { nombre: 'GEL CAPILAR EGO FOR MEN ATTRACTION POTE X 110 ML - UNILEVER', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'HENOCLOX (MELOXICAM 15 MG) 10 TABLETAS', categoria: 'DOLOR Y FIEBRE' },
  { nombre: 'IBUPROFENO 800 MG X 50 TABS - GENFAR', categoria: 'DOLOR Y FIEBRE' },
  { nombre: 'IBUPROFENO KIDS 100 MG X 120 ML SUSP - GENFAR', categoria: 'DOLOR Y FIEBRE' },
  { nombre: 'IOPOVISOL (YODOPOVIDONA AL 10%) FCOA X 60 ML', categoria: 'PRIMEROS AUXILIOS' },
  { nombre: 'JABON NEKO EXTRA SUAVE X3', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'JABON QUIRURGICO ASEPTIDINA (GLUCONATO CLORHEXIDINA 4%) FCOÂ X 60 ML', categoria: 'PRIMEROS AUXILIOS' },
  { nombre: 'JABON QUIRURGICO ESPUMA (YODOPOVIDONA AL 8%) X 60 ML', categoria: 'PRIMEROS AUXILIOS' },
  { nombre: 'Limpiaderm Clotrimazol + Gentamicina + Betametasona Crema Tópica Tubo x20', categoria: 'CREMAS Y UNGUENTOS' },
  { nombre: 'LINCOMICINA 600 MG X 10 AMP- GENFAR', categoria: 'AMPOLLAS' },
  { nombre: 'LOPERAMIDA 2 MG X 240 TABS - ECAR', categoria: 'CUIDADO DIGESTIVO' },
  { nombre: 'LOSARTAN 50 MG X 30 TABS - EXPOFARMA', categoria: 'CUIDADO CARDIOVASCULAR' },
  { nombre: 'LOSARTAN 50 MG X 30 TABS - GENFAR', categoria: 'CUIDADO CARDIOVASCULAR' },
  { nombre: 'LUMBAL FORTE (NAPROXENO SODICO 550MG / CAFEINA 65 MG) X 36 TABS -LAFRANCOL', categoria: 'DOLOR Y FIEBRE' },
  { nombre: 'Metronist Metronidazol + Nistatina 500mg Caja x10 óvulos', categoria: 'SALUD SEXUAL' },
  { nombre: 'METROXAZIDE METRONIDAZOL 600MG / NIFUROXAZIDE 200 MG) X 18 TABS', categoria: 'CUIDADO DIGESTIVO' },
  { nombre: 'MIELTERTOS ANTIGRIPAL X 6 SOBRES', categoria: 'ANTIGRIPAL CUIDADO RESPIRATORIO' },
  { nombre: 'NAPROXENO 500 MG X 10 TABS - LAFRANCOL - AG', categoria: 'DOLOR Y FIEBRE' },
  { nombre: 'NOVOXICAM 15 MG X 10 TABS-NOVOFAR LAB', categoria: 'DOLOR Y FIEBRE' },
  { nombre: 'NOXPIRIN F JUNIOR X 120 ML JBE -SIEGFRIED', categoria: 'ANTIGRIPAL CUIDADO RESPIRATORIO' },
  { nombre: 'Oftalmotrimax Polimixina + Neomicina + Dexametasona Solución Oftálmica Gotero X5 Ml', categoria: 'GOTAS' },
  { nombre: 'OMEPRAZOL 20 MG X 100 CAPS - LA SANTE', categoria: 'CUIDADO DIGESTIVO' },
  { nombre: 'OMEPRAZOL 20 MG X 300 CAPS - CHINOIN', categoria: 'CUIDADO DIGESTIVO' },
  { nombre: 'Oximetazolina 0.025 % Solución Nasal-QUIBI', categoria: 'GOTAS' },
  { nombre: 'PASEDOL (DIMENHIDRINATO 50 MG) X 100 TABS - ECAR', categoria: 'CUIDADO DIGESTIVO' },
  { nombre: 'PRIVATOS X 120 ML JBE - LAFRANCOL', categoria: 'ANTIGRIPAL CUIDADO RESPIRATORIO' },
  { nombre: 'PROTECTOR SOLAR SUNDARK ADULTOS SPF 6O UVA-UVB X 12 SOBRES - PRONABELL', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'PRUEBA DE EMBARAZO CASSETTE - CHEMI', categoria: 'SALUD SEXUAL' },
  { nombre: 'Respirin Caja x 100 Capsulas', categoria: 'ANTIGRIPAL CUIDADO RESPIRATORIO' },
  { nombre: 'Desodorante Rexona Motion Sense Bamboo Roll On X30 Ml', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'Desodorante Rexona V8 Men Roll On X30 Ml', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'SALBUTAMOL (SALBUMED 100 MCG) X 200 DOSIS INHALADOR- CIPLA', categoria: 'ANTIGRIPAL CUIDADO RESPIRATORIO' },
  { nombre: 'SAVITAL CON COMPLEJO HIALURONICO Y SABILA HIDRATACION INTENSA', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'SEDA DENTAL REACH X100M', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'SHAMPOO SAVITAL CON COMPLEJO HIALURONICO Y SABILA HIDRATACION INTENSA X20 SOBRES', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'SILDENAFIL 50 MG X 2 TABS - COASPHARMA', categoria: 'SALUD SEXUAL' },
  { nombre: 'SOLUCIÓN TÓPICA ASEPTIDINA X 60ML', categoria: 'PRIMEROS AUXILIOS' },
  { nombre: 'SPEDD STICK CLINICAL 100 GR HOMBRE', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'SULFADIAZINA DE PLATA CREMA POTE X 30 GR - MEMPHIS', categoria: 'CREMAS Y UNGUENTOS' },
  { nombre: 'TALCO REXONA 48H EFFICIENT X 180 GTS TALCO X 55 GR - UNILEVER', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'TAMSULOSINA 0 4 MG X 30 CAPS - GENFAR', categoria: 'SALUD URINARIA' },
  { nombre: 'TIAMINA 300 MG X 250 TABS - ECAR', categoria: 'VITAMINAS Y SUPLEMENTOS' },
  { nombre: 'TRICLIMBAC (SOL OTICA)X 10 ML GOTAS', categoria: 'GOTAS' },
  { nombre: 'VASELINA PURA POTE X 120 GR LAB. MS CHE', categoria: 'CREMAS Y UNGUENTOS' },
  { nombre: 'VASELINA PURA POTE X 30 GR LAB. MS CHE', categoria: 'CREMAS Y UNGUENTOS' },
  { nombre: 'VASELINA PURA POTE X 60 GR LAB. MS CHE', categoria: 'CREMAS Y UNGUENTOS' },
  { nombre: 'VENOVIT 5% A D X 500 ML BOLSA - QUIBI', categoria: 'VITAMINAS Y SUPLEMENTOS' },
  { nombre: 'VITAMINA C NARANJA X 100 TABS -LA SANTE GENERICO', categoria: 'VITAMINAS Y SUPLEMENTOS' },
  { nombre: 'VITATRIOL X 5 ML GOTAS -VITALIS', categoria: 'GOTAS' },
  { nombre: 'X RAY DOL X 48 CAPS', categoria: 'DOLOR Y FIEBRE' },
  { nombre: 'X RAY DOL X 80 TABS', categoria: 'DOLOR Y FIEBRE' },
  { nombre: 'LUBRIDERM HUMECTACION DIARIA RISTRA X 6 UND X 25 ML - JOHNSON', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'PRESERVATIVO TEXTURISADO CON SABOR X 3 UND SUNSEX', categoria: 'SALUD SEXUAL' },
  { nombre: 'PRESERVATIVO PLANI LUBRICADO X 3 UND SUNSEX', categoria: 'SALUD SEXUAL' },
  { nombre: 'SEDA DENTAL YOKY ORIGINAL X 30 MTS - GIGA', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'SEDA DENTAL YOKY MENTA X 30 MTS - GIGA', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'SEDA DENTAL HAPPY TOOTH MENTA  X 20 MTS', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'COPITOS DE ALGODÓN  X 60 UND UKA', categoria: 'PRIMEROS AUXILIOS' },
  { nombre: 'LISTERINE J&J CONTROL CALCULO X 180 ML - JOHNSON', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'DEO SPEED STICK CLINICAL TUBO X 100ML', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'Protector Labial Nivea Care Strawberry Blister x4.8 g', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'PROTECTOR SOLAR SUNDARK KIDS X 12 SOBRES - PRONABELL', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'CERA EGO FOR MEN POTE 2 UNDS X 160ML PRECIO ESPECIAL - UNILEVER', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'DEO LADY SPEED STICK FLORAL GEL TUBO X 70GR', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'SAVITAL CREMA PARA PEINAR RIZOS ARGAN CAJA X 20 SACHET X 22 ML', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'CREMA DENTAL COLGATE TRIPLE ACCION X 75 ML', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'JABON NEKO EXTRA SUAVE X 110 GR X 3 UND - JOHNSON', categoria: 'CUIDADO PERSONAL' },
  { nombre: 'CALZAS DOLPACK BENZOCAINA 2,5G /ANTIPIRINA 3GR SOL. TOPICA FC X 8 ML', categoria: 'GOTAS' },
  { nombre: 'NAPROFLASH (NAPROXENO 250 MG) X 36 CAPS - NOVAMED', categoria: 'DOLOR Y FIEBRE' },
  { nombre: 'CRONOFEN (ACETAMINOFEN) X 100 ML JBE NIÑOS - NOVAMED', categoria: 'DOLOR Y FIEBRE' },
  { nombre: 'DOLEX AVANZADO 500 MG CAJA X 100 - HALEON', categoria: 'DOLOR Y FIEBRE' },
  { nombre: 'ISEPTIC GARGANTA FRUTOS ROJOS ( BENZOCAINA 10 MG / CETILPIRIDINIO 1,4 MG ) X 96 TABS MASTICABLES - COASPHARMA', categoria: 'ANTIGRIPAL CUIDADO RESPIRATORIO' },
  { nombre: 'ISEPTIC GARGANTA MENTA ( BENZOCAINA 10 MG / CETILPIRIDINIO 1,4 MG ) X 96 TABS MASTICABLES - COASPHARMA', categoria: 'ANTIGRIPAL CUIDADO RESPIRATORIO' },
  { nombre: 'Gentavisión Oftalmica 0.003 Gotas x10 ml-VITALIS', categoria: 'GOTAS' },
  { nombre: 'CRONOFEN (ACETAMINOFEN 500 MG ) X 400 TABS - NOVAMED', categoria: 'DOLOR Y FIEBRE' },
  { nombre: 'NITAZOXANIDA 500 MG X 6 TABS RECUBIERTAS - QUIRUPOS', categoria: 'CUIDADO DIGESTIVO' },
  { nombre: 'TRIMEBUTINA 200 MG X 20 TABS - COASPHARMA', categoria: 'CUIDADO DIGESTIVO' },
  { nombre: 'ALBENDAZOL 4% X 10 ML SUSP -COASPHARMA', categoria: 'CUIDADO DIGESTIVO' },
  { nombre: 'AZITROMICINA 500 MG CAJA X 3 TABS- MEMPHIS', categoria: 'ANTIBIOTICOS' },
  { nombre: 'AZITROMICINA 500 MG CAJA X 3 TABS- DELTA', categoria: 'ANTIBIOTICOS' },
  { nombre: 'ACICLOVIR 800MG X 10 ALVIRET- HETERO', categoria: 'ANTIBIOTICOS' },
  { nombre: 'TROSIFEN (IBUPROFENO 100 MG - 5 ML) X 120 ML SUSP - COASPHARMA', categoria: 'DOLOR Y FIEBRE' },
  { nombre: 'DESLORATADINA X 10 TABS - COASPHARMA', categoria: 'ANTIGRIPAL CUIDADO RESPIRATORIO' },
  { nombre: 'BETAMETASONA 0 1% X 20 GR CREMA - VITALIS', categoria: 'CREMAS Y UNGUENTOS' },
  { nombre: 'ACIDO FUSIDICO 2% X 15 GR CREMA - COASPHARM', categoria: 'CREMAS Y UNGUENTOS' },
  { nombre: 'Betametasona Crema 0.1% X 40 Gr - LAPROFF', categoria: 'CREMAS Y UNGUENTOS' },
  { nombre: 'CLOTRIMAZOL VAGINALCREMA AL 2% CREMA VAGINAL X 3 APLICADORES - MEMPHIS', categoria: 'CREMAS Y UNGUENTOS' },
  { nombre: 'Betametasona Ag 0.5% Crema Tópica Tubo X20 G- AG', categoria: 'CREMAS Y UNGUENTOS' },
  { nombre: 'CLOTRIMAZOL 1% X 40 GR CREMA VAG - COASPHARMA', categoria: 'CREMAS Y UNGUENTOS' },
  { nombre: 'PROPOLEO ADULTOS JBE X 120 ML-LG PHARMA', categoria: 'ANTIGRIPAL CUIDADO RESPIRATORIO' },
  { nombre: 'PROPOLEO NINOS JBE X 120 ML- LG PHATMA', categoria: 'ANTIGRIPAL CUIDADO RESPIRATORIO' },
  { nombre: 'CETIRIZINA 10MG CAJA x 10 TABS - MEMPHIS', categoria: 'ANTIGRIPAL CUIDADO RESPIRATORIO' },
  { nombre: 'MIELTERTOS X 12 SOBRES X 4 PASTILLAS - NATURAL FRESHLY', categoria: 'ANTIGRIPAL CUIDADO RESPIRATORIO' },
  { nombre: 'MIELTERTOS DIA PANELA-NARANJA X 6 SOBRES X 15GR -NATURAL FRESHLY', categoria: 'ANTIGRIPAL CUIDADO RESPIRATORIO' },
  { nombre: 'TERMOMETRO DIGITAL RIGIDO - ALFA TRADING', categoria: 'PRIMEROS AUXILIOS' },
  { nombre: 'Venda Alfasafe Elastica Piel 6Inx5 Yd Rollo X450 Cm', categoria: 'PRIMEROS AUXILIOS' }
];

function normalizarTexto(texto = '') {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function truncarNombre(nombre = '', max = 100) {
  if (nombre.length <= max) return nombre;
  return nombre.slice(0, max).trim();
}

async function insertarProductos() {
  try {
    // Mapa de categorías canónicas para guardar en la tabla productos.
    const aliasCategorias = {
      'DOLOR Y FIEBRE': 'Dolor y Fiebre',
      'ANTIBIOTICOS': 'Antibióticos',
      'CUIDADO DIGESTIVO': 'Cuidado Digestivo',
      'VITAMINAS Y SUPLEMENTOS': 'Vitaminas y Suplementos',
      'CREMAS Y UNGUENTOS': 'Cremas y Unguentos',
      'AMPOLLAS': 'Ampollas',
      'GOTAS': 'Gotas',
      'CUIDADO CARDIOVASCULAR': 'Cuidado Cardiovascular',
      'SALUD URINARIA': 'Salud Urinaria',
      'SALUD SEXUAL': 'Salud Sexual',
      'PRIMEROS AUXILIOS': 'Primeros Auxilios',
      'CUIDADO PERSONAL': 'Cuidado Personal',
      'ANTIGRIPAL CUIDADO RESPIRATORIO': 'Antigripal Cuidado Respiratorio'
    };

    // Obtener productos existentes para evitar duplicados por nombre exacto
    const existentesResp = await supabase
      .from('productos')
      .select('nombre');

    if (existentesResp.error) {
      throw new Error(`No se pudieron obtener productos existentes: ${existentesResp.error.message}`);
    }

    const nombresExistentes = new Set((existentesResp.data || []).map(p => p.nombre));

    let insertados = 0;
    let errores = 0;

    for (const producto of productosAInsertar) {
      try {
        const nombreFinal = truncarNombre(producto.nombre, 100);

        if (nombreFinal !== producto.nombre) {
          console.log(`⚠️ Nombre truncado a 100 chars: "${producto.nombre}" -> "${nombreFinal}"`);
        }

        if (nombresExistentes.has(nombreFinal)) {
          console.log(`⏭️ Ya existe, se omite: "${nombreFinal}"`);
          continue;
        }

        const categoriaNormalizada = normalizarTexto(producto.categoria || '');
        const categoriaCanonica = aliasCategorias[categoriaNormalizada];

        if (!categoriaCanonica) {
          console.error(`❌ Categoría "${producto.categoria}" no encontrada para producto "${producto.nombre}"`);
          errores++;
          continue;
        }

        const { data, error } = await supabase
          .from('productos')
          .insert([{
            nombre: nombreFinal,
            codigo: null,
            categoria: categoriaCanonica,
            precio: 0, // Valor por defecto
            stock: 0,  // Valor por defecto
            activo: true,
            descripcion: null,
            imagen_url: null,
            imagen_public_id: null
          }])
          .select();

        if (error) {
          console.error(`❌ Error insertando "${producto.nombre}":`, error.message);
          errores++;
        } else {
          console.log(`✅ Insertado: "${nombreFinal}" en categoría "${producto.categoria}"`);
          insertados++;
          nombresExistentes.add(nombreFinal);
        }
      } catch (err) {
        console.error(`❌ Error procesando "${producto.nombre}":`, err.message);
        errores++;
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`✅ Productos insertados: ${insertados}`);
    console.log(`❌ Errores: ${errores}`);

  } catch (error) {
    console.error('Error general:', error.message);
  }
}

// Ejecutar el script
insertarProductos();