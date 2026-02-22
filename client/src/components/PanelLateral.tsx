import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '../context/AuthContext'
import { API } from '../api'

export interface ResumenRegistros {
  pendientes: number
  aprobados: number
  registrosPendientes: { id: number; folio: string | null; oficial_nombre: string | null; fecha_hora: string | null }[]
  registrosAprobados: { id: number; folio: string | null; oficial_nombre: string | null; fecha_hora: string | null }[]
}

interface PanelLateralProps {
  registroIdActual: number | null
  onSeleccionarRegistro: (id: number) => void
  onNuevoRegistro: () => void
  refreshTrigger?: number
}

export function PanelLateral({ registroIdActual, onSeleccionarRegistro, onNuevoRegistro, refreshTrigger = 0 }: PanelLateralProps) {
  const { authHeaders } = useAuth()
  const [resumen, setResumen] = useState<ResumenRegistros | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errorApi, setErrorApi] = useState<string | null>(null)

  const cargar = () => {
    setCargando(true)
    setErrorApi(null)
    fetch(`${API}/api/moper`, { headers: authHeaders() })
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (ok) setResumen(data)
        else {
          setResumen(null)
          setErrorApi(data.detail ? `${data.error || 'Error'}: ${data.detail}` : (data.error || 'Error al cargar'))
        }
      })
      .catch(() => {
        setResumen(null)
        setErrorApi('Error de conexión')
      })
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
    let id: ReturnType<typeof setInterval> | null = null
    const tick = () => {
      if (document.hidden) return
      cargar()
    }
    const onVisibility = () => {
      if (id) clearInterval(id)
      id = null
      if (!document.hidden) {
        cargar()
        id = setInterval(tick, 20_000)
      }
    }
    if (!document.hidden) id = setInterval(tick, 20_000)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (id) clearInterval(id)
    }
  }, [])

  useEffect(() => {
    if (refreshTrigger > 0) cargar()
  }, [refreshTrigger])

  const pendientes = resumen?.pendientes ?? 0
  const aprobados = resumen?.aprobados ?? 0
  const listPend = resumen?.registrosPendientes ?? []
  const listAprob = resumen?.registrosAprobados ?? []

  return (
    <aside className="w-full md:w-72 shrink-0 border-b-2 md:border-b-0 md:border-r-2 border-oxford-200 bg-oxford-50/50 flex flex-col max-h-[40vh] md:max-h-none overflow-hidden">
      <div className="p-2 sm:p-3 border-b border-oxford-200 shrink-0">
        <button
          type="button"
          onClick={onNuevoRegistro}
          className="w-full py-3 px-3 min-h-[44px] bg-black text-white rounded text-sm font-medium hover:bg-oxford-800 touch-manipulation"
        >
          Nuevo registro
        </button>
      </div>

      {cargando ? (
        <div className="p-3 text-sm text-oxford-500">Cargando...</div>
      ) : errorApi ? (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          {errorApi}
        </div>
      ) : (
        <>
          {/* Aprobaciones pendientes */}
          <div className="p-3 border-b border-oxford-200">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-bold text-oxford-800">Aprobaciones pendientes</span>
              {pendientes > 0 && (
                <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold">
                  {pendientes}
                </span>
              )}
            </div>
            {pendientes === 0 ? (
              <p className="text-xs text-oxford-500">Ninguna</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {listPend.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => onSeleccionarRegistro(r.id)}
                      className={`w-full text-left text-xs py-1.5 px-2 rounded border truncate block ${
                        registroIdActual === r.id
                          ? 'bg-oxford-200 border-oxford-400 font-medium'
                          : 'bg-white border-oxford-200 hover:bg-oxford-100'
                      }`}
                      title={`${r.oficial_nombre || 'Sin nombre'} – ${r.folio || 'Sin folio'}`}
                    >
                      <span className="font-mono text-oxford-600">{r.folio || `#${r.id}`}</span>
                      <span className="ml-1 truncate">{r.oficial_nombre || '—'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Registros aprobados */}
          <div className="p-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-bold text-oxford-800">Registros aprobados</span>
              {aprobados > 0 && (
                <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-green-600 text-white text-xs font-bold">
                  {aprobados}
                </span>
              )}
            </div>
            {aprobados === 0 ? (
              <p className="text-xs text-oxford-500">Ninguno</p>
            ) : (
              <ul className="space-y-1 flex-1 overflow-y-auto min-h-0">
                {listAprob.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => onSeleccionarRegistro(r.id)}
                      className={`w-full text-left text-xs py-1.5 px-2 rounded border truncate block ${
                        registroIdActual === r.id
                          ? 'bg-green-100 border-green-400 font-medium'
                          : 'bg-white border-oxford-200 hover:bg-oxford-100'
                      }`}
                      title={`${r.oficial_nombre || 'Sin nombre'} – ${r.folio || ''}`}
                    >
                      <span className="font-mono text-oxford-600">{r.folio || `#${r.id}`}</span>
                      <span className="ml-1 truncate">{r.oficial_nombre || '—'}</span>
                      {r.fecha_hora && (
                        <span className="block text-oxford-500 mt-0.5">
                          {format(new Date(r.fecha_hora), 'd MMM yyyy', { locale: es })}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
