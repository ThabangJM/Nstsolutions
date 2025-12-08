-- NST Solutions AI Auditor Database Schema
-- Database: nstdb
-- Created: December 2025

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS nstdb
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE nstdb;

-- Users table: Store user information
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uid VARCHAR(255) UNIQUE NOT NULL COMMENT 'Firebase UID or guest identifier',
  email VARCHAR(255),
  display_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_uid (uid),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User accounts and authentication';

-- Chat sessions table: Track conversation sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_name VARCHAR(255) COMMENT 'Optional name for the chat session',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Chat conversation sessions';

-- Chat messages table: Store all chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content LONGTEXT NOT NULL,
  tokens_used INT DEFAULT 0 COMMENT 'Number of tokens used for this message',
  model VARCHAR(100) COMMENT 'AI model used (e.g., gpt-4o)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_role (role),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Individual chat messages';

-- Documents table: Track uploaded documents
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL COMMENT 'System filename',
  original_filename VARCHAR(255) NOT NULL COMMENT 'Original uploaded filename',
  file_type ENUM('APP', 'APR', 'OTHER') NOT NULL COMMENT 'Annual Performance Plan or Report',
  file_path VARCHAR(500) COMMENT 'Path to stored file',
  file_size INT COMMENT 'File size in bytes',
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed BOOLEAN DEFAULT FALSE COMMENT 'Whether document has been processed',
  processed_date TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_file_type (file_type),
  INDEX idx_upload_date (upload_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Uploaded documents (APP/APR)';

-- Document chunks table: Store document chunks with embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  chunk_index INT NOT NULL COMMENT 'Order of chunk in document',
  content LONGTEXT NOT NULL COMMENT 'Text content of chunk',
  embedding JSON COMMENT 'Vector embedding for semantic search',
  metadata JSON COMMENT 'Additional metadata (page number, section, etc.)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  INDEX idx_document_id (document_id),
  INDEX idx_chunk_index (chunk_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Document chunks for RAG and embeddings';

-- Programmes table: Store programme information
CREATE TABLE IF NOT EXISTS programmes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  programme_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Government programmes being audited';

-- Indicators table: Store performance indicators
CREATE TABLE IF NOT EXISTS indicators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  programme_id INT NOT NULL,
  indicator_name TEXT NOT NULL,
  target VARCHAR(255),
  actual_achievement VARCHAR(255),
  variance VARCHAR(255),
  reason_for_deviation TEXT,
  assessment_result TEXT COMMENT 'Assessment conclusion',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE,
  INDEX idx_programme_id (programme_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Key Performance Indicators';

-- Audit reports table: Store generated audit reports
CREATE TABLE IF NOT EXISTS audit_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_id INT,
  report_type ENUM('consistency', 'measurability', 'relevance', 'presentation') NOT NULL,
  report_data LONGTEXT COMMENT 'Full report content',
  pdf_path VARCHAR(500) COMMENT 'Path to generated PDF',
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_report_type (report_type),
  INDEX idx_generated_at (generated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Generated audit reports';

-- Audit logs table: Track user actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL COMMENT 'Action performed (e.g., login, upload, export)',
  details TEXT COMMENT 'Additional details about the action',
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='System audit trail';

-- User preferences table: Store user settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE NOT NULL,
  dark_mode BOOLEAN DEFAULT FALSE,
  default_model VARCHAR(100) DEFAULT 'gpt-4o',
  settings JSON COMMENT 'Additional user preferences',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User application preferences';

-- Insert default guest user
INSERT IGNORE INTO users (uid, display_name)
VALUES ('guest', 'Guest User');
