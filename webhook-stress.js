import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '15s', target: 100 },
    { duration: '45s', target: 1000 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.005'],
    http_req_duration: ['p(95)<15'],
  },
};

export default function () {
  // Note: with TWILIO_AUTH_TOKEN set, this will get 403 unless signature matches.
  // For local stress tests, temporarily unset TWILIO_AUTH_TOKEN.
  const url = 'http://127.0.0.1:3000/api/webhooks/twilio';

  const payload = [
    'From=whatsapp%3A%2B27821234567',
    'To=whatsapp%3A%2B14155238886',
    'Body=Local+ingestion+pipeline+simulation+run.',
    `MessageSid=SMstress${Date.now()}`,
    'NumMedia=0',
  ].join('&');

  const params = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'twilio webhook accepted (200)': (r) => r.status === 200,
  });

  sleep(0.01);
}
