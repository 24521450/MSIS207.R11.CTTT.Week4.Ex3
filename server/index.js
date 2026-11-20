import mongoose from 'mongoose';
import { createApp } from './app.js';
import { connectMessageStore } from './message-store.js';

const {
  MONGODB_URI,
  FRONTEND_ORIGIN = 'http://localhost:5173',
  PORT = '3001',
} = process.env;

try {
  if (!MONGODB_URI) throw new Error('Set MONGODB_URI before starting the API.');

  const store = await connectMessageStore(MONGODB_URI);
  const server = createApp({ store, frontendOrigin: FRONTEND_ORIGIN }).listen(Number(PORT));

  server.on('listening', () => console.log(`Forum API listening on port ${server.address().port}`));
  server.on('error', async (error) => {
    console.error('Unable to listen:', error.code);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
} catch (error) {
  console.error(MONGODB_URI ? `Unable to initialize MongoDB (${error.name}).` : error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
}
