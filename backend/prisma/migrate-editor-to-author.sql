-- Migration: Change EDITOR role to AUTHOR before removing EDITOR from enum
-- Run this BEFORE 'npx prisma db push'

UPDATE "User" SET role = 'AUTHOR' WHERE role = 'EDITOR';
