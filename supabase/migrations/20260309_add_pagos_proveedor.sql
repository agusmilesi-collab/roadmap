-- 1. Create pagos_proveedor table
CREATE TABLE IF NOT EXISTS pagos_proveedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubro_id uuid NOT NULL REFERENCES rubros(id) ON DELETE CASCADE,
  monto numeric NOT NULL,
  moneda text DEFAULT 'USD' CHECK (moneda IN ('USD', 'ARS')),
  tipo_cambio_snapshot numeric,
  fecha date NOT NULL,
  realizado boolean DEFAULT false,
  descripcion text,
  created_at timestamptz DEFAULT now()
);

-- 2. Add new columns to rubros
ALTER TABLE rubros
  ADD COLUMN IF NOT EXISTS costo_total numeric,
  ADD COLUMN IF NOT EXISTS descripcion_servicio text;

-- 3. Migrate existing data: create seña + saldo pagos for rubros that have monto_original and sena_pct
--    Run this in a DO block so we can use plpgsql logic
DO $$
DECLARE
  r RECORD;
  monto_sena numeric;
  monto_saldo numeric;
  fecha_evento date;
BEGIN
  FOR r IN
    SELECT ru.id, ru.monto_original, ru.sena_pct, ru.fecha_sena, ru.moneda, ev.fecha_evento
    FROM rubros ru
    JOIN eventos ev ON ev.id = ru.evento_id
    WHERE ru.monto_original IS NOT NULL
      AND ru.sena_pct IS NOT NULL
      AND ru.sena_pct > 0
      AND NOT EXISTS (SELECT 1 FROM pagos_proveedor WHERE rubro_id = ru.id)
  LOOP
    monto_sena  := r.monto_original * (r.sena_pct / 100.0);
    monto_saldo := r.monto_original - monto_sena;
    fecha_evento := r.fecha_evento;

    -- Pago 1: seña
    INSERT INTO pagos_proveedor (rubro_id, monto, moneda, fecha, realizado, descripcion)
    VALUES (
      r.id,
      monto_sena,
      r.moneda,
      COALESCE(r.fecha_sena, CURRENT_DATE),
      false,
      'Seña'
    );

    -- Pago 2: saldo
    INSERT INTO pagos_proveedor (rubro_id, monto, moneda, fecha, realizado, descripcion)
    VALUES (
      r.id,
      monto_saldo,
      r.moneda,
      fecha_evento,
      false,
      'Saldo'
    );
  END LOOP;
END $$;
