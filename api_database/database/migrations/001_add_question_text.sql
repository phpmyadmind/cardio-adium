-- Migración: agregar question_text a survey_responses para guardar el texto de la pregunta
ALTER TABLE survey_responses ADD COLUMN question_text TEXT NULL AFTER question_type;
