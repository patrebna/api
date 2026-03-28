import express from 'express';
import apiRouter from 'routes/api.routes';

const { PORT = 3000 } = process.env;

const app = express();
app.use(express.json());

app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`API запущен на порту ${PORT}`);
});
