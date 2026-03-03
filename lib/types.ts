// ─── Database types (reflecting Supabase schema) ─────────────────────────────

export type TipoEvento = 'boda' | 'quince' | 'cumple' | 'baby_shower'
export type EstadoTarea = 'pendiente' | 'en_curso' | 'completada'
export type TipoTarea = 'reunion' | 'entregable' | 'decision'
export type EstadoRubro = 'pendiente' | 'en_proceso' | 'decidido'
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
    // joins
    planner?: Planner
}

export interface Fase {
    id: string
    evento_id: string
    nombre: string
    descripcion: string | null
    orden: number
    // joins
    tareas?: Tarea[]
}

export interface Tarea {
    id: string
    fase_id: string
    nombre: string
    fecha: string | null
    estado: EstadoTarea
    tipo: TipoTarea
    resumen: string | null
    completada: boolean
    orden: number
    // joins
    acuerdos?: Acuerdo[]
}

export interface Acuerdo {
    id: string
    tarea_id: string
    texto: string
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
    sena_pct: number | null
    fecha_decision: string | null
    fecha_sena: string | null
    notas: string | null
    orden: number
}

export interface PlantillaFase {
    id: string
    tipo_evento: TipoEvento
    nombre: string
    descripcion: string | null
    orden: number
    // joins
    plantillas_tareas?: PlantillaTarea[]
}

export interface PlantillaTarea {
    id: string
    plantilla_fase_id: string
    nombre: string
    tipo: TipoTarea
    meses_antes: number | null
    orden: number
}

export interface PlantillaRubro {
    id: string
    tipo_evento: TipoEvento
    nombre: string
    sena_pct_default: number | null
    meses_antes_decision: number | null
    moneda_default: Moneda
    orden: number
}

// ─── Database shape for createBrowserClient<Database> ───────────────────────
export type Database = {
    public: {
        Tables: {
            planners: { Row: Planner; Insert: Omit<Planner, 'id' | 'created_at'>; Update: Partial<Omit<Planner, 'id'>> }
            eventos: { Row: Evento; Insert: Omit<Evento, 'id' | 'created_at' | 'planner'>; Update: Partial<Omit<Evento, 'id' | 'planner'>> }
            fases: { Row: Fase; Insert: Omit<Fase, 'id' | 'tareas'>; Update: Partial<Omit<Fase, 'id' | 'tareas'>> }
            tareas: { Row: Tarea; Insert: Omit<Tarea, 'id' | 'acuerdos'>; Update: Partial<Omit<Tarea, 'id' | 'acuerdos'>> }
            acuerdos: { Row: Acuerdo; Insert: Omit<Acuerdo, 'id' | 'created_at'>; Update: Partial<Omit<Acuerdo, 'id'>> }
            rubros: { Row: Rubro; Insert: Omit<Rubro, 'id'>; Update: Partial<Omit<Rubro, 'id'>> }
            plantillas_fases: { Row: PlantillaFase; Insert: Omit<PlantillaFase, 'id' | 'plantillas_tareas'>; Update: Partial<Omit<PlantillaFase, 'id' | 'plantillas_tareas'>> }
            plantillas_tareas: { Row: PlantillaTarea; Insert: Omit<PlantillaTarea, 'id'>; Update: Partial<Omit<PlantillaTarea, 'id'>> }
            plantillas_rubros: { Row: PlantillaRubro; Insert: Omit<PlantillaRubro, 'id'>; Update: Partial<Omit<PlantillaRubro, 'id'>> }
        }
        Views: Record<string, never>
        Functions: Record<string, never>
        Enums: Record<string, never>
    }
}
