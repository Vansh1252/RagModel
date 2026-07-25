-- Add user_role enum and role column to users table
CREATE TYPE user_role AS ENUM ('user', 'admin');

ALTER TABLE users
  ADD COLUMN role user_role NOT NULL DEFAULT 'user';
