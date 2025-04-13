-- Drop existing tables if they exist
DROP TABLE IF EXISTS users;

-- Create Users Table
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    user_status VARCHAR(1) NOT NULL CHECK (user_status IN ('A', 'I', 'T')),
    department VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_user_name ON users (user_name);

-- Optional: Trigger to update `updated_at` timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Sample Data (Optional)
INSERT INTO users (user_name, first_name, last_name, email, user_status, department) VALUES
('johndoe', 'John', 'Doe', 'john.doe@example.com', 'A', 'Engineering'),
('janedoe', 'Jane', 'Doe', 'jane.doe@example.com', 'I', 'Marketing'),
('inactiveuser', 'Inactive', 'Person', 'inactive@example.com', 'T', 'Former');
