// Netlify Function: butun /api/* so'rovlarini Express ilovasiga uzatadi.
// Netlify'da MONGODB_URI muhit o'zgaruvchisi bo'lishi shart.
const serverless = require('serverless-http');
const app = require('../../src/app');

exports.handler = serverless(app);
