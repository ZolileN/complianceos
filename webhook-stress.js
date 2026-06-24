import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '15s', target: 100 },  // 1. Quick ramp-up to 100 concurrent workers
    { duration: '45s', target: 1000 }, // 2. Sustained heavy blast of 1,000 workers
    { duration: '15s', target: 0 },    // 3. Cool down to verify resource recovery
  ],
  thresholds: {
    http_req_failed: ['rate<0.005'],   // Less than 0.5% failure rate tolerated
    http_req_duration: ['p(95)<15'],   // 95% of local webhook transfers must complete under 15ms
  },
};

export default function () {
  // Use explicit loopback IP mapping to bypass machine hostname resolution loops
  const url = 'http://127.0.0.1:3000/api/whatsapp/webhook'; 

  const payload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1166894683176895',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '27830000000',
                phone_number_id: '1166894683176895'
              },
              messages: [
                {
                  from: '27821234567',
                  id: `wamid.HBgLDIzNDU2Nzg5MDUVAgIkRkVGNBDRQzREODk1`,
                  timestamp: `${Math.floor(Date.now() / 1000)}`,
                  text: { body: 'Local ingestion pipeline simulation run.' },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': 'sha256=mock_local_signature_hash' 
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'local environment receipt confirmed (200)': (r) => r.status === 200,
  });

  sleep(0.01); 
}
