import { useState } from 'react'
import type { RegistroMoper } from '../App'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { SignaturePad } from './SignaturePad'

const API = '/api'

const FIRMAS = [
  { key: 'conformidad', label: 'Firma de conformidad', colAt: 'firma_conformidad_at', colNombre: 'firma_conformidad_nombre', colImagen: 'firma_conformidad_imagen' },
  { key: 'rh', label: 'Recursos Humanos', colAt: 'firma_rh_at', colNombre: 'firma_rh_nombre', colImagen: 'firma_rh_imagen' },
  { key: 'gerente', label: 'Gerente de Operaciones', colAt: 'firma_gerente_at', colNombre: 'firma_gerente_nombre', colImagen: 'firma_gerente_imagen' },
  { key: 'control', label: 'Centro de Control', colAt: 'firma_control_at', colNombre: 'firma_control_nombre', colImagen: 'firma_control_imagen' },
] as const

interface FirmasWorkflowProps {
  registroId: number
  registro: RegistroMoper | null
  onFirmaRegistrada: () => void
}

export function FirmasWorkflow({ registroId, registro, onFirmaRegistrada }: FirmasWorkflowProps) {
  const [activo, setActivo] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const registrarFirma = async (tipo: string, imagen: string) => {
    setEnviando(true)
    try {
      const res = await fetch(`${API}/moper/${registroId}/firma`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, imagen }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setActivo(null)
      onFirmaRegistrada()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al registrar firma')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="mt-8 border-2 border-oxford-300 rounded-lg p-4 bg-white" id="firmas-pdf">
      <h2 className="text-base font-bold text-black border-b border-oxford-300 pb-2 mb-4">Workflow de Firmas</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIRMAS.map(({ key, label, colAt, colNombre, colImagen }) => {
          const fecha = registro ? (registro[colAt as keyof RegistroMoper] as string | null) : null
          const nombreFirma = registro ? (registro[colNombre as keyof RegistroMoper] as string | null) : null
          const imagenFirma = registro ? (registro[colImagen as keyof RegistroMoper] as string | null) : null
          const firmado = !!fecha

          return (
            <div
              key={key}
              className="border-2 border-oxford-300 rounded p-3 bg-oxford-50/50"
            >
              <div className="font-medium text-oxford-800 text-sm mb-2">{label}</div>
              {firmado ? (
                <div className="text-sm">
                  {imagenFirma ? (
                    <div className="flex flex-col gap-1">
                      <img
                        src={imagenFirma}
                        alt="Firma"
                        className="max-h-14 w-auto border border-oxford-200 rounded bg-white"
                      />
                      <p className="text-oxford-600">{fecha && format(new Date(fecha), "d 'de' MMMM yyyy, HH:mm", { locale: es })}</p>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-black">{nombreFirma}</p>
                      <p className="text-oxford-600">{fecha && format(new Date(fecha), "d 'de' MMMM yyyy, HH:mm", { locale: es })}</p>
                    </>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActivo(key)}
                  className="px-3 py-1.5 bg-black text-white rounded text-sm font-medium hover:bg-oxford-800"
                >
                  Firmar
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal: panel para dibujar la firma */}
      {activo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && setActivo(null)}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-oxford-900 mb-3">
              {FIRMAS.find((f) => f.key === activo)?.label}
            </h3>
            <SignaturePad
              label="Dibuje su firma en el recuadro"
              onConfirm={(dataUrl) => activo && registrarFirma(activo, dataUrl)}
              onCancel={() => setActivo(null)}
            />
            {enviando && <p className="mt-2 text-sm text-oxford-600">Guardando firma...</p>}
          </div>
        </div>
      )}

      {registro?.completado && (
        <p className="mt-4 text-center font-bold text-green-700">Movimiento completado. Puede generar el PDF.</p>
      )}
    </section>
  )
}
