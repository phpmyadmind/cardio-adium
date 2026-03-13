const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { generateId } = require('../utils/uuid');

router.get('/', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM settings');
    res.json(rows.map(r => ({ key: r.key, value: typeof r.value === 'string' ? JSON.parse(r.value || 'null') : r.value, description: r.description })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:key', async (req, res) => {
  try {
    const [row] = await query('SELECT * FROM settings WHERE `key` = ?', [req.params.key]);
    if (!row) return res.status(404).json({ error: 'Setting no encontrado' });
    res.json({ key: row.key, value: typeof row.value === 'string' ? JSON.parse(row.value || 'null') : row.value, description: row.description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = generateId();
    const { key, value, description, updatedBy } = req.body;
    const valueJson = JSON.stringify(value !== undefined ? value : null);
    await query(
      'INSERT INTO settings (id, `key`, value, description, updated_by) VALUES (?, ?, ?, ?, ?)',
      [id, key, valueJson, description || null, updatedBy || null]
    );
    res.status(201).json({ key, value, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:key', async (req, res) => {
  try {
    const { value, description, updatedBy } = req.body;
    const valueJson = value !== undefined ? JSON.stringify(value) : null;
    const result = await query(
      'UPDATE settings SET value=COALESCE(?, value), description=COALESCE(?, description), updated_by=? WHERE `key`=?',
      [valueJson, description, updatedBy || null, req.params.key]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Setting no encontrado' });
    res.json({ key: req.params.key, value, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:key', async (req, res) => {
  try {
    const result = await query('DELETE FROM settings WHERE `key` = ?', [req.params.key]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Setting no encontrado' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
