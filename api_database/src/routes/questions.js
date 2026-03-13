const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { generateId } = require('../utils/uuid');

router.get('/', async (req, res) => {
  try {
    const { userId, eventId, isApproved } = req.query;
    let sql = 'SELECT * FROM questions WHERE 1=1';
    const params = [];
    if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
    if (eventId) { sql += ' AND event_id = ?'; params.push(eventId); }
    if (isApproved !== undefined) { sql += ' AND is_approved = ?'; params.push(isApproved === 'true' ? 1 : 0); }
    sql += ' ORDER BY submitted_at DESC';
    const rows = await query(sql, params);
    res.json(rows.map(mapQuestion));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [row] = await query('SELECT * FROM questions WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Pregunta no encontrada' });
    res.json(mapQuestion(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = generateId();
    const { userId, eventId, text, userName, speakerName } = req.body;
    // Si user_id es null (usuario anónimo/no autenticado), generamos un GUID para cumplir con la restricción NOT NULL
    const effectiveUserId = userId || generateId();
    await query(
      'INSERT INTO questions (id, user_id, event_id, text, user_name, speaker_name, is_approved, is_answered) VALUES (?, ?, ?, ?, ?, ?, 0, 0)',
      [id, effectiveUserId, eventId || null, text, userName || null, speakerName || null]
    );
    res.status(201).json({ id, userId: effectiveUserId, eventId, text, userName, speakerName, isApproved: false, isAnswered: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { text, isApproved, isAnswered, answer } = req.body;
    const result = await query(
      'UPDATE questions SET text=COALESCE(?, text), is_approved=COALESCE(?, is_approved), is_answered=COALESCE(?, is_answered), answer=COALESCE(?, answer) WHERE id=?',
      [text, isApproved !== undefined ? (isApproved ? 1 : 0) : null, isAnswered !== undefined ? (isAnswered ? 1 : 0) : null, answer || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Pregunta no encontrada' });
    const [row] = await query('SELECT * FROM questions WHERE id = ?', [req.params.id]);
    res.json(mapQuestion(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM questions WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Pregunta no encontrada' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function mapQuestion(row) {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    text: row.text,
    submittedAt: row.submitted_at,
    isApproved: !!row.is_approved,
    isAnswered: !!row.is_answered,
    userName: row.user_name,
    speakerName: row.speaker_name,
    answer: row.answer,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = router;
