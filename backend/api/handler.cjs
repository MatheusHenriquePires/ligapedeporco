const appPromise = require('../src/app.js').buildApp();

module.exports = async function handler(req, res) {
  const app = await appPromise;
  await app.ready();
  app.server.emit('request', req, res);
};
