-- Restore es_custom / nombre_display columns on plantillas_fases.
-- Used by PlantillasClient to support user-defined event types beyond
-- the base set (boda, quince, cumple, baby_shower).

ALTER TABLE plantillas_fases
  ADD COLUMN IF NOT EXISTS es_custom boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS nombre_display text;
