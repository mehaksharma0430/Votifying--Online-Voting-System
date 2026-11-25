const mongoose = require('mongoose');
mongoose.set('debug', false);
mongoose.set('strictQuery', true);
mongoose.Promise = global.Promise;
mongoose.connection.on('error', () => console.error('MongoDB connection error. Check server/.env and database availability.'));
mongoose.connection.on('connected', () => console.log('MongoDB connected'));
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
if (process.env.DATABASE) {
  mongoose.connect(process.env.DATABASE, {
    serverSelectionTimeoutMS: 5000,
  }).catch(() => console.error('MongoDB initial connection failed. Restart after checking DATABASE.'));
} else {
  console.warn('DATABASE is missing. Configure server/.env and restart.');
}

module.exports.User = require('./user');
module.exports.Poll = require('./poll');
