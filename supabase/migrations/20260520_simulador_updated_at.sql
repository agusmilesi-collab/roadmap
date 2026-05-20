-- Agrega updated_at a simulador_rubros y simulador_proveedores con triggers
-- automáticos. Necesario para mostrar la fecha de última actualización del
-- catálogo en la home del simulador.

BEGIN;

ALTER TABLE simulador_rubros
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE simulador_proveedores
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION set_updated_at_simulador()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS simulador_rubros_set_updated_at ON simulador_rubros;
CREATE TRIGGER simulador_rubros_set_updated_at
BEFORE UPDATE ON simulador_rubros
FOR EACH ROW EXECUTE FUNCTION set_updated_at_simulador();

DROP TRIGGER IF EXISTS simulador_proveedores_set_updated_at ON simulador_proveedores;
CREATE TRIGGER simulador_proveedores_set_updated_at
BEFORE UPDATE ON simulador_proveedores
FOR EACH ROW EXECUTE FUNCTION set_updated_at_simulador();

COMMIT;

SELECT
    GREATEST(
        (SELECT MAX(updated_at) FROM simulador_rubros),
        (SELECT MAX(updated_at) FROM simulador_proveedores)
    ) AS ultima_actualizacion;
