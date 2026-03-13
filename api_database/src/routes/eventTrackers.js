const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { generateId } = require('../utils/uuid');

function mapEventTracker(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: !!row.is_active,
    is_active: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM event_trackers');
    res.json(rows.map(mapEventTracker));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [row] = await query('SELECT * FROM event_trackers WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Event tracker no encontrado' });
    res.json(mapEventTracker(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = generateId();
    const { name, description, isActive } = req.body;
    await query(
      'INSERT INTO event_trackers (id, name, description, is_active) VALUES (?, ?, ?, ?)',
      [id, name, description || null, isActive !== false ? 1 : 0]
    );
    res.status(201).json({ id, name, description, isActive: isActive !== false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const result = await query(
      'UPDATE event_trackers SET name=?, description=?, is_active=? WHERE id=?',
      [name, description || null, isActive ? 1 : 0, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Event tracker no encontrado' });
    res.json({ id: req.params.id, name, description, isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM event_trackers WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Event tracker no encontrado' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
