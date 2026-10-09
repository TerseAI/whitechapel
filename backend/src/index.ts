import { resolve } from 'node:path';
import { createGateway } from './application.js';

const app = await createGateway(process.env.NODE_ENV === 'production' ? resolve('dist') : undefined);
const port = Number(process.env.PORT ?? 3188);
app.listen(port, process.env.HOST ?? '127.0.0.1', () =>
  console.log(`Investigation gateway ready at http://127.0.0.1:${port}`),
);
