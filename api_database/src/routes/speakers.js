const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { generateId } = require('../utils/uuid');

router.get('/', async (req, res) => {
  try {
    const { event_tracker, eventTrackerId } = req.query;
    const trackerId = event_tracker || eventTrackerId;
    let sql = 'SELECT * FROM speakers';
    const params = [];
    if (trackerId) {
      sql += ' WHERE event_tracker = ?';
      params.push(trackerId);
    }
    const rows = await query(sql, params);
    res.json(rows.map(mapSpeaker));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [row] = await query('SELECT * FROM speakers WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Speaker no encontrado' });
    res.json(mapSpeaker(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = generateId();
    const { name, specialty, bio, imageUrl, imageHint, qualifications, event_tracker } = req.body;
    const quals = qualifications ? JSON.stringify(qualifications) : '[]';
    await query(
      'INSERT INTO speakers (id, name, specialty, bio, image_url, image_hint, qualifications, event_tracker) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, specialty, bio, imageUrl, imageHint, quals, event_tracker || null]
    );
    res.status(201).json({ id, name, specialty, bio, imageUrl, imageHint, qualifications: qualifications || [], event_tracker });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, specialty, bio, imageUrl, imageHint, qualifications, event_tracker } = req.body;
    const quals = qualifications ? JSON.stringify(qualifications) : '[]';
    const result = await query(
      'UPDATE speakers SET name=?, specialty=?, bio=?, image_url=?, image_hint=?, qualifications=?, event_tracker=? WHERE id=?',
      [name, specialty, bio, imageUrl, imageHint, quals, event_tracker || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Speaker no encontrado' });
    res.json({ id: req.params.id, name, specialty, bio, imageUrl, imageHint, qualifications: qualifications || [], event_tracker });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM speakers WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Speaker no encontrado' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function mapSpeaker(row) {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    specialization: row.specialization || row.specialty,
    bio: row.bio,
    imageUrl: row.image_url,
    imageHint: row.image_hint,
    qualifications: typeof row.qualifications === 'string' ? JSON.parse(row.qualifications || '[]') : (row.qualifications || []),
    event_tracker: row.event_tracker,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = router;
