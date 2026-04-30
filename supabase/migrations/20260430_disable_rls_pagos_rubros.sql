-- Fix: pagos_proveedor y rubros tenían RLS habilitado pero sin policies,
-- bloqueando todos los INSERT desde la app (el control de acceso pasa por
-- la capa de aplicación, igual que las demás tablas — ver disable_rls.sql).
--
-- Síntoma: "new row violates row-level security policy" al cargar pagos.

ALTER TABLE pagos_proveedor DISABLE ROW LEVEL SECURITY;
ALTER TABLE rubros          DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('pagos_proveedor', 'rubros');
