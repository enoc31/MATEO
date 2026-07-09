import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ydnylydulwjecdllbnev.supabase.co';
const supabaseKey = 'sb_publishable_ir2UA-esQVx-wDlUKnsjbA_25EdKXU0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Generar tasas simuladas para todo Junio 2026 (regresión lineal de 640.00 a 652.97)
const generateJuneRates = () => {
  const rates = [];
  const startRate = 640.0;
  const endRate = 652.97;
  const totalDays = 30;

  for (let day = 1; day <= totalDays; day++) {
    // Calcular una tasa incremental con pequeña variación aleatoria
    const progress = (day - 1) / (totalDays - 1);
    const noise = Math.sin(day) * 0.5; // variación senoidal
    const tasaVal = parseFloat((startRate + (endRate - startRate) * progress + noise).toFixed(4));

    const dd = String(day).padStart(2, '0');
    const fecha = `2026-06-${dd}`;

    rates.push({
      fecha,
      tasa: tasaVal,
      fuente: 'historico_csv',
    });
  }
  return rates;
};

async function seed() {
  const mockRates = generateJuneRates();
  console.log(`Seeding ${mockRates.length} rates for June 2026...`);

  const { data, error } = await supabase
    .from('tasas_bcv')
    .upsert(mockRates, { onConflict: 'fecha' })
    .select();

  if (error) {
    console.error('Error seeding rates:', error);
  } else {
    console.log(`Successfully seeded ${data.length} rates in Supabase!`);
    console.log('Sample rates seeded:', data.slice(0, 3));
  }
}

seed();
