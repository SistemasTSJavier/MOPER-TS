import { useState, useCallback, useEffect } from 'react'

const API = '/api'

interface FormularioMoperProps {
  onGuardar: (id: number, folio: string) => void
  registroId: number | null
}

/** Fecha y hora local en formato para input datetime-local (yyyy-MM-ddTHH:mm) */
function fechaHoraLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function FormularioMoper({ onGuardar, registroId }: FormularioMoperProps) {
  const [nombreOficial, setNombreOficial] = useState('')
  const [curp, setCurp] = useState('')
  const [fechaHora, setFechaHora] = useState(() => fechaHoraLocal())
  const [fechaIngreso, setFechaIngreso] = useState('')
  const [fechaInicioEfectiva, setFechaInicioEfectiva] = useState('')
  const [servicioActual, setServicioActual] = useState('')
  const [servicioNuevo, setServicioNuevo] = useState('')
  const [puestoActual, setPuestoActual] = useState('')
  const [puestoNuevo, setPuestoNuevo] = useState('')
  const [sueldoActual, setSueldoActual] = useState<string>('')
  const [sueldoNuevo, setSueldoNuevo] = useState<string>('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const actualizarFechaHora = useCallback(() => setFechaHora(fechaHoraLocal()), [])
  useEffect(() => {
    const t = setInterval(actualizarFechaHora, 60_000)
    return () => clearInterval(t)
  }, [actualizarFechaHora])

  const payload = {
    oficial_nombre: nombreOficial.trim(),
    curp: curp.trim(),
    fecha_ingreso: fechaIngreso.trim() || null,
    fecha_inicio_efectiva: fechaInicioEfectiva || (() => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; })(),
    servicio_actual_nombre: servicioActual.trim(),
    servicio_nuevo_nombre: servicioNuevo.trim(),
    puesto_actual_nombre: puestoActual.trim(),
    puesto_nuevo_nombre: puestoNuevo.trim(),
    sueldo_actual: sueldoActual ? Number(sueldoActual) : null,
    sueldo_nuevo: Number(sueldoNuevo) || 0,
    motivo: motivo.trim(),
  }

  const guardar = async () => {
    if (!nombreOficial.trim()) {
      setError('Indique el nombre del oficial.')
      return
    }
    if (!fechaInicioEfectiva) {
      setError('Indique la fecha de inicio efectiva.')
      return
    }
    if (!servicioNuevo.trim() || !puestoNuevo.trim()) {
      setError('Complete servicio y puesto nuevos.')
      return
    }
    setError('')
    setGuardando(true)
    try {
      const res = await fetch(`${API}/moper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      onGuardar(data.id, data.folio ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div id="formulario-moper" className="space-y-6">
      {/* Sección A: Datos Generales */}
      <section className="border-2 border-oxford-300 rounded-lg p-4 bg-white">
        <h2 className="text-base font-bold text-black border-b border-oxford-300 pb-2 mb-4">A. Datos Generales</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-oxford-800 mb-1">Nombre del Oficial</label>
            <input
              type="text"
              value={nombreOficial}
              onChange={(e) => setNombreOficial(e.target.value)}
              placeholder="Nombre completo"
              className="w-full border-2 border-oxford-300 rounded px-3 py-2 bg-white text-black placeholder-oxford-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-oxford-800 mb-1">Fecha y Hora</label>
            <input
              type="datetime-local"
              value={fechaHora}
              readOnly
              className="w-full border-2 border-oxford-300 rounded px-3 py-2 bg-oxford-100 text-oxford-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-oxford-800 mb-1">CURP</label>
            <input
              type="text"
              value={curp}
              onChange={(e) => setCurp(e.target.value)}
              placeholder="CURP (texto libre)"
              className="w-full border-2 border-oxford-300 rounded px-3 py-2 bg-white text-black placeholder-oxford-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-oxford-800 mb-1">Fecha de Ingreso</label>
            <input
              type="date"
              value={fechaIngreso}
              onChange={(e) => setFechaIngreso(e.target.value)}
              className="w-full border-2 border-oxford-300 rounded px-3 py-2 bg-white text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-oxford-800 mb-1">Fecha de Inicio Efectiva</label>
            <input
              type="date"
              value={fechaInicioEfectiva}
              onChange={(e) => setFechaInicioEfectiva(e.target.value)}
              className="w-full border-2 border-oxford-300 rounded px-3 py-2 bg-white text-black"
            />
          </div>
        </div>
      </section>

      {/* Sección B: Comparativa */}
      <section className="border-2 border-oxford-300 rounded-lg p-4 bg-white">
        <h2 className="text-base font-bold text-black border-b border-oxford-300 pb-2 mb-4">B. Comparativa de Movimiento</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-oxford-400">
                <th className="text-left py-2 px-2 font-bold text-black border border-oxford-300">Campo</th>
                <th className="text-left py-2 px-2 font-bold text-black border border-oxford-300 bg-oxford-100">Situación ACTUAL</th>
                <th className="text-left py-2 px-2 font-bold text-black border border-oxford-300">Situación NUEVA</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-2 border border-oxford-300 font-medium">Servicio</td>
                <td className="py-2 px-2 border border-oxford-300 bg-oxford-50">
                  <input
                    type="text"
                    value={servicioActual}
                    onChange={(e) => setServicioActual(e.target.value)}
                    placeholder="Texto libre"
                    className="w-full border border-oxford-200 rounded px-2 py-1 bg-oxford-50 text-oxford-800"
                  />
                </td>
                <td className="py-2 px-2 border border-oxford-300">
                  <input
                    type="text"
                    value={servicioNuevo}
                    onChange={(e) => setServicioNuevo(e.target.value)}
                    placeholder="Texto libre"
                    className="w-full border border-oxford-300 rounded px-2 py-1 bg-white"
                  />
                </td>
              </tr>
              <tr>
                <td className="py-2 px-2 border border-oxford-300 font-medium">Puesto</td>
                <td className="py-2 px-2 border border-oxford-300 bg-oxford-50">
                  <input
                    type="text"
                    value={puestoActual}
                    onChange={(e) => setPuestoActual(e.target.value)}
                    placeholder="Texto libre"
                    className="w-full border border-oxford-200 rounded px-2 py-1 bg-oxford-50 text-oxford-800"
                  />
                </td>
                <td className="py-2 px-2 border border-oxford-300">
                  <input
                    type="text"
                    value={puestoNuevo}
                    onChange={(e) => setPuestoNuevo(e.target.value)}
                    placeholder="Texto libre"
                    className="w-full border border-oxford-300 rounded px-2 py-1 bg-white"
                  />
                </td>
              </tr>
              <tr>
                <td className="py-2 px-2 border border-oxford-300 font-medium">Sueldo Mensual</td>
                <td className="py-2 px-2 border border-oxford-300 bg-oxford-50">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={sueldoActual}
                    onChange={(e) => setSueldoActual(e.target.value)}
                    placeholder="-"
                    className="w-full border border-oxford-200 rounded px-2 py-1 bg-oxford-50"
                  />
                </td>
                <td className="py-2 px-2 border border-oxford-300">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={sueldoNuevo}
                    onChange={(e) => setSueldoNuevo(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-oxford-300 rounded px-2 py-1"
                  />
                </td>
              </tr>
              <tr>
                <td className="py-2 px-2 border border-oxford-300 font-medium">Motivo</td>
                <td className="py-2 px-2 border border-oxford-300 bg-oxford-50">-</td>
                <td className="py-2 px-2 border border-oxford-300">
                  <input
                    type="text"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Texto libre..."
                    className="w-full border border-oxford-300 rounded px-2 py-1"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!registroId && (
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="w-full sm:w-auto px-6 py-2 bg-black text-white rounded border-2 border-black font-medium hover:bg-oxford-800 disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar registro'}
        </button>
      )}
    </div>
  )
}
