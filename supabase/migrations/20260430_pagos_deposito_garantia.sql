-- Extiende pagos_proveedor para soportar depósitos en garantía.
--
-- Modelo:
--   - tipo='cuota'              → pago habitual (default, retrocompatible)
--   - tipo='sena'               → seña inicial
--   - tipo='deposito_garantia'  → depósito retornable. Se devuelve al final
--                                 si todo OK. devuelto + fecha_devolucion lo
--                                 marcan cuando vuelve.
--
-- Cashflow:
--   - cuota/sena realizado=true  → barra normal en fecha
--   - deposito realizado=true && devuelto=false → barra normal + esperado retorno
--   - deposito devuelto=true     → barra positiva (verde) en fecha_devolucion

DO $$
BEGIN
    -- tipo
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pagos_proveedor' AND column_name = 'tipo'
    ) THEN
        ALTER TABLE pagos_proveedor
            ADD COLUMN tipo text NOT NULL DEFAULT 'cuota'
            CHECK (tipo IN ('cuota', 'sena', 'deposito_garantia'));
    END IF;

    -- devuelto
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pagos_proveedor' AND column_name = 'devuelto'
    ) THEN
        ALTER TABLE pagos_proveedor
            ADD COLUMN devuelto boolean NOT NULL DEFAULT false;
    END IF;

    -- fecha_devolucion
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pagos_proveedor' AND column_name = 'fecha_devolucion'
    ) THEN
        ALTER TABLE pagos_proveedor
            ADD COLUMN fecha_devolucion date;
    END IF;
END $$;

-- Index para queries por tipo (filtrar depósitos rápido)
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_tipo ON pagos_proveedor (tipo);

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'pagos_proveedor'
ORDER BY ordinal_position;
