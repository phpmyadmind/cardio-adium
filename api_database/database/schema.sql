-- Schema MySQL para cardio-adium
-- Ejecutar: mysql -u root -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS cardio_adium CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cardio_adium;

-- Event Trackers
CREATE TABLE IF NOT EXISTS event_trackers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_is_active (is_active)
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  medical_id VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  specialty VARCHAR(100),
  is_admin TINYINT(1) DEFAULT 0,
  password VARCHAR(255),
  terms_accepted TINYINT(1),
  question VARCHAR(255),
  answer VARCHAR(255),
  event_tracker VARCHAR(36),
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_medical_id (medical_id),
  INDEX idx_is_admin (is_admin),
  INDEX idx_event_tracker (event_tracker)
);

-- Speakers
CREATE TABLE IF NOT EXISTS speakers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  specialty VARCHAR(255) NOT NULL,
  specialization VARCHAR(255),
  bio TEXT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  image_hint VARCHAR(255) NOT NULL,
  qualifications JSON,
  event_tracker VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_event_tracker (event_tracker)
);

-- Agenda (eventos de agenda)
CREATE TABLE IF NOT EXISTS agenda (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  date VARCHAR(10) NOT NULL,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  speaker_ids JSON,
  type ENUM('session','break','meal','welcome','closing','workshop','qna'),
  moderator VARCHAR(255),
  location VARCHAR(255),
  section VARCHAR(255),
  participants JSON,
  event_tracker VARCHAR(36),
  specialty VARCHAR(100),
  pdf_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date),
  INDEX idx_date_start (date, start_time),
  INDEX idx_event_tracker (event_tracker),
  INDEX idx_event_date (event_tracker, date)
);

-- Events (eventos legacy/simples)
CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  date VARCHAR(10) NOT NULL,
  speaker_ids JSON,
  type ENUM('session','break','meal','welcome','closing','workshop','qna'),
  moderator VARCHAR(255),
  location VARCHAR(255),
  section VARCHAR(255),
  participants JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date),
  INDEX idx_date_start (date, start_time)
);

-- Questions (preguntas Q&A)
CREATE TABLE IF NOT EXISTS questions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  event_id VARCHAR(36),
  text TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_approved TINYINT(1) DEFAULT 0,
  is_answered TINYINT(1) DEFAULT 0,
  user_name VARCHAR(255),
  speaker_name VARCHAR(255),
  answer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_submitted (user_id, submitted_at),
  INDEX idx_event_submitted (event_id, submitted_at),
  INDEX idx_is_approved (is_approved)
);

-- Surveys
CREATE TABLE IF NOT EXISTS surveys (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_enabled TINYINT(1) DEFAULT 0,
  survey_data JSON NOT NULL,
  created_by VARCHAR(36),
  updated_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_enabled_updated (is_enabled, updated_at)
);

-- Survey Questions
CREATE TABLE IF NOT EXISTS survey_questions (
  id VARCHAR(36) PRIMARY KEY,
  survey_id VARCHAR(36) NOT NULL,
  day TINYINT NOT NULL,
  date VARCHAR(10) NOT NULL,
  question_number INT NOT NULL,
  question_type ENUM('conference_rating','practical_spaces','incremental_learning','recommendation_likelihood','pre_event_info','logistics','agenda_compliance','campus_feedback') NOT NULL,
  question_text TEXT NOT NULL,
  scale_min INT NOT NULL,
  scale_max INT NOT NULL,
  scale_min_label VARCHAR(100) NOT NULL,
  scale_max_label VARCHAR(100) NOT NULL,
  speakers JSON,
  is_enabled TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_survey_day_num (survey_id, day, question_number),
  INDEX idx_survey_enabled (survey_id, is_enabled),
  INDEX idx_day_enabled (day, is_enabled)
);

-- Survey Responses
CREATE TABLE IF NOT EXISTS survey_responses (
  id VARCHAR(36) PRIMARY KEY,
  survey_id VARCHAR(36) NOT NULL,
  question_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  user_name VARCHAR(255),
  day TINYINT NOT NULL,
  day_date VARCHAR(10) NOT NULL,
  question_number INT NOT NULL,
  question_type VARCHAR(50) NOT NULL,
  question_text TEXT,
  speaker_name VARCHAR(255),
  rating INT NOT NULL,
  text_response TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_survey_question_user (survey_id, question_id, user_id),
  INDEX idx_user_day (user_id, day),
  INDEX idx_question_day (question_id, day)
);

-- Settings (key-value)
CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(36) PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  value JSON NOT NULL,
  description TEXT,
  updated_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_key (`key`)
);
