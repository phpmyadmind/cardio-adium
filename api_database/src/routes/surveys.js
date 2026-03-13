const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { generateId } = require('../utils/uuid');

router.get('/', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM surveys');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [row] = await query('SELECT * FROM surveys WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Encuesta no encontrada' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = generateId();
    const { title, description, isEnabled, surveyData, createdBy, updatedBy } = req.body;
    const dataJson = surveyData ? JSON.stringify(surveyData) : '{}';
    await query(
      'INSERT INTO surveys (id, title, description, is_enabled, survey_data, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, title, description || null, isEnabled ? 1 : 0, dataJson, createdBy || null, updatedBy || null]
    );
    res.status(201).json({ id, title, description, isEnabled, surveyData, createdBy, updatedBy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description, isEnabled, surveyData, updatedBy } = req.body;
    const dataJson = surveyData ? JSON.stringify(surveyData) : null;
    const result = await query(
      'UPDATE surveys SET title=?, description=?, is_enabled=?, survey_data=COALESCE(?, survey_data), updated_by=? WHERE id=?',
      [title, description || null, isEnabled ? 1 : 0, dataJson, updatedBy || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Encuesta no encontrada' });
    res.json({ id: req.params.id, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM surveys WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Encuesta no encontrada' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
