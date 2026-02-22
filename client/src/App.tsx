import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { PanelLateral } from './components/PanelLateral'
import { FormularioMoper } from './components/FormularioMoper'
import { FirmasWorkflow } from './components/FirmasWorkflow'
import { FooterLegal } from './components/FooterLegal'
import { LoginPanel } from './components/LoginPanel'
import { VistaPorCodigo } from './components/VistaPorCodigo'
import { useAuth } from './context/AuthContext'
import { API } from './api'
import { generarPDF, loadLogoAsDataUrl } from './utils/pdf'

export interface RegistroMoper {
  id?: number
  folio: string
  oficial_nombre?: string
  curp: string
  fecha_ingreso: string | null
  fecha_inicio_efectiva: string
  sueldo_actual: number | null
  sueldo_nuevo: number
  motivo: string
  servicio_actual_nombre?: string
  servicio_nuevo_nombre?: string
  puesto_actual_nombre?: string
  puesto_nuevo_nombre?: string
  creado_por?: string | null
  solicitado_por?: string | null
  created_at?: string | null
  firma_conformidad_at?: string | null
  firma_conformidad_nombre?: string | null
  firma_conformidad_imagen?: string | null
  firma_rh_at?: string | null
  firma_rh_nombre?: string | null
  firma_rh_imagen?: string | null
  firma_gerente_at?: string | null
  firma_gerente_nombre?: string | null
  firma_gerente_imagen?: string | null
  firma_control_at?: string | null
  firma_control_nombre?: string | null
  firma_control_imagen?: string | null
  completado?: boolean
  codigo_acceso?: string | null
}

export default function App() {
  const { user, accesoPorCodigo, loading, authHeaders } = useAuth()
  const [folioPreview, setFolioPreview] = useState('SPT/No. 0280/MOP')
  const [registroId, setRegistroId] = useState<number | null>(null)
  const [registroCompleto, setRegistroCompleto] = useState<RegistroMoper | null>(null)
  const [refreshPanel, setRefreshPanel] = useState(0)

  useEffect(() => {
    if (!user) return
    fetch(`${API}/api/folios/preview`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => d.folio && setFolioPreview(d.folio))
      .catch(() => {})
  }, [user, authHeaders])

  const cargarRegistro = useCallback((id: number) => {
    fetch(`${API}/api/moper/${id}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((r) => {
        setRegistroCompleto(r)
        if (r.folio) setFolioPreview(r.folio)
      })
      .catch(() => setRegistroCompleto(null))
  }, [authHeaders])

  const onGuardar = useCallback((id: number, folio: string | null) => {
    setRegistroId(id)
    if (folio) setFolioPreview(folio)
    cargarRegistro(id)
    setRefreshPanel((k) => k + 1)
  }, [cargarRegistro])

  const onFirmaRegistrada = useCallback(() => {
    setRefreshPanel((k) => k + 1)
    if (registroId != null) cargarRegistro(registroId)
  }, [registroId, cargarRegistro])

  const onSeleccionarRegistro = useCallback((id: number) => {
    setRegistroId(id)
    cargarRegistro(id)
  }, [cargarRegistro])

  const onGenerarPDF = useCallback(() => {
    if (!registroCompleto) return
    loadLogoAsDataUrl().then((logo) => generarPDF(registroCompleto, logo))
  }, [registroCompleto])

  const actualizarFolioPreview = useCallback(() => {
    fetch(`${API}/api/folios/preview`).then((r) => r.json()).then((d) => d.folio && setFolioPreview(d.folio)).catch(() => {})
  }, [])

  const onNuevoRegistro = useCallback(() => {
    setRegistroId(null)
    setRegistroCompleto(null)
    actualizarFolioPreview()
  }, [actualizarFolioPreview])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-oxford-50">
        <p className="text-oxford-600">Cargando...</p>
      </div>
    )
  }
  if (accesoPorCodigo) {
    return <VistaPorCodigo />
  }
  if (!user) {
    return <LoginPanel />
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <PanelLateral
          registroIdActual={registroId}
          onSeleccionarRegistro={onSeleccionarRegistro}
          onNuevoRegistro={onNuevoRegistro}
          refreshTrigger={refreshPanel}
        />
        <main className="flex-1 min-w-0 max-w-4xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 overflow-auto">
          <p className="text-center font-bold text-oxford-800 text-base sm:text-lg mb-4 sm:mb-6">
            Movimiento de Personal (MOPER)
          </p>
          <div className="border-2 border-oxford-300 rounded-lg p-3 sm:p-4 mb-4 bg-oxford-50/30 space-y-2">
          <div>
            <span className="text-oxford-600 text-sm font-medium">Folio: </span>
            <span className="font-mono font-semibold text-black">
              {registroCompleto?.folio ?? folioPreview}
              {registroId && !registroCompleto?.folio && (
                <span className="text-oxford-500 font-normal"> (asignado al firmar conformidad)</span>
              )}
            </span>
          </div>
          {registroCompleto?.codigo_acceso && (
            <div className="text-sm">
              <span className="text-oxford-600 font-medium">Código de acceso para el oficial: </span>
              <span className="font-mono font-semibold text-black">{registroCompleto.codigo_acceso}</span>
              <span className="text-oxford-500 ml-1">(compartir con quien firma conformidad)</span>
            </div>
          )}
        </div>
        <FormularioMoper
          onGuardar={onGuardar}
          registroId={registroId}
          registro={registroCompleto}
        />
        {registroId && (
          <>
            <FirmasWorkflow
              registroId={registroId}
              registro={registroCompleto}
              onFirmaRegistrada={onFirmaRegistrada}
            />
            {registroCompleto?.completado && (
              <div className="mt-6 flex flex-wrap gap-3 justify-end">
                <button
                  type="button"
                  onClick={onGenerarPDF}
                  className="px-4 py-3 min-h-[44px] bg-black text-white rounded border-2 border-black font-medium hover:bg-oxford-800 touch-manipulation"
                >
                  Descargar PDF
                </button>
                <button
                  type="button"
                  onClick={onNuevoRegistro}
                  className="px-4 py-3 min-h-[44px] border-2 border-oxford-400 text-oxford-800 rounded font-medium hover:bg-oxford-100 touch-manipulation"
                >
                  Nuevo registro
                </button>
              </div>
            )}
          </>
        )}
        </main>
      </div>
      <FooterLegal />
    </div>
  )
}
