-- Fix: las tablas del simulador quedaron con RLS habilitado pese al
-- DISABLE en 20260520_simulador.sql (mismo síntoma que pagos_proveedor/rubros
-- en 20260430_disable_rls_pagos_rubros.sql). El control de acceso pasa por
-- la capa de aplicación.

ALTER TABLE simuladores           DISABLE ROW LEVEL SECURITY;
ALTER TABLE simulador_items       DISABLE ROW LEVEL SECURITY;
ALTER TABLE simulador_rubros      DISABLE ROW LEVEL SECURITY;
ALTER TABLE simulador_proveedores DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('simuladores', 'simulador_items', 'simulador_rubros', 'simulador_proveedores')
ORDER BY tablename;
