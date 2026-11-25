import 'dotenv/config';
import { createApp } from './app';

const port = Number(process.env.PORT) || 8787;
const app = createApp({ ...process.env });

app.listen(port, '0.0.0.0', () => {
  const configured = Boolean(process.env.OPENAI_API_KEY);
  console.log(`Pally server listening on http://0.0.0.0:${port}`);
  if (!configured) {
    console.warn('OPENAI_API_KEY is not set. Copy .env.example to .env and add your key. The app will show a friendly "not set up" message until then.');
  }
});
