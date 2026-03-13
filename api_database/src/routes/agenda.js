const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { generateId } = require('../utils/uuid');

router.get('/', async (req, res) => {
  try {
    const { event_tracker, eventTrackerId, date } = req.query;
    const trackerId = event_tracker || eventTrackerId;
    let sql = 'SELECT * FROM agenda WHERE 1=1';
    const params = [];
    if (trackerId) { sql += ' AND event_tracker = ?'; params.push(trackerId); }
    if (date) { sql += ' AND date = ?'; params.push(date); }
    sql += ' ORDER BY date, start_time';
    const rows = await query(sql, params);
    res.json(rows.map(mapAgenda));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [row] = await query('SELECT * FROM agenda WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(mapAgenda(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = generateId();
    const { title, description, date, startTime, endTime, speakerIds, type, moderator, location, section, participants, event_tracker, specialty, pdfUrl } = req.body;
    const speakerIdsJson = speakerIds ? JSON.stringify(speakerIds) : '[]';
    const participantsJson = participants ? JSON.stringify(participants) : '[]';
    await query(
      `INSERT INTO agenda (id, title, description, date, start_time, end_time, speaker_ids, type, moderator, location, section, participants, event_tracker, specialty, pdf_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description, date, startTime, endTime, speakerIdsJson, type || null, moderator || null, location || null, section || null, participantsJson, event_tracker || null, specialty || null, pdfUrl || null]
    );
    res.status(201).json({ id, title, description, date, startTime, endTime, speakerIds: speakerIds || [], type, moderator, location, section, participants: participants || [], event_tracker, specialty, pdfUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description, date, startTime, endTime, speakerIds, type, moderator, location, section, participants, event_tracker, specialty, pdfUrl } = req.body;
    const speakerIdsJson = speakerIds ? JSON.stringify(speakerIds) : '[]';
    const participantsJson = participants ? JSON.stringify(participants) : '[]';
    const result = await query(
      `UPDATE agenda SET title=?, description=?, date=?, start_time=?, end_time=?, speaker_ids=?, type=?, moderator=?, location=?, section=?, participants=?, event_tracker=?, specialty=?, pdf_url=? WHERE id=?`,
      [title, description, date, startTime, endTime, speakerIdsJson, type || null, moderator || null, location || null, section || null, participantsJson, event_tracker || null, specialty || null, pdfUrl || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json({ id: req.params.id, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM agenda WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function mapAgenda(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    speakerIds: typeof row.speaker_ids === 'string' ? JSON.parse(row.speaker_ids || '[]') : (row.speaker_ids || []),
    type: row.type,
    moderator: row.moderator,
    location: row.location,
    section: row.section,
    participants: typeof row.participants === 'string' ? JSON.parse(row.participants || '[]') : (row.participants || []),
    event_tracker: row.event_tracker,
    specialty: row.specialty,
    pdfUrl: row.pdf_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = router;
