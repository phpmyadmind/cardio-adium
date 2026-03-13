const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { generateId } = require('../utils/uuid');
const bcrypt = require('bcryptjs');

router.get('/', async (req, res) => {
  try {
    const { identifier, userId } = req.query;
    if (identifier) {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(identifier).trim());
      const [row] = isEmail
        ? await query('SELECT id, email, medical_id, name, city, specialty, is_admin, event_tracker, last_login, created_at FROM users WHERE email = ?', [String(identifier).toLowerCase().trim()])
        : await query('SELECT id, email, medical_id, name, city, specialty, is_admin, event_tracker, last_login, created_at FROM users WHERE medical_id = ?', [String(identifier).trim()]);
      if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
      return res.json(mapUser(row));
    }
    if (userId) {
      const [row] = await query('SELECT id, email, medical_id, name, city, specialty, is_admin, event_tracker, last_login, created_at FROM users WHERE id = ?', [userId]);
      if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
      return res.json(mapUser(row));
    }
    const rows = await query(
      'SELECT id, email, medical_id, name, city, specialty, is_admin, event_tracker, last_login, created_at FROM users'
    );
    res.json(rows.map(mapUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function mapUser(row) {
  const u = { ...row };
  if (u.medical_id !== undefined) u.medicalId = u.medical_id;
  if (u.terms_accepted !== undefined) u.termsAccepted = !!u.terms_accepted;
  if (u.is_admin !== undefined) u.isAdmin = !!u.is_admin;
  delete u.password;
  return u;
}

router.get('/:id', async (req, res) => {
  try {
    const [row] = await query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(mapUser(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = generateId();
    const { email, medicalId, name, city, specialty, isAdmin, password, termsAccepted, question, answer, event_tracker } = req.body;
    const emailVal = (email || '').toLowerCase().trim();
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    await query(
      `INSERT INTO users (id, email, medical_id, name, city, specialty, is_admin, password, terms_accepted, question, answer, event_tracker)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, emailVal, medicalId, name, city || null, specialty || null, isAdmin ? 1 : 0, hashedPassword, termsAccepted ? 1 : 0, question || null, answer || null, event_tracker || null]
    );
    res.status(201).json({ id, email: emailVal, medicalId, name, city, specialty, isAdmin, termsAccepted, question, answer, event_tracker });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const id = req.body?.id || req.body?.userId;
    if (!id) return res.status(400).json({ error: 'ID de usuario requerido' });
    const { email, medicalId, name, city, specialty, isAdmin, password, termsAccepted, question, answer, event_tracker } = req.body;
    let sql = `UPDATE users SET email=?, medical_id=?, name=?, city=?, specialty=?, is_admin=?, terms_accepted=?, question=?, answer=?, event_tracker=?`;
    const params = [email, medicalId, name, city || null, specialty || null, isAdmin ? 1 : 0, termsAccepted ? 1 : 0, question || null, answer || null, event_tracker || null];
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      sql += ', password=?';
      params.push(hashedPassword);
    }
    sql += ' WHERE id=?';
    params.push(id);
    const result = await query(sql, params);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ id, ...req.body, password: undefined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }
    const [row] = await query('SELECT id, password FROM users WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
    const valid = await bcrypt.compare(currentPassword, row.password || '');
    if (!valid) return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { email, medicalId, name, city, specialty, isAdmin, password, termsAccepted, question, answer, event_tracker } = req.body;
    let sql = `UPDATE users SET email=?, medical_id=?, name=?, city=?, specialty=?, is_admin=?, terms_accepted=?, question=?, answer=?, event_tracker=?`;
    const params = [email, medicalId, name, city || null, specialty || null, isAdmin ? 1 : 0, termsAccepted ? 1 : 0, question || null, answer || null, event_tracker || null];
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      sql += ', password=?';
      params.push(hashedPassword);
    }
    sql += ' WHERE id=?';
    params.push(req.params.id);
    const result = await query(sql, params);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ id: req.params.id, ...req.body, password: undefined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'ID de usuario requerido' });
    const result = await query('DELETE FROM users WHERE id = ?', [userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
