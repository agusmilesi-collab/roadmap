-- Remove deadline fields from temas. Deadlines now live only at the fase
-- level (fecha_inicio / fecha_fin). The plantilla loses the offset field too.

ALTER TABLE temas             DROP COLUMN IF EXISTS fecha_deadline;
ALTER TABLE plantillas_temas  DROP COLUMN IF EXISTS dias_desde_inicio_etapa;
