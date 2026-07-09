const autocannon = require('autocannon');
const fs = require('fs');

const url = 'https://ydnylydulwjecdllbnev.supabase.co/rest/v1/donaciones?select=*&limit=300';
const anonKey = 'sb_publishable_ir2UA-esQVx-wDlUKnsjbA_25EdKXU0';

const instance = autocannon(
  {
    url,
    connections: 50,
    pipelining: 1,
    duration: 10,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  },
  (err, result) => {
    if (err) {
      console.error('Error running autocannon:', err);
      return;
    }
    fs.writeFileSync('load-test-results.json', JSON.stringify(result, null, 2));
    console.log(
      `Test completed. Avg latency: ${result.latency.average}ms. Requests/sec: ${result.requests.average}`,
    );
  },
);
