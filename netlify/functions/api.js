// Netlify Function: butun /api/* so'rovlarini Express ilovasiga uzatadi.
const serverless = require('serverless-http');
const { connectLambda } = require('@netlify/blobs');
const app = require('../../src/app');

const handler = serverless(app);

exports.handler = async (event, context) => {
  connectLambda(event); // Netlify Blobs'ni shu so'rov uchun ulaydi
  return handler(event, context);
};
