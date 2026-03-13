require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5040;

app.use(cors());
app.use(express.json());

async function start() {
  await db.initDatabase();

  app.use('/api/users', require('./routes/users'));
  app.use('/api/event-trackers', require('./routes/eventTrackers'));
  app.use('/api/speakers', require('./routes/speakers'));
  app.use('/api/agenda', require('./routes/agenda'));
  app.use('/api/events', require('./routes/events'));
  app.use('/api/questions', require('./routes/questions'));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/surveys', require('./routes/surveys'));
  app.use('/api/survey-questions', require('./routes/surveyQuestions'));
  app.use('/api/survey-responses', require('./routes/surveyResponses'));
  app.use('/api/surveys/responses', require('./routes/surveyResponses'));
  app.use('/api/settings', require('./routes/settings'));
  app.use('/api/reports', require('./routes/reports'));

  app.get('/api/health', async (req, res) => {
    try {
      await db.pool.execute('SELECT 1');
      res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
      res.status(503).json({ status: 'error', database: err.message });
    }
  });

  const tryListen = (port) => {
    const server = app.listen(port, () => {
      console.log(`API cardio-adium escuchando en http://localhost:${port}`);
    });
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Puerto ${port} en uso, intentando ${port + 1}...`);
        server.close();
        tryListen(port + 1);
      } else {
        throw err;
      }
    });
  };
  tryListen(PORT);
}

start().catch((err) => {
  console.error('Error al iniciar:', err);
  process.exit(1);
});
