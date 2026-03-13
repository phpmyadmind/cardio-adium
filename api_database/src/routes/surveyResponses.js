const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { generateId } = require('../utils/uuid');

router.get('/', async (req, res) => {
  try {
    const { surveyId, questionId, userId, day } = req.query;
    let sql = 'SELECT * FROM survey_responses WHERE 1=1';
    const params = [];
    if (surveyId) { sql += ' AND survey_id = ?'; params.push(surveyId); }
    if (questionId) { sql += ' AND question_id = ?'; params.push(questionId); }
    if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
    if (day) { sql += ' AND day = ?'; params.push(day); }
    sql += ' ORDER BY submitted_at DESC';
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [row] = await query('SELECT * FROM survey_responses WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Respuesta no encontrada' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = generateId();
    const { surveyId, questionId, userId, userName, day, dayDate, questionNumber, questionType, questionText, speakerName, rating, textResponse } = req.body;
    await query(
      `INSERT INTO survey_responses (id, survey_id, question_id, user_id, user_name, day, day_date, question_number, question_type, question_text, speaker_name, rating, text_response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, surveyId, questionId, userId || null, userName || null, day, dayDate, questionNumber, questionType, questionText || null, speakerName || null, rating, textResponse || null]
    );
    res.status(201).json({
      id, surveyId, questionId, userId, userName, day, dayDate, questionNumber, questionType, questionText, speakerName, rating, textResponse,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM survey_responses WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Respuesta no encontrada' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
