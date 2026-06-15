const GRAPH_API_URL = 'https://graph.facebook.com/v25.0';
const phoneNumberId = '1166894683176895';
const accessToken = 'EAAVGGRx7vzoBRskywGhtMadl0i90YZBkzYjHlJnNmKZBT8jUQf0Np5MICEBZCvriCX9HAtl4JBDmcewJVrfIryc9Dj6EWyfsHJDJllq5wHKMcS5KZAZCZCMuj5qu1QihlIoClJLsUkOs4QYXyTSvWoxS33TpYpGN8NYao96797dscZCPu2mG8Lc4FFIKAUKL7ZArlBl8SBd0Dv4wGHBMfqQJ2CEmtIayiqY2EzRNKyh5quPa6vcfShu9L1eAK5jp2hVzW7OoGIwnGkw7WZA9GPQZDZD';
const to = '27825319901';
const body = 'hi';

const payload = {
  messaging_product: 'whatsapp',
  to,
  type: 'text',
  text: { body },
};

fetch(`${GRAPH_API_URL}/${phoneNumberId}/messages`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
}).then(res => res.json()).then(console.log).catch(console.error);
