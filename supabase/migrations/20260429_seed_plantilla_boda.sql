-- Seed: plantilla "boda" (Decisiones.md structure)
-- Run after 20260429_temas_hierarchy.sql if seed didn't apply.

DELETE FROM plantillas_fases WHERE tipo_evento = 'boda';

DO $$
DECLARE
  fase1 uuid; fase2 uuid; fase3 uuid; fase4 uuid;
  tema  uuid;
BEGIN
  -- ─── ETAPA 1: Base del evento (meses 9 → 6 antes) ───
  INSERT INTO plantillas_fases (tipo_evento, nombre, descripcion, meses_antes_inicio, meses_antes_fin, position)
  VALUES ('boda', 'Base del evento',
          'Todo lo que define la estructura de la boda. Punto de partida para cotizaciones y decisiones macro.',
          9, 6, 1)
  RETURNING id INTO fase1;

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase1, 'Invitados',
          'Lista lo más real posible, ordenada por apellido. Incluir menús especiales, hospedaje, transporte.',
          30, 1)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Armar Excel base por apellido', 1),
    (tema, 'Marcar menús especiales y edades de menores', 2),
    (tema, 'Identificar invitados que viajan', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase1, 'Ceremonias',
          'Decisión sobre ceremonia religiosa, civil y localidad.',
          45, 2)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Definir si hay ceremonia religiosa', 1),
    (tema, 'Decidir si el civil va en la boda', 2),
    (tema, 'Definir localidad de la ceremonia', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase1, 'Catering',
          'Propuesta alineada al storytelling. Evaluar proveedores y elegir el que se adecue al presupuesto.',
          60, 3)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Listar 5 proveedores candidatos', 1),
    (tema, 'Pedir presupuestos', 2),
    (tema, 'Realizar degustaciones', 3),
    (tema, 'Decidir y firmar contrato', 4);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase1, 'Barra / Bebidas',
          'Vino, birra, tragos. Ligado al servicio de catering.',
          70, 4)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Evaluar proveedores de barra', 1),
    (tema, 'Definir carta (vino, birra, tragos)', 2),
    (tema, 'Firmar contrato', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase1, 'Fotografía & Video',
          'Estilo, cobertura y definición para save the date.',
          50, 5)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Investigar referencias de estilo', 1),
    (tema, 'Reunión con candidatos', 2),
    (tema, 'Definir cobertura (¿desde dónde empieza el relato?)', 3),
    (tema, 'Save the date', 4);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase1, 'DJ / Musicalización',
          'Alineado con storytelling y energía de los novios.',
          75, 6)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Investigar DJs candidatos', 1),
    (tema, 'Reunión con candidato elegido', 2),
    (tema, 'Firmar contrato', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase1, 'Ambientación / Diseño integral',
          'Materialización del storytelling en el venue. Layout y materialidad.',
          80, 7)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Definir layout', 1),
    (tema, 'Definir materialidad', 2),
    (tema, 'Aprobar presupuesto', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase1, 'Transporte y hospedaje',
          'Logística de novios e invitados: hoteles, Airbnb, bus.',
          85, 8)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Investigar hoteles y Airbnb', 1),
    (tema, 'Definir bus para invitados', 2),
    (tema, 'Confirmar reservas', 3);

  -- ─── ETAPA 2 ───
  INSERT INTO plantillas_fases (tipo_evento, nombre, descripcion, meses_antes_inicio, meses_antes_fin, position)
  VALUES ('boda', 'Construcción de experiencia',
          'Todo lo que le da identidad y recorrido al evento — capas técnicas, gráficas y de entretenimiento sobre la base ya definida.',
          5, 4, 2)
  RETURNING id INTO fase2;

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase2, 'Iluminación y sonido',
          'Relevamiento técnico para transición día → noche.',
          15, 1)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Enviar relevamiento al técnico', 1),
    (tema, 'Aprobar presupuesto', 2);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase2, 'Torta y mesa dulce',
          'Definir si hay torta, estética y proveedor de mesa dulce.',
          30, 2)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Definir si va torta', 1),
    (tema, 'Buscar proveedores', 2),
    (tema, 'Definir estética', 3),
    (tema, 'Confirmar mesa dulce con catering', 4);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase2, 'Papelería & gráfica',
          'Identidad visual: invitación, menús, cartelería, señalética, QR fotos.',
          45, 3)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Brief al diseñador', 1),
    (tema, 'Aprobar invitación', 2),
    (tema, 'Aprobar piezas restantes', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase2, 'Entretenimiento',
          'Shows, bandas, intervenciones, cotillón. Alineado al storytelling.',
          55, 4)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Brainstorm con novios', 1),
    (tema, 'Buscar proveedores', 2),
    (tema, 'Confirmar intervenciones', 3);

  -- ─── ETAPA 3 ───
  INSERT INTO plantillas_fases (tipo_evento, nombre, descripcion, meses_antes_inicio, meses_antes_fin, position)
  VALUES ('boda', 'Detalle y personalidad',
          'Lo que hace que sea "su boda". Look de los novios, alianzas e invitaciones definitivas.',
          3, 2, 3)
  RETURNING id INTO fase3;

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase3, 'Look novia: vestido',
          'Pruebas y ajustes según modista o vestido comprado.',
          40, 1)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Primera prueba', 1),
    (tema, 'Ajustes intermedios', 2),
    (tema, 'Última prueba', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase3, 'Look novia: beauty (make-up & hair)',
          'Pruebas con maquilladora y peluquero.',
          45, 2)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Prueba make-up', 1),
    (tema, 'Prueba peinado', 2),
    (tema, 'Confirmar look final', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase3, 'Traje novio',
          'Definición y ajustes.',
          40, 3)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Elegir traje', 1),
    (tema, 'Ajustes', 2);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase3, 'Alianzas',
          'Selección y compra.',
          20, 4)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Visitar joyerías', 1),
    (tema, 'Elegir alianzas', 2),
    (tema, 'Comprar', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase3, 'Invitaciones',
          'Definición final y envío.',
          30, 5)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Aprobar diseño final', 1),
    (tema, 'Imprimir', 2),
    (tema, 'Enviar', 3);

  -- ─── ETAPA 4 ───
  INSERT INTO plantillas_fases (tipo_evento, nombre, descripcion, meses_antes_inicio, meses_antes_fin, position)
  VALUES ('boda', 'Ajustes finales',
          'Afinar, confirmar, cerrar. Reuniones de repaso integral y toma de decisiones operativas.',
          1, 0, 4)
  RETURNING id INTO fase4;

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase4, 'Confirmación de invitados',
          'Lista final consolidada.',
          10, 1)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Cerrar lista', 1),
    (tema, 'Asignar mesas', 2),
    (tema, 'Compartir lista final con catering', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, dias_desde_inicio_etapa, position)
  VALUES (fase4, 'Reunión general',
          'Repaso integral: timing del evento, degustación catering, barra, mesa dulce, momentos musicales.',
          20, 2)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Definir timing del evento', 1),
    (tema, 'Degustación final', 2),
    (tema, 'Confirmar momentos musicales', 3),
    (tema, 'Briefing final a todos los proveedores', 4);

END $$;

-- Verify
SELECT 'plantillas_fases' AS tabla, count(*) FROM plantillas_fases WHERE tipo_evento = 'boda'
UNION ALL
SELECT 'plantillas_temas', count(*) FROM plantillas_temas
UNION ALL
SELECT 'plantillas_tareas', count(*) FROM plantillas_tareas;
