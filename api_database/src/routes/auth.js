const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET?.trim() || 'default-secret-change-me';

router.post('/login', async (req, res) => {
  try {
    const { identifier, password, isAdmin } = req.body;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier?.trim() || '');
    let user;
    if (isAdmin) {
      const [u] = await query(
        'SELECT * FROM users WHERE email = ? AND is_admin = 1',
        [identifier?.toLowerCase?.() || identifier]
      );
      user = u;
      if (user && password) {
        const valid = await bcrypt.compare(password, user.password || '');
        if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });
      }
    } else {
      if (isEmail) {
        [user] = await query('SELECT * FROM users WHERE email = ? AND is_admin = 0', [identifier.toLowerCase().trim()]);
      } else {
        [user] = await query('SELECT * FROM users WHERE medical_id = ? AND is_admin = 0', [identifier?.trim()]);
      }
    }
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    const token = jwt.sign(
      { id: user.id, email: user.email, isAdmin: !!user.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const payload = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        medicalId: user.medical_id,
        name: user.name,
        isAdmin: !!user.is_admin,
        event_tracker: user.event_tracker,
      },
      token,
    };
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
