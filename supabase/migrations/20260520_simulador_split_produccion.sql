-- Separar el rubro "Producción" (USD 7000) en dos:
--   - Honorarios de Organización (USD 4000)  ← renombre + ajuste del existente
--   - Honorarios de Ambientación (USD 3000)  ← rubro nuevo, agregado a variantes

BEGIN;

UPDATE simulador_rubros
SET nombre = 'Honorarios de Organización'
WHERE nombre = 'Producción';

UPDATE simulador_proveedores
SET precio = 4000
WHERE rubro_id = (SELECT id FROM simulador_rubros WHERE nombre = 'Honorarios de Organización')
  AND nombre = 'TMP';

INSERT INTO simulador_rubros (nombre, tipo, opcional, orden)
VALUES ('Honorarios de Ambientación', 'fijo', false, 15)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO simulador_proveedores (rubro_id, nombre, precio, orden)
SELECT id, 'TMP', 3000, 10
FROM simulador_rubros
WHERE nombre = 'Honorarios de Ambientación'
ON CONFLICT DO NOTHING;

-- Items en variantes existentes para que sus totales sigan dando 7000 (4000+3000)
INSERT INTO simulador_items (variante_id, rubro_id, proveedor_id, incluido)
SELECT v.id, nr.id, np.id, true
FROM simulador_variantes v
CROSS JOIN simulador_rubros nr
JOIN simulador_proveedores np ON np.rubro_id = nr.id
WHERE nr.nombre = 'Honorarios de Ambientación'
ON CONFLICT (variante_id, rubro_id) DO NOTHING;

COMMIT;

-- Verify
SELECT r.orden, r.nombre AS rubro, p.nombre AS proveedor, p.precio
FROM simulador_rubros r
LEFT JOIN simulador_proveedores p ON p.rubro_id = r.id
WHERE r.nombre IN ('Honorarios de Organización', 'Honorarios de Ambientación')
ORDER BY r.orden, p.orden;
