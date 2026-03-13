const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { generateId } = require('../utils/uuid');

router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    let sql = 'SELECT * FROM events WHERE 1=1';
    const params = [];
    if (date) { sql += ' AND date = ?'; params.push(date); }
    sql += ' ORDER BY date, start_time';
    const rows = await query(sql, params);
    res.json(rows.map(mapEvent));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [row] = await query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(mapEvent(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = generateId();
    const { title, description, startTime, endTime, date, speakerIds, type, moderator, location, section, participants } = req.body;
    const speakerIdsJson = speakerIds ? JSON.stringify(speakerIds) : '[]';
    const participantsJson = participants ? JSON.stringify(participants) : '[]';
    await query(
      `INSERT INTO events (id, title, description, start_time, end_time, date, speaker_ids, type, moderator, location, section, participants)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description, startTime, endTime, date, speakerIdsJson, type || null, moderator || null, location || null, section || null, participantsJson]
    );
    res.status(201).json({ id, title, description, startTime, endTime, date, speakerIds: speakerIds || [], type, moderator, location, section, participants: participants || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description, startTime, endTime, date, speakerIds, type, moderator, location, section, participants } = req.body;
    const speakerIdsJson = speakerIds ? JSON.stringify(speakerIds) : '[]';
    const participantsJson = participants ? JSON.stringify(participants) : '[]';
    const result = await query(
      `UPDATE events SET title=?, description=?, start_time=?, end_time=?, date=?, speaker_ids=?, type=?, moderator=?, location=?, section=?, participants=? WHERE id=?`,
      [title, description, startTime, endTime, date, speakerIdsJson, type || null, moderator || null, location || null, section || null, participantsJson, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json({ id: req.params.id, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM events WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function mapEvent(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startTime: row.start_time,
    endTime: row.end_time,
    date: row.date,
    speakerIds: typeof row.speaker_ids === 'string' ? JSON.parse(row.speaker_ids || '[]') : (row.speaker_ids || []),
    type: row.type,
    moderator: row.moderator,
    location: row.location,
    section: row.section,
    participants: typeof row.participants === 'string' ? JSON.parse(row.participants || '[]') : (row.participants || []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = router;
