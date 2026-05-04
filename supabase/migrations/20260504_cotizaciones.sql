-- Cotizaciones: presupuestos que el planner alcanza al cliente, por tema.
-- Cada cotización tiene un proveedor y un link (URL al presupuesto).

CREATE TABLE IF NOT EXISTS cotizaciones (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tema_id     uuid NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
    proveedor   text NOT NULL,
    link        text NOT NULL,
    position    numeric NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cotizaciones DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cotizaciones_tema ON cotizaciones (tema_id);

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'cotizaciones'
ORDER BY ordinal_position;
