-- Seed: plantilla "quince"
-- Sigue la misma lógica de la plantilla boda v2:
--   E1 La conversación inicial · E2 Base del evento ·
--   E3 Construcción de experiencia · E4 Rituales y personalidad · E5 Ajustes finales
--
-- Idempotente: borra y re-inserta toda la plantilla.

DELETE FROM plantillas_fases WHERE tipo_evento = 'quince';

DO $$
DECLARE
  fase1 uuid; fase2 uuid; fase3 uuid; fase4 uuid; fase5 uuid;
  tema  uuid;
BEGIN
  -- ─── ETAPA 1: La conversación inicial (m11 → m9) ───
  INSERT INTO plantillas_fases (tipo_evento, nombre, descripcion, meses_antes_inicio, meses_antes_fin, position)
  VALUES ('quince', 'La conversación inicial',
          'Punto de partida del proyecto. Es la etapa donde escuchamos a la quinceañera y a la familia, entendemos la visión y sellamos el vínculo.',
          11, 9, 1)
  RETURNING id INTO fase1;

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase1, 'Contrato',
          'Marco legal y comercial del proyecto.',
          1)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Redactar propuesta con alcance y honorarios', 1),
    (tema, 'Reunión de revisión y ajustes con la familia', 2),
    (tema, 'Firma y entrega de copias a ambas partes', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase1, 'Locación',
          'Definición del espacio físico donde sucede todo. Condiciona capacidad, logística, estética y presupuesto.',
          2)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Shortlist de 3 opciones según brief y presupuesto', 1),
    (tema, 'Visita técnica a finalistas', 2),
    (tema, 'Reserva y seña de la locación elegida', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase1, 'Storytelling',
          'Identidad narrativa del evento. Acá descubrimos la historia de la quinceañera — sus pasiones, gustos y la energía que quiere transmitir.',
          3)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Entrevista de descubrimiento con la quinceañera', 1),
    (tema, 'Armado del moodboard y frase ancla', 2),
    (tema, 'Presentación del concepto y aprobación', 3);

  -- ─── ETAPA 2: Base del evento (m9 → m6) ───
  INSERT INTO plantillas_fases (tipo_evento, nombre, descripcion, meses_antes_inicio, meses_antes_fin, position)
  VALUES ('quince', 'Base del evento',
          'Todo lo que define la estructura de los 15. Punto de partida para cotizaciones y decisiones macro.',
          9, 6, 2)
  RETURNING id INTO fase2;

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase2, 'Invitados',
          'Lista lo más real posible: familia, amigos del colegio y entorno cercano. Incluir menús especiales, hospedaje y transporte si aplica.',
          1)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Armar Excel base por apellido', 1),
    (tema, 'Marcar menús especiales y edades de menores', 2),
    (tema, 'Identificar invitados que viajan', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase2, 'Catering',
          'Propuesta alineada al storytelling y al perfil etario. Evaluar proveedores y elegir el que se adecue al presupuesto.',
          2)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Listar 3 proveedores candidatos', 1),
    (tema, 'Pedir presupuestos', 2),
    (tema, 'Realizar degustaciones', 3),
    (tema, 'Decidir y firmar contrato', 4);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase2, 'Barra / Bebidas',
          'Bebidas sin alcohol, mocktails y opciones especiales para menores. Coordinado con catering.',
          3)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Evaluar proveedores de barra', 1),
    (tema, 'Definir carta (mocktails y bebidas sin alcohol)', 2),
    (tema, 'Firmar contrato', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase2, 'Fotografía & Video',
          'Estilo, cobertura y definición del save the date.',
          4)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Investigar referencias de estilo', 1),
    (tema, 'Reunión con candidatos', 2),
    (tema, 'Definir cobertura (¿desde dónde empieza el relato?)', 3),
    (tema, 'Save the date', 4);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase2, 'DJ / Musicalización',
          'Pieza clave en quinces. Definir la energía y los momentos musicales con la quinceañera.',
          5)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Investigar DJs candidatos', 1),
    (tema, 'Reunión con candidato elegido', 2),
    (tema, 'Firmar contrato', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase2, 'Transporte y hospedaje',
          'Logística de invitados y familia: hoteles, Airbnb, bus.',
          6)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Investigar hoteles y Airbnb', 1),
    (tema, 'Definir bus para invitados', 2),
    (tema, 'Confirmar reservas', 3);

  -- ─── ETAPA 3: Construcción de experiencia (m5 → m4) ───
  -- Ambientación arranca al inicio de la etapa porque condiciona iluminación, papelería y entretenimiento.
  INSERT INTO plantillas_fases (tipo_evento, nombre, descripcion, meses_antes_inicio, meses_antes_fin, position)
  VALUES ('quince', 'Construcción de experiencia',
          'Todo lo que le da identidad y recorrido al evento — capas técnicas, gráficas, show y cotillón sobre la base ya definida.',
          5, 4, 3)
  RETURNING id INTO fase3;

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase3, 'Ambientación / Diseño integral',
          'Materialización del storytelling en el venue. Layout y materialidad.',
          1)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Definir layout', 1),
    (tema, 'Definir materialidad', 2),
    (tema, 'Aprobar presupuesto', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase3, 'Iluminación y sonido',
          'Relevamiento técnico para transición día → noche.',
          2)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Enviar relevamiento al técnico', 1),
    (tema, 'Aprobar presupuesto', 2);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase3, 'Torta y mesa dulce',
          'Mesa dulce muy importante en los 15. Definir torta principal, candy bar y proveedores.',
          3)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Definir torta principal', 1),
    (tema, 'Buscar proveedores de mesa dulce / candy bar', 2),
    (tema, 'Definir estética', 3),
    (tema, 'Confirmar mesa dulce con catering', 4);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase3, 'Papelería & gráfica',
          'Identidad visual: invitación, menús, cartelería, señalética, QR fotos.',
          4)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Brief al diseñador', 1),
    (tema, 'Aprobar invitación', 2),
    (tema, 'Aprobar piezas restantes', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase3, 'Show y entretenimiento',
          'Animación, intervenciones artísticas, juegos. Pieza clave para mantener la energía durante toda la fiesta.',
          5)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Brainstorm con la quinceañera', 1),
    (tema, 'Buscar proveedores de animación / shows', 2),
    (tema, 'Definir guion del evento (entrada, juegos, momentos)', 3),
    (tema, 'Confirmar intervenciones', 4);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase3, 'Cotillón',
          'Cotillón temático y diferenciado. Esencial en los 15 para sostener la energía de la pista.',
          6)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Definir paleta y temática del cotillón', 1),
    (tema, 'Buscar proveedor', 2),
    (tema, 'Aprobar presupuesto y cierre de pedido', 3);

  -- ─── ETAPA 4: Rituales y personalidad (m3 → m2) ───
  INSERT INTO plantillas_fases (tipo_evento, nombre, descripcion, meses_antes_inicio, meses_antes_fin, position)
  VALUES ('quince', 'Rituales y personalidad',
          'Lo que hace que sea SU fiesta. Vals, coreografías, look completo de la quinceañera y momentos emocionales.',
          3, 2, 4)
  RETURNING id INTO fase4;

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase4, 'Vals y coreografías',
          'Vals con el padre, coreografía de entrada y posibles bailes con amigas. Requiere clases previas.',
          1)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Definir piezas musicales (vals + coreografía)', 1),
    (tema, 'Contratar profesor/a de baile', 2),
    (tema, 'Agendar y completar clases', 3),
    (tema, 'Ensayo final con padre / amigas', 4);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase4, '15 velas / 15 personas elegidas',
          'Ritual de las 15 velas con dedicatorias. Definir a quiénes invitar y coordinar el orden.',
          2)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Definir las 15 personas y el orden', 1),
    (tema, 'Redactar/coordinar dedicatorias', 2),
    (tema, 'Coordinar el ritual con DJ y animación', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase4, 'Vestido de la quinceañera',
          'Pruebas y ajustes del vestido principal. Si hay segundo cambio (más informal para la pista), incluirlo.',
          3)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Primera prueba', 1),
    (tema, 'Ajustes intermedios', 2),
    (tema, 'Definir segundo cambio (si aplica)', 3),
    (tema, 'Última prueba', 4);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase4, 'Look beauty (make-up & hair)',
          'Pruebas de maquillaje y peinado.',
          4)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Prueba make-up', 1),
    (tema, 'Prueba peinado', 2),
    (tema, 'Confirmar look final', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase4, 'Sesión de fotos previa (book de 15)',
          'Sesión de fotos antes de la fiesta. Define locación, vestuario y producción.',
          5)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Definir locación de la sesión', 1),
    (tema, 'Coordinar vestuario y maquillaje', 2),
    (tema, 'Realizar sesión y selección final de fotos', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase4, 'Invitaciones',
          'Definición final y envío.',
          6)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Aprobar diseño final', 1),
    (tema, 'Imprimir', 2),
    (tema, 'Enviar', 3);

  -- ─── ETAPA 5: Ajustes finales (m1 → m0) ───
  INSERT INTO plantillas_fases (tipo_evento, nombre, descripcion, meses_antes_inicio, meses_antes_fin, position)
  VALUES ('quince', 'Ajustes finales',
          'Afinar, confirmar, cerrar. Reuniones de repaso integral y briefing operativo.',
          1, 0, 5)
  RETURNING id INTO fase5;

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase5, 'Confirmación de invitados',
          'Lista final consolidada.',
          1)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Cerrar lista', 1),
    (tema, 'Asignar mesas', 2),
    (tema, 'Compartir lista final con catering', 3);

  INSERT INTO plantillas_temas (plantilla_fase_id, nombre, descripcion, position)
  VALUES (fase5, 'Reunión general',
          'Repaso integral: timing del evento, ensayo del vals/coreografía, briefing a proveedores y guion del show.',
          2)
  RETURNING id INTO tema;
  INSERT INTO plantillas_tareas (plantilla_tema_id, nombre, position) VALUES
    (tema, 'Definir timing del evento', 1),
    (tema, 'Ensayo final de vals y coreografías', 2),
    (tema, 'Confirmar momentos musicales y guion del show', 3),
    (tema, 'Briefing final a todos los proveedores', 4);

END $$;

-- Verify
SELECT 'plantillas_fases' AS tabla, count(*) FROM plantillas_fases WHERE tipo_evento = 'quince'
UNION ALL
SELECT 'plantillas_temas', count(*) FROM plantillas_temas pt
JOIN plantillas_fases pf ON pt.plantilla_fase_id = pf.id
WHERE pf.tipo_evento = 'quince'
UNION ALL
SELECT 'plantillas_tareas', count(*) FROM plantillas_tareas pta
JOIN plantillas_temas pt ON pta.plantilla_tema_id = pt.id
JOIN plantillas_fases pf ON pt.plantilla_fase_id = pf.id
WHERE pf.tipo_evento = 'quince';
