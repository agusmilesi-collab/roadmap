-- Permite al admin/planner controlar si las tabs Dashboard y Acuerdos
-- son visibles para el cliente en su vista compartida.
-- Default true para no romper experiencia actual.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eventos' AND column_name = 'mostrar_dashboard_cliente'
    ) THEN
        ALTER TABLE eventos ADD COLUMN mostrar_dashboard_cliente boolean NOT NULL DEFAULT true;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eventos' AND column_name = 'mostrar_acuerdos_cliente'
    ) THEN
        ALTER TABLE eventos ADD COLUMN mostrar_acuerdos_cliente boolean NOT NULL DEFAULT true;
    END IF;
END $$;

SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'eventos' AND column_name LIKE 'mostrar%';
