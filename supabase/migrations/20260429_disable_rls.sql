-- Disable RLS on the new tables to match the access pattern of the rest
-- of the schema (access control happens at the app layer).
-- Run this once after the schema migration.

ALTER TABLE fases               DISABLE ROW LEVEL SECURITY;
ALTER TABLE temas               DISABLE ROW LEVEL SECURITY;
ALTER TABLE tareas              DISABLE ROW LEVEL SECURITY;
ALTER TABLE acuerdos            DISABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_fases    DISABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_temas    DISABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_tareas   DISABLE ROW LEVEL SECURITY;
