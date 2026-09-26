export interface Municipio {
  nombre: string;
  parroquias: string[];
}

export interface EstadoVenezuela {
  estado: string;
  municipios: Municipio[];
}

export const VENEZUELA_LOCATIONS: EstadoVenezuela[] = [
  {
    estado: 'Distrito Capital',
    municipios: [
      {
        nombre: 'Libertador',
        parroquias: [
          'Altagracia',
          'Antímano',
          'Candelaria',
          'Caricuao',
          'Catedral',
          'Coche',
          'El Junquito',
          'El Paraíso',
          'El Recreo',
          'El Valle',
          'La Pastora',
          'La Vega',
          'Macarao',
          'San Agustín',
          'San Bernardino',
          'San José',
          'San Juan',
          'San Pedro',
          'Santa Rosalía',
          'Santa Teresa',
          'Sucre (Catia)',
          '23 de Enero',
        ],
      },
    ],
  },
  {
    estado: 'Miranda',
    municipios: [
      {
        nombre: 'Baruta',
        parroquias: ['Baruta', 'El Cafetal', 'Las Minas de Baruta'],
      },
      {
        nombre: 'Chacao',
        parroquias: ['Chacao'],
      },
      {
        nombre: 'El Hatillo',
        parroquias: ['El Hatillo'],
      },
      {
        nombre: 'Sucre (Petare)',
        parroquias: ['Petare', 'Caucagüita', 'Fila de Mariches', 'La Dolorita', 'Leoncio Martínez'],
      },
      {
        nombre: 'Guaicaipuro (Los Teques)',
        parroquias: [
          'Los Teques',
          'Altagracia de la Montaña',
          'Cecilio Acosta',
          'El Jarillo',
          'San Pedro',
          'Tácata',
          'Paracotos',
        ],
      },
      {
        nombre: 'Plaza (Guarenas)',
        parroquias: ['Guarenas'],
      },
      {
        nombre: 'Zamora (Guatire)',
        parroquias: ['Guatire', 'Bolívar'],
      },
    ],
  },
  {
    estado: 'Aragua',
    municipios: [
      {
        nombre: 'Girardot (Maracay)',
        parroquias: [
          'Choroní',
          'Urb. Las Delicias',
          'Madre María de San José',
          'Joaquín Crespo',
          'Pedro José Ovalles',
          'José Casanova Godoy',
          'Andrés Eloy Blanco',
          'Los Tacarigua',
        ],
      },
      {
        nombre: 'Santiago Mariño (Turmero)',
        parroquias: [
          'Turmero',
          'Arévalo Aponte',
          'Chuao',
          'Samán de Güere',
          'Alfredo Pacheco Miranda',
        ],
      },
      {
        nombre: 'Ribas (La Victoria)',
        parroquias: ['La Victoria', 'Castor Nieves Ríos', 'Las Mercedes', 'Zuata', 'Pao de Zárate'],
      },
    ],
  },
  {
    estado: 'Carabobo',
    municipios: [
      {
        nombre: 'Valencia',
        parroquias: [
          'Candelaria',
          'Catedral',
          'El Socorro',
          'Miguel Peña',
          'Rafael Urdaneta',
          'San Blas',
          'San José',
          'Santa Rosa',
          'Negro Primero',
        ],
      },
      {
        nombre: 'Naguanagua',
        parroquias: ['Naguanagua'],
      },
      {
        nombre: 'San Diego',
        parroquias: ['San Diego'],
      },
      {
        nombre: 'Puerto Cabello',
        parroquias: [
          'Bartolomé Salom',
          'Democracia',
          'Fraternidad',
          'Goaigoaza',
          'Juan José Flores',
          'Unión',
          'Borburata',
          'Patanemo',
        ],
      },
    ],
  },
  {
    estado: 'Zulia',
    municipios: [
      {
        nombre: 'Maracaibo',
        parroquias: [
          'Antonio Borjas Romero',
          'Bolívar',
          'Cacique Mara',
          'Carracciolo Parra Pérez',
          'Cecilio Acosta',
          'Chiquinquira',
          'Coquivacoa',
          'Cristo de Aranza',
          'Idelfonso Vásquez',
          'Juana de Ávila',
          'Luis Hurtado Higuera',
          'Manuel Dagnino',
          'Olegario Villalobos',
          'Raúl Leoni',
          'Santa Lucía',
          'San Isidro',
          'Francisco Eugenio Bustamante',
        ],
      },
      {
        nombre: 'San Francisco',
        parroquias: [
          'San Francisco',
          'El Bajo',
          'Domitila Flores',
          'Francisco Ochoa',
          'Los Cortijos',
          'Marcial Hernández',
        ],
      },
      {
        nombre: 'Cabimas',
        parroquias: [
          'Ambrosio',
          'Carmen Herrera',
          'La Rosa',
          'Germán Ríos Linares',
          'San Benito',
          'Rómulo Betancourt',
          'Jorge Hernández',
        ],
      },
    ],
  },
  {
    estado: 'Lara',
    municipios: [
      {
        nombre: 'Iribarren (Barquisimeto)',
        parroquias: [
          'Catedral',
          'Concepción',
          'El Cují',
          'Juan de Villegas (Ana Soto)',
          'Santa Rosa',
          'Tamaca',
          'Unión',
          'Aguedo Felipe Alvarado',
          'Buena Vista',
          'Juárez',
        ],
      },
      {
        nombre: 'Palavecino (Cabudare)',
        parroquias: ['Cabudare', 'José Gregorio Bastidas', 'Agua Viva'],
      },
    ],
  },
  {
    estado: 'Anzoátegui',
    municipios: [
      {
        nombre: 'Simón Bolívar (Barcelona)',
        parroquias: ['El Carmen', 'San Cristóbal', 'Bergantín', 'Caigua', 'El Pilar', 'Naricual'],
      },
      {
        nombre: 'Juan Antonio Sotillo (Puerto La Cruz)',
        parroquias: ['Puerto La Cruz', 'Pozuelos'],
      },
      {
        nombre: 'Diego Bautista Urbaneja (Lechería)',
        parroquias: ['Lechería', 'El Morro'],
      },
    ],
  },
  {
    estado: 'Bolívar',
    municipios: [
      {
        nombre: 'Caroní (Ciudad Guayana / Puerto Ordaz)',
        parroquias: [
          'Cachamay',
          'Chirica',
          'Dalla Costa',
          'Once de Abril',
          'Simón Bolívar',
          'Unimar',
          'Universidad',
          'Vista al Sol',
          'Yocoima',
        ],
      },
      {
        nombre: 'Angostura del Orinoco (Ciudad Bolívar)',
        parroquias: [
          'Catedral',
          'Agua Salada',
          'José Antonio Páez',
          'La Sabanita',
          'Marhuanta',
          'Vista Hermosa',
        ],
      },
    ],
  },
  {
    estado: 'Táchira',
    municipios: [
      {
        nombre: 'San Cristóbal',
        parroquias: [
          'La Concordia',
          'Pedro María Morantes',
          'San Juan Bautista',
          'San Sebastián',
          'Francisco Romero Lobo',
        ],
      },
    ],
  },
  {
    estado: 'Mérida',
    municipios: [
      {
        nombre: 'Libertador (Mérida)',
        parroquias: [
          'Antonio Spinetti Dini',
          'Arias',
          'Caracciolo Parra Pérez',
          'Domingo Peña',
          'El Sagrario',
          'Gonzalo Picón Febres',
          'Jacinto Plaza',
          'Juan Rodríguez Suárez',
          'Lasso de la Vega',
          'Mariano Picón Salas',
          'Milla',
          'Osuna Rodríguez',
          'Sagrario',
        ],
      },
    ],
  },
  {
    estado: 'Monagas',
    municipios: [
      {
        nombre: 'Maturín',
        parroquias: ['Alto de Los Godos', 'Boquerón', 'Las Cocuizas', 'San Simón', 'Santa Cruz'],
      },
    ],
  },
  {
    estado: 'Nueva Esparta',
    municipios: [
      {
        nombre: 'Mariño (Porlamar)',
        parroquias: ['Porlamar'],
      },
      {
        nombre: 'Maneiro (Pampatar)',
        parroquias: ['Pampatar', 'Aguirre'],
      },
    ],
  },
  {
    estado: 'Falcón',
    municipios: [
      {
        nombre: 'Miranda (Coro)',
        parroquias: ['San Antonio', 'San Gabriel', 'Santa Ana'],
      },
      {
        nombre: 'Carirubana (Punto Fijo)',
        parroquias: ['Carirubana', 'Punta Cardón', 'Norte', 'Santa Ana'],
      },
    ],
  },
  {
    estado: 'Portuguesa',
    municipios: [
      {
        nombre: 'Páez (Acarigua)',
        parroquias: ['Acarigua', 'Payara', 'Pinho'],
      },
      {
        nombre: 'Guanare',
        parroquias: ['Guanare', 'Córdoba', 'San José de la Montaña'],
      },
    ],
  },
  {
    estado: 'Sucre',
    municipios: [
      {
        nombre: 'Sucre (Cumaná)',
        parroquias: ['Altagracia', 'Ayacucho', 'Santa Inés', 'Valentín Valiente'],
      },
    ],
  },
  {
    estado: 'Yaracuy',
    municipios: [
      {
        nombre: 'San Felipe',
        parroquias: ['San Felipe', 'Albarico', 'San Javier'],
      },
    ],
  },
  {
    estado: 'Barinas',
    municipios: [
      {
        nombre: 'Barinas',
        parroquias: [
          'Barinas',
          'Alto Barinas',
          'Corazón de Jesús',
          'El Carmen',
          'Rómulo Betancourt',
        ],
      },
    ],
  },
  {
    estado: 'Trujillo',
    municipios: [
      {
        nombre: 'Valera',
        parroquias: ['Juan Ignacio Montilla', 'La Beatriz', 'Mercedes Díaz', 'San Luis'],
      },
    ],
  },
  {
    estado: 'La Guaira',
    municipios: [
      {
        nombre: 'Vargas (La Guaira)',
        parroquias: [
          'Caraballeda',
          'Carayaca',
          'Catia La Mar',
          'El Junko',
          'La Guaira',
          'Maiquetía',
          'Naiguatá',
          'Urimare',
        ],
      },
    ],
  },
  {
    estado: 'Guárico',
    municipios: [
      {
        nombre: 'Juan Germán Roscio (San Juan de los Morros)',
        parroquias: ['San Juan de los Morros', 'Cantagallo', 'Parapara'],
      },
    ],
  },
  {
    estado: 'Cojedes',
    municipios: [
      {
        nombre: 'Ezequiel Zamora (San Carlos)',
        parroquias: ['San Carlos de Austria', 'Juan Ángel Bravo', 'Manuel Manrique'],
      },
    ],
  },
  {
    estado: 'Delta Amacuro',
    municipios: [
      {
        nombre: 'Tucupita',
        parroquias: ['San José', 'Virgen del Valle', 'San Rafael'],
      },
    ],
  },
  {
    estado: 'Apure',
    municipios: [
      {
        nombre: 'San Fernando',
        parroquias: ['San Fernando', 'El Recreo', 'Peñalver', 'San Rafael de Atamaica'],
      },
    ],
  },
  {
    estado: 'Amazonas',
    municipios: [
      {
        nombre: 'Atures (Puerto Ayacucho)',
        parroquias: ['Fernando Girón Tovar', 'Luis Alberto Gómez', 'Pahueña', 'Platanillal'],
      },
    ],
  },
];

export interface LocationAddressParsed {
  estado: string;
  municipio: string;
  parroquia: string;
  direccionDetalle: string;
}

export function formatFullAddress(
  estado: string,
  municipio: string,
  parroquia: string,
  direccionDetalle: string,
): string {
  const cleanDetalle = direccionDetalle.trim();
  if (!cleanDetalle) {
    return `Parroquia ${parroquia}, Municipio ${municipio}, Estado ${estado}, Venezuela`;
  }
  return `${cleanDetalle}, Parroquia ${parroquia}, Municipio ${municipio}, Estado ${estado}, Venezuela`;
}

export function parseFullAddress(fullAddress?: string | null): LocationAddressParsed {
  const defaultRes: LocationAddressParsed = {
    estado: 'Distrito Capital',
    municipio: 'Libertador',
    parroquia: 'Candelaria',
    direccionDetalle: fullAddress || '',
  };

  if (!fullAddress || typeof fullAddress !== 'string' || !fullAddress.trim()) {
    return defaultRes;
  }

  const text = fullAddress.trim();

  // Buscar estado en el texto
  const estObj = VENEZUELA_LOCATIONS.find((e) =>
    text.toLowerCase().includes(e.estado.toLowerCase()),
  );

  if (estObj) {
    const foundEst = estObj.estado;
    const munObj = estObj.municipios.find((m) =>
      text.toLowerCase().includes(m.nombre.toLowerCase()),
    );

    if (munObj) {
      const foundMun = munObj.nombre;
      const parrMatch = munObj.parroquias.find((p) => text.toLowerCase().includes(p.toLowerCase()));
      const foundParr = parrMatch || munObj.parroquias[0] || 'Candelaria';

      // Remover las partes formateadas para dejar solo la dirección detallada
      let cleanDetalle = text
        .replace(new RegExp(`Parroquia\\s+${foundParr}`, 'gi'), '')
        .replace(new RegExp(`Municipio\\s+${foundMun}`, 'gi'), '')
        .replace(new RegExp(`Estado\\s+${foundEst}`, 'gi'), '')
        .replace(/,\s*Venezuela/gi, '')
        .trim();

      cleanDetalle = cleanDetalle.replace(/^,\s*|\s*,$/g, '').trim();

      return {
        estado: foundEst,
        municipio: foundMun,
        parroquia: foundParr,
        direccionDetalle: cleanDetalle || text,
      };
    }
  }

  return defaultRes;
}
