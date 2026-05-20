-- Limpieza: el seed de 20260520_simulador.sql usaba ON CONFLICT DO NOTHING
-- sin un constraint UNIQUE en (rubro_id, nombre), por lo que si la migration
-- corrió más de una vez, los proveedores quedaron duplicados.
--
-- Borrar duplicados manteniendo el row más antiguo de cada (rubro_id, nombre).

DELETE FROM simulador_proveedores
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
            PARTITION BY rubro_id, nombre
            ORDER BY created_at, id
        ) AS rn
        FROM simulador_proveedores
    ) t
    WHERE rn > 1
);

-- Verify: debería devolver 0 filas
SELECT rubro_id, nombre, COUNT(*) AS cantidad
FROM simulador_proveedores
GROUP BY rubro_id, nombre
HAVING COUNT(*) > 1;
