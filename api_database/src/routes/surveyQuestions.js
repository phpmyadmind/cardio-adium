const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { generateId } = require('../utils/uuid');

router.get('/', async (req, res) => {
  try {
    const { survey_id, day, isEnabled, enabled } = req.query;
    const enabledVal = isEnabled !== undefined ? isEnabled : enabled;
    let sql = 'SELECT * FROM survey_questions WHERE 1=1';
    const params = [];
    if (survey_id) { sql += ' AND survey_id = ?'; params.push(survey_id); }
    if (day) { sql += ' AND day = ?'; params.push(day); }
    if (enabledVal !== undefined) { sql += ' AND is_enabled = ?'; params.push(enabledVal === 'true' ? 1 : 0); }
    sql += ' ORDER BY survey_id, day, question_number';
    const rows = await query(sql, params);
    res.json(rows.map(mapQuestion));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [row] = await query('SELECT * FROM survey_questions WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Pregunta de encuesta no encontrada' });
    res.json(mapQuestion(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = generateId();
    const { survey_id, day, date, question_number, question_type, question_text, scale, speakers, isEnabled } = req.body;
    const scaleMin = scale?.min ?? 0;
    const scaleMax = scale?.max ?? 10;
    const scaleMinLabel = scale?.min_label ?? '';
    const scaleMaxLabel = scale?.max_label ?? '';
    const speakersJson = speakers ? JSON.stringify(speakers) : null;
    await query(
      `INSERT INTO survey_questions (id, survey_id, day, date, question_number, question_type, question_text, scale_min, scale_max, scale_min_label, scale_max_label, speakers, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, survey_id, day, date, question_number, question_type, question_text, scaleMin, scaleMax, scaleMinLabel, scaleMaxLabel, speakersJson, isEnabled !== false ? 1 : 0]
    );
    res.status(201).json({
      id, survey_id, day, date, question_number, question_type, question_text,
      scale: { min: scaleMin, max: scaleMax, min_label: scaleMinLabel, max_label: scaleMaxLabel },
      speakers: speakers || [],
      isEnabled: isEnabled !== false,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { survey_id, day, date, question_number, question_type, question_text, scale, speakers, isEnabled } = req.body;
    const updates = [];
    const params = [];
    if (survey_id !== undefined) { updates.push('survey_id=?'); params.push(survey_id); }
    if (day !== undefined) { updates.push('day=?'); params.push(day); }
    if (date !== undefined) { updates.push('date=?'); params.push(date); }
    if (question_number !== undefined) { updates.push('question_number=?'); params.push(question_number); }
    if (question_type !== undefined) { updates.push('question_type=?'); params.push(question_type); }
    if (question_text !== undefined) { updates.push('question_text=?'); params.push(question_text); }
    if (scale) {
      updates.push('scale_min=?, scale_max=?, scale_min_label=?, scale_max_label=?');
      params.push(scale.min ?? 0, scale.max ?? 10, scale.min_label ?? '', scale.max_label ?? '');
    }
    if (speakers !== undefined) { updates.push('speakers=?'); params.push(JSON.stringify(speakers)); }
    if (isEnabled !== undefined) { updates.push('is_enabled=?'); params.push(isEnabled ? 1 : 0); }
    if (updates.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    params.push(req.params.id);
    const result = await query(`UPDATE survey_questions SET ${updates.join(', ')} WHERE id=?`, params);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Pregunta no encontrada' });
    const [row] = await query('SELECT * FROM survey_questions WHERE id = ?', [req.params.id]);
    res.json(mapQuestion(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM survey_questions WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Pregunta no encontrada' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function mapQuestion(row) {
  return {
    id: row.id,
    survey_id: row.survey_id,
    day: row.day,
    date: row.date,
    question_number: row.question_number,
    question_type: row.question_type,
    question_text: row.question_text,
    scale: {
      min: row.scale_min,
      max: row.scale_max,
      min_label: row.scale_min_label,
      max_label: row.scale_max_label,
    },
    speakers: typeof row.speakers === 'string' ? JSON.parse(row.speakers || '[]') : (row.speakers || []),
    isEnabled: !!row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = router;
