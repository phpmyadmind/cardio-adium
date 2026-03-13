const crypto = require('crypto');

const generateId = () => crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');

module.exports = { generateId };
