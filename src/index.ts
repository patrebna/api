import express from 'express';
import cors from 'cors';
import apiRouter from 'routes/api.routes';
import db from 'services/mongodb.service';

const { PORT = 3000 } = process.env;

const app = express();
app.use(express.json());
app.use(cors());

app.use('/api', apiRouter);

app.listen(PORT, async () => {
  await db.openConnection();
  console.log(`API запущен на порту ${PORT}`);
});
