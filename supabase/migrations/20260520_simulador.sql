-- Simulador de presupuesto de evento (boda).
--
-- Modelado:
--   simulador_rubros        — catálogo de rubros (Producción, Locación, etc.)
--   simulador_proveedores   — opciones por rubro, con precio (USD)
--   simuladores             — simulación guardada (nombre + cant. de invitados)
--   simulador_items         — selección de proveedor por rubro en una simulación
--
-- Para rubros tipo 'var', el precio del proveedor es POR INVITADO.
-- Para rubros tipo 'fijo', el precio es total.
-- RLS desactivado siguiendo el patrón del repo (control en la capa app).

CREATE TABLE IF NOT EXISTS simulador_rubros (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      text NOT NULL UNIQUE,
    tipo        text NOT NULL CHECK (tipo IN ('fijo', 'var')),
    opcional    boolean NOT NULL DEFAULT false,
    orden       numeric NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS simulador_proveedores (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rubro_id    uuid NOT NULL REFERENCES simulador_rubros(id) ON DELETE CASCADE,
    nombre      text NOT NULL,
    precio      numeric NOT NULL CHECK (precio >= 0),
    descripcion text,
    orden       numeric NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS simuladores (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre              text NOT NULL,
    cantidad_invitados  integer NOT NULL DEFAULT 120 CHECK (cantidad_invitados >= 80),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS simulador_items (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    simulador_id    uuid NOT NULL REFERENCES simuladores(id) ON DELETE CASCADE,
    rubro_id        uuid NOT NULL REFERENCES simulador_rubros(id) ON DELETE CASCADE,
    proveedor_id    uuid REFERENCES simulador_proveedores(id) ON DELETE SET NULL,
    incluido        boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (simulador_id, rubro_id)
);

ALTER TABLE simulador_rubros      DISABLE ROW LEVEL SECURITY;
ALTER TABLE simulador_proveedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE simuladores           DISABLE ROW LEVEL SECURITY;
ALTER TABLE simulador_items       DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_simulador_proveedores_rubro ON simulador_proveedores (rubro_id);
CREATE INDEX IF NOT EXISTS idx_simulador_items_simulador   ON simulador_items (simulador_id);
CREATE INDEX IF NOT EXISTS idx_simulador_items_rubro       ON simulador_items (rubro_id);

-- ─── Seed: rubros + proveedores del cotizador HTML ──────────────────────────
INSERT INTO simulador_rubros (nombre, tipo, opcional, orden) VALUES
    ('Producción',   'fijo', false,  10),
    ('Locación',     'fijo', false,  20),
    ('Catering',     'var',  false,  30),
    ('Barra',        'var',  false,  40),
    ('Ambientación', 'fijo', false,  50),
    ('Fotografía',   'fijo', false,  60),
    ('Filmmaker',    'fijo', false,  70),
    ('DJ',           'fijo', false,  80),
    ('Técnica',      'fijo', false,  90),
    ('Florista',     'fijo', false, 100),
    ('Torta',        'fijo', true,  110),
    ('Vestido',      'fijo', true,  120),
    ('Traje',        'fijo', true,  130),
    ('Alianzas',     'fijo', true,  140),
    ('Cotillón',     'fijo', true,  150)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO simulador_proveedores (rubro_id, nombre, precio, orden)
SELECT r.id, p.nombre, p.precio, p.orden
FROM (VALUES
    ('Producción',   'TMP',                    7000,  10),

    ('Locación',     'La Delfina',             2300,  10),
    ('Locación',     'Parada Uno',             2300,  20),
    ('Locación',     'La Quinta',              3300,  30),
    ('Locación',     'La Ilusión',             8000,  40),
    ('Locación',     'La Quinta del Cholo',   10000,  50),

    ('Catering',     'Marshall',                100,  10),
    ('Catering',     'Ana Borrel',              110,  20),
    ('Catering',     'Martha Cura',             130,  30),

    ('Barra',        'Mentha',                   20,  10),
    ('Barra',        'Ley Seca',                 25,  20),
    ('Barra',        'Pepe Brandy',              34,  30),

    ('Ambientación', 'TMP gama baja',          3200,  10),
    ('Ambientación', 'TMP gama media',         5600,  20),
    ('Ambientación', 'TMP gama alta',          7500,  30),

    ('Fotografía',   'Jua Colombo',            1000,  10),
    ('Fotografía',   'Nati Merlo',             2100,  20),
    ('Fotografía',   'Antonela Castellano',    2400,  30),

    ('Filmmaker',    'Facundo Giovagnini',     1800,  10),
    ('Filmmaker',    'Opción B',               1800,  20),

    ('DJ',           'Nico Irala',             1000,  10),
    ('DJ',           'Nepote',                 2600,  20),

    ('Técnica',      'Nico',                   5000,  10),
    ('Técnica',      'Pedro',                  6500,  20),
    ('Técnica',      'Juan',                   8000,  30),

    ('Florista',     'Flavia Mansilla',        2000,  10),
    ('Florista',     'Wilkson',                2000,  20),

    ('Torta',        'Corina Venegas',          350,  10),
    ('Torta',        'Rafael Díaz',             400,  20),

    ('Vestido',      'Mac Duggal',              900,  10),
    ('Vestido',      'Las Demiero',            1200,  20),
    ('Vestido',      'Natalia Antolín',        1800,  30),

    ('Traje',        'McOwens',                1000,  10),
    ('Traje',        'Rochas',                 2700,  20),
    ('Traje',        'Etiqueta Negra',         3000,  30),

    ('Alianzas',     'Opción A',                700,  10),
    ('Alianzas',     'Opción B',               1500,  20),

    ('Cotillón',     'Opción A',                300,  10),
    ('Cotillón',     'Opción B',                500,  20),
    ('Cotillón',     'Opción C',                700,  30)
) AS p(rubro_nombre, nombre, precio, orden)
JOIN simulador_rubros r ON r.nombre = p.rubro_nombre
ON CONFLICT DO NOTHING;

-- Verify
SELECT
    r.orden,
    r.nombre        AS rubro,
    r.tipo,
    r.opcional,
    COUNT(p.id)     AS proveedores
FROM simulador_rubros r
LEFT JOIN simulador_proveedores p ON p.rubro_id = r.id
GROUP BY r.id, r.orden, r.nombre, r.tipo, r.opcional
ORDER BY r.orden;
