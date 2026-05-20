// ─── Database types (reflecting Supabase schema) ─────────────────────────────

export type TipoEvento = 'boda' | 'quince' | 'cumple' | 'baby_shower'
export type EstadoTarea = 'pendiente' | 'en_curso' | 'completada'
export type EstadoRubro = 'pendiente' | 'en_proceso' | 'decidido' | 'señado' | 'completado'
export type Moneda = 'USD' | 'ARS'

export interface Planner {
    id: string
    nombre: string
    email: string
    telefono: string | null
    foto_url: string | null
    bio_corta: string | null
    created_at: string
}

export interface Evento {
    id: string
    nombre: string
    tipo_evento: TipoEvento
    fecha_evento: string
    presupuesto_usd: number | null
    tipo_cambio: number | null
    token_acceso: string
    planner_id: string | null
    created_at: string
    mostrar_dashboard_cliente: boolean
    mostrar_acuerdos_cliente: boolean
    // joins
    planner?: Planner
}

export interface Fase {
    id: string
    evento_id: string
    nombre: string
    descripcion: string | null
    fecha_inicio: string | null
    fecha_fin: string | null
    position: number
    created_at: string
    // joins
    temas?: Tema[]
}

export interface Tema {
    id: string
    fase_id: string
    nombre: string
    descripcion: string | null
    position: number
    created_at: string
    // joins
    tareas?: Tarea[]
    acuerdos?: Acuerdo[]
    cotizaciones?: Cotizacion[]
}

export interface Tarea {
    id: string
    tema_id: string
    nombre: string
    estado: EstadoTarea
    position: number
    created_at: string
}

export interface Acuerdo {
    id: string
    tema_id: string
    texto: string
    created_at: string
}

export interface Cotizacion {
    id: string
    tema_id: string
    proveedor: string
    link: string
    position: number
    created_at: string
}

export interface Rubro {
    id: string
    evento_id: string
    nombre: string
    estado: EstadoRubro
    proveedor: string | null
    monto_original: number | null
    moneda: Moneda
    tipo_cambio_propio: number | null
    sena_pct: number | null
    fecha_decision: string | null
    fecha_sena: string | null
    notas: string | null
    orden: number
    costo_total: number | null
    descripcion_servicio: string | null
    // joins
    pagos?: PagoProveedor[]
}

export type TipoPago = 'cuota' | 'sena' | 'deposito_garantia'

export interface PagoProveedor {
    id: string
    rubro_id: string
    monto: number
    moneda: Moneda
    tipo_cambio_snapshot: number | null
    fecha: string
    realizado: boolean
    descripcion: string | null
    created_at: string
    tipo: TipoPago
    devuelto: boolean
    fecha_devolucion: string | null
}

export interface PlantillaFase {
    id: string
    tipo_evento: TipoEvento
    nombre: string
    descripcion: string | null
    meses_antes_inicio: number
    meses_antes_fin: number
    position: number
    created_at: string
    // joins
    plantillas_temas?: PlantillaTema[]
}

export interface PlantillaTema {
    id: string
    plantilla_fase_id: string
    nombre: string
    descripcion: string | null
    position: number
    created_at: string
    // joins
    plantillas_tareas?: PlantillaTarea[]
}

export interface PlantillaTarea {
    id: string
    plantilla_tema_id: string
    nombre: string
    position: number
    created_at: string
}

export interface PlantillaRubro {
    id: string
    tipo_evento: TipoEvento
    nombre: string
    sena_pct_default: number | null
    dias_antes_decision: number | null
    moneda_default: Moneda
    orden: number
}

// ─── Simulador ───────────────────────────────────────────────────────────────

export type TipoRubroSimulador = 'fijo' | 'var'

export interface SimuladorRubro {
    id: string
    nombre: string
    tipo: TipoRubroSimulador
    opcional: boolean
    orden: number
    created_at: string
    updated_at: string
    // joins
    proveedores?: SimuladorProveedor[]
}

export interface SimuladorProveedor {
    id: string
    rubro_id: string
    nombre: string
    precio: number
    descripcion: string | null
    orden: number
    created_at: string
    updated_at: string
}

export interface Simulador {
    id: string
    nombre: string
    created_at: string
    updated_at: string
    // joins
    variantes?: SimuladorVariante[]
}

export interface SimuladorVariante {
    id: string
    simulador_id: string
    nombre: string
    cantidad_invitados: number
    orden: number
    created_at: string
    updated_at: string
    // joins
    items?: SimuladorItem[]
}

export interface SimuladorItem {
    id: string
    variante_id: string
    rubro_id: string
    proveedor_id: string | null
    incluido: boolean
    created_at: string
}

// ─── Database shape for createBrowserClient<Database> ───────────────────────
export type Database = {
    public: {
        Tables: {
            planners:           { Row: Planner;          Insert: Omit<Planner, 'id' | 'created_at'>;                                Update: Partial<Omit<Planner, 'id'>> }
            eventos:            { Row: Evento;           Insert: Omit<Evento, 'id' | 'created_at' | 'planner'>;                     Update: Partial<Omit<Evento, 'id' | 'planner'>> }
            fases:              { Row: Fase;             Insert: Omit<Fase, 'id' | 'created_at' | 'temas'>;                         Update: Partial<Omit<Fase, 'id' | 'created_at' | 'temas'>> }
            temas:              { Row: Tema;             Insert: Omit<Tema, 'id' | 'created_at' | 'tareas' | 'acuerdos'>;           Update: Partial<Omit<Tema, 'id' | 'created_at' | 'tareas' | 'acuerdos'>> }
            tareas:             { Row: Tarea;            Insert: Omit<Tarea, 'id' | 'created_at'>;                                  Update: Partial<Omit<Tarea, 'id' | 'created_at'>> }
            acuerdos:           { Row: Acuerdo;          Insert: Omit<Acuerdo, 'id' | 'created_at'>;                                Update: Partial<Omit<Acuerdo, 'id' | 'created_at'>> }
            cotizaciones:       { Row: Cotizacion;       Insert: Omit<Cotizacion, 'id' | 'created_at'>;                             Update: Partial<Omit<Cotizacion, 'id' | 'created_at'>> }
            rubros:             { Row: Rubro;            Insert: Omit<Rubro, 'id' | 'pagos'>;                                       Update: Partial<Omit<Rubro, 'id' | 'pagos'>> }
            pagos_proveedor:    { Row: PagoProveedor;    Insert: Omit<PagoProveedor, 'id' | 'created_at'>;                          Update: Partial<Omit<PagoProveedor, 'id' | 'created_at'>> }
            plantillas_fases:   { Row: PlantillaFase;    Insert: Omit<PlantillaFase, 'id' | 'created_at' | 'plantillas_temas'>;     Update: Partial<Omit<PlantillaFase, 'id' | 'created_at' | 'plantillas_temas'>> }
            plantillas_temas:   { Row: PlantillaTema;    Insert: Omit<PlantillaTema, 'id' | 'created_at' | 'plantillas_tareas'>;    Update: Partial<Omit<PlantillaTema, 'id' | 'created_at' | 'plantillas_tareas'>> }
            plantillas_tareas:  { Row: PlantillaTarea;   Insert: Omit<PlantillaTarea, 'id' | 'created_at'>;                         Update: Partial<Omit<PlantillaTarea, 'id' | 'created_at'>> }
            plantillas_rubros:     { Row: PlantillaRubro;      Insert: Omit<PlantillaRubro, 'id'>;                                      Update: Partial<Omit<PlantillaRubro, 'id'>> }
            simulador_rubros:      { Row: SimuladorRubro;      Insert: Omit<SimuladorRubro, 'id' | 'created_at' | 'updated_at' | 'proveedores'>; Update: Partial<Omit<SimuladorRubro, 'id' | 'created_at' | 'proveedores'>> }
            simulador_proveedores: { Row: SimuladorProveedor;  Insert: Omit<SimuladorProveedor, 'id' | 'created_at' | 'updated_at'>;                Update: Partial<Omit<SimuladorProveedor, 'id' | 'created_at'>> }
            simuladores:           { Row: Simulador;           Insert: Omit<Simulador, 'id' | 'created_at' | 'updated_at' | 'variantes'>; Update: Partial<Omit<Simulador, 'id' | 'created_at' | 'variantes'>> }
            simulador_variantes:   { Row: SimuladorVariante;   Insert: Omit<SimuladorVariante, 'id' | 'created_at' | 'updated_at' | 'items'>; Update: Partial<Omit<SimuladorVariante, 'id' | 'created_at' | 'items'>> }
            simulador_items:       { Row: SimuladorItem;       Insert: Omit<SimuladorItem, 'id' | 'created_at'>;                       Update: Partial<Omit<SimuladorItem, 'id' | 'created_at'>> }
        }
        Views: Record<string, never>
        Functions: Record<string, never>
        Enums: Record<string, never>
    }
}
