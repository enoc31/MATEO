const https = require('https');

const SUPABASE_URL = 'https://ydnylydulwjecdllbnev.supabase.co/rest/v1';
const API_KEY = 'sb_publishable_ir2UA-esQVx-wDlUKnsjbA_25EdKXU0';

const endpoints = [
  '/donaciones?select=*',
  '/proyectos?select=*',
  '/transacciones_bancarias?select=*',
  '/comprobantes_gasto?select=*',
];

let totalRequests = 0;
let successRequests = 0;
let failedRequests = 0;
let totalTime = 0;

const duration = 15000; // 15 seconds
const concurrency = 20;

const requestOptions = {
  headers: {
    apikey: API_KEY,
    Authorization: `Bearer ${API_KEY}`,
  },
};

async function makeRequest(endpoint) {
  const start = Date.now();
  return new Promise((resolve) => {
    https
      .get(`${SUPABASE_URL}${endpoint}`, requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const time = Date.now() - start;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            successRequests++;
          } else {
            failedRequests++;
          }
          totalTime += time;
          totalRequests++;
          resolve();
        });
      })
      .on('error', (err) => {
        failedRequests++;
        totalRequests++;
        resolve();
      });
  });
}

async function worker() {
  const endTime = Date.now() + duration;
  while (Date.now() < endTime) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    await makeRequest(endpoint);
  }
}

async function run() {
  console.log('Starting load test...');
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  console.log('--- Test Results ---');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Success: ${successRequests}`);
  console.log(`Failed: ${failedRequests}`);
  console.log(`Throughput: ${(totalRequests / (duration / 1000)).toFixed(2)} req/sec`);
  console.log(`Avg Response Time: ${(totalTime / totalRequests).toFixed(2)} ms`);
}

run();
