-- Variantes (tabs) por simulación.
-- Antes: una simulación tenía sus items y su cantidad_invitados.
-- Ahora: una simulación tiene N variantes, cada una con su cantidad_invitados e items.
--
-- Migra los datos existentes: cada simulador actual genera una "Variante 1"
-- con su cantidad_invitados y sus items reapuntados.

BEGIN;

-- 1. Crear simulador_variantes
CREATE TABLE IF NOT EXISTS simulador_variantes (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    simulador_id        uuid NOT NULL REFERENCES simuladores(id) ON DELETE CASCADE,
    nombre              text NOT NULL,
    cantidad_invitados  integer NOT NULL DEFAULT 120 CHECK (cantidad_invitados >= 80),
    orden               numeric NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE simulador_variantes DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_simulador_variantes_simulador ON simulador_variantes (simulador_id);

-- 2. Para cada simulador existente, crear una variante "Variante 1"
INSERT INTO simulador_variantes (simulador_id, nombre, cantidad_invitados, orden, created_at, updated_at)
SELECT id, 'Variante 1', cantidad_invitados, 10, created_at, updated_at
FROM simuladores
WHERE NOT EXISTS (
    SELECT 1 FROM simulador_variantes v WHERE v.simulador_id = simuladores.id
);

-- 3. Agregar columna variante_id a simulador_items
ALTER TABLE simulador_items ADD COLUMN IF NOT EXISTS variante_id uuid REFERENCES simulador_variantes(id) ON DELETE CASCADE;

-- 4. Reapuntar los items existentes a la variante recién creada de su simulador
UPDATE simulador_items si
SET variante_id = v.id
FROM simulador_variantes v
WHERE v.simulador_id = si.simulador_id
  AND si.variante_id IS NULL;

-- 5. Marcar variante_id como NOT NULL
ALTER TABLE simulador_items ALTER COLUMN variante_id SET NOT NULL;

-- 6. Drop unique constraint anterior (simulador_id, rubro_id) — busca el nombre dinámicamente
DO $$
DECLARE
    cn text;
BEGIN
    SELECT conname INTO cn
    FROM pg_constraint
    WHERE conrelid = 'simulador_items'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%simulador_id%';
    IF cn IS NOT NULL THEN
        EXECUTE format('ALTER TABLE simulador_items DROP CONSTRAINT %I', cn);
    END IF;
END $$;

-- 7. Drop columna simulador_id e índice
DROP INDEX IF EXISTS idx_simulador_items_simulador;
ALTER TABLE simulador_items DROP COLUMN IF EXISTS simulador_id;

-- 8. Nuevo UNIQUE + index sobre variante_id
ALTER TABLE simulador_items ADD CONSTRAINT simulador_items_variante_rubro_key UNIQUE (variante_id, rubro_id);
CREATE INDEX IF NOT EXISTS idx_simulador_items_variante ON simulador_items (variante_id);

-- 9. cantidad_invitados ahora vive en variantes
ALTER TABLE simuladores DROP COLUMN IF EXISTS cantidad_invitados;

COMMIT;

-- Verify: cada simulador debería tener al menos una variante con sus items
SELECT
    s.nombre AS simulador,
    v.nombre AS variante,
    v.cantidad_invitados,
    COUNT(si.id) AS items
FROM simuladores s
LEFT JOIN simulador_variantes v ON v.simulador_id = s.id
LEFT JOIN simulador_items si ON si.variante_id = v.id
GROUP BY s.id, s.nombre, v.id, v.nombre, v.cantidad_invitados, v.orden
ORDER BY s.nombre, v.orden;
