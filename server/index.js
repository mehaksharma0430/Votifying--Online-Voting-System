require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const routes = require('./routes');
const handle = require('./handlers');

const app = express();
const PORT = process.env.PORT || 4000;
const mongoose = require('mongoose');
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'ok', service: 'voting-api' });
});

app.get('/api/health/ready', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    if (mongoose.connection.readyState !== 1) throw new Error('Database unavailable');
    await mongoose.connection.db.admin().ping({ maxTimeMS: 2000 });
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
});

app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: { message: 'Database unavailable. Please try again shortly.' } });
  }
  next();
});

app.use('/api/auth/otp', require('./routes/otp'));
app.use('/api/auth', routes.auth);
app.use('/api/polls', routes.poll);
app.use('/api/civic', require('./routes/civic'));

app.use((req, res, next) => {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});
app.use(handle.error);

app.listen(PORT, '127.0.0.1', () => console.log(`Server listening on port ${PORT}`));
