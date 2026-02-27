import { jsPDF } from 'jspdf'
import type { RegistroMoper } from '../App'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

/** Formatea solo la fecha (sin hora) para mostrar en PDF */
function soloFecha(val: string | null | undefined): string {
  if (!val || !val.trim()) return '-'
  const s = val.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return val
  try {
    return format(parseISO(s), 'd MMM yyyy', { locale: es })
  } catch {
    return s
  }
}

const FOOTER_LEGAL = [
  'No. de Registro Federal Permanente DGSP/139-17-3371',
  'No. de Registro Estatal NL: DCSESP/57-16/II  No. de Registro Estatal Coah. CES/ESP/331/14',
]

const A4_W_MM = 210
const A4_H_MM = 297

/** Logo en encabezado: ancho (más amplio), relación aspecto width/height para no deformar (ej. 2.5 = logo horizontal). */
const HEADER_LOGO_W_MM = 85
const HEADER_LOGO_ASPECT_RATIO = 2.5 // ancho/alto → alto = ancho/2.5
const HEADER_LOGO_H_MM = HEADER_LOGO_W_MM / HEADER_LOGO_ASPECT_RATIO

/** Carga la imagen del logo y la devuelve como data URL para el PDF (prueba image.png y logo.png). */
export function loadLogoAsDataUrl(): Promise<string | null> {
  const tryLoad = (url: string) =>
    fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then(
        (blob) =>
          new Promise<string | null>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(blob)
          })
      )
  return tryLoad('/image.png').catch(() => tryLoad('/logo.png').catch(() => null))
}

/** Dibuja un recuadro tipo tabla (borde) y opcionalmente línea inferior. */
function drawBox(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.rect(x, y, w, h)
}

export function generarPDF(registro: RegistroMoper, logoDataUrl?: string | null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = A4_W_MM
  const margin = 18
  const contentW = pageW - 2 * margin
  let y = margin

  // Logo en encabezado: amplio, centrado, proporción correcta (sin deformar)
  if (logoDataUrl && logoDataUrl.startsWith('data:image/')) {
    try {
      const xLogo = (pageW - HEADER_LOGO_W_MM) / 2
      doc.addImage(logoDataUrl, 'PNG', xLogo, y, HEADER_LOGO_W_MM, HEADER_LOGO_H_MM)
      y += HEADER_LOGO_H_MM + 6
    } catch {
      // Si falla el logo, se omite
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('TACTICAL', margin, y)
  doc.text('SUPPORT', pageW - margin - doc.getTextWidth('SUPPORT'), y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Movimiento de Personal (MOPER)', pageW / 2, y, { align: 'center' })
  y += 8

  // ——— Sección: Datos del documento (con recuadro tipo tabla) ———
  const yDocStart = y
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const folio = registro.folio || 'SPT/No. ----/MOP'
  const docLines = [
    ['Folio', folio],
    ['Creado por', registro.creado_por || '-'],
    ['Fecha de creación', registro.created_at ? format(new Date(registro.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es }) : '-'],
    ['Solicitado por', registro.solicitado_por || '-'],
    ['Fecha de llenado', registro.fecha_llenado || '-'],
    ['Fecha de registro', registro.fecha_registro || '-'],
  ]
  const pad = 4
  docLines.forEach(([label, value]) => {
    doc.text(label + ': ' + value, margin + pad, y + 4)
    y += 6
  })
  y += 4
  drawBox(doc, margin, yDocStart - 2, contentW, y - yDocStart + 2)
  y += 6

  // ——— A. Datos Generales (con recuadro) ———
  const yDatosStart = y
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('A. Datos Generales', margin + pad, y + 4)
  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const datosLines = [
    ['Oficial', registro.oficial_nombre || ''],
    ['CURP', registro.curp || ''],
    ['Fecha de Ingreso', soloFecha(registro.fecha_ingreso)],
    ['Fecha Inicio Efectiva', soloFecha(registro.fecha_inicio_efectiva)],
  ]
  datosLines.forEach(([label, value]) => {
    doc.text(label + ': ' + value, margin + pad, y + 4)
    y += 6
  })
  y += 4
  drawBox(doc, margin, yDatosStart - 2, contentW, y - yDatosStart + 2)
  y += 6

  // ——— B. Comparativa de Movimiento (tabla con líneas) ———
  const yTablaStart = y
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('B. Comparativa de Movimiento', margin + pad, y + 4)
  y += 8
  const colW = contentW / 3
  const rowH = 7
  const headers = ['Campo', 'Situación ACTUAL', 'Situación NUEVA']
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  for (let i = 0; i < 3; i++) doc.text(headers[i], margin + i * colW + pad, y + 4)
  y += rowH
  doc.line(margin, y, pageW - margin, y)
  doc.setFont('helvetica', 'normal')
  const rows = [
    ['Servicio', registro.servicio_actual_nombre || '-', registro.servicio_nuevo_nombre || '-'],
    ['Puesto', registro.puesto_actual_nombre || '-', registro.puesto_nuevo_nombre || '-'],
    ['Sueldo Mensual', registro.sueldo_actual != null ? `$ ${Number(registro.sueldo_actual).toLocaleString('es-MX')}` : '-', registro.sueldo_nuevo != null ? `$ ${Number(registro.sueldo_nuevo).toLocaleString('es-MX')}` : '-'],
    ['Motivo', '-', registro.motivo || '-'],
  ]
  rows.forEach(([campo, actual, nuevo]) => {
    doc.text(campo, margin + pad, y + 4)
    doc.text(actual, margin + colW + pad, y + 4)
    doc.text(nuevo, margin + 2 * colW + pad, y + 4)
    const nextY = y + rowH
    doc.line(margin, nextY, pageW - margin, nextY)
    doc.line(margin + colW, y, margin + colW, nextY)
    doc.line(margin + 2 * colW, y, margin + 2 * colW, nextY)
    y = nextY
  })
  doc.line(margin, yTablaStart - 2, margin, y)
  doc.line(margin + colW, yTablaStart - 2, margin + colW, y)
  doc.line(margin + 2 * colW, yTablaStart - 2, margin + 2 * colW, y)
  doc.line(pageW - margin, yTablaStart - 2, pageW - margin, y)
  doc.line(margin, yTablaStart - 2, pageW - margin, yTablaStart - 2)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  // ——— Firmas (con recuadro) ———
  const yFirmasStart = y
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Firmas', margin + pad, y + 4)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const firmas = [
    { label: 'Firma de conformidad', nombre: registro.firma_conformidad_nombre, fecha: registro.firma_conformidad_at, imagen: registro.firma_conformidad_imagen },
    { label: 'Gerente RH', nombre: registro.firma_rh_nombre, fecha: registro.firma_rh_at, imagen: registro.firma_rh_imagen },
    { label: 'Gerente de Operaciones', nombre: registro.firma_gerente_nombre, fecha: registro.firma_gerente_at, imagen: registro.firma_gerente_imagen },
    { label: 'Centro de Control', nombre: registro.firma_control_nombre, fecha: registro.firma_control_at, imagen: registro.firma_control_imagen },
  ]
  const sigW = (pageW - 2 * margin) / 2
  const imgH = 12
  const imgW = 40
  firmas.forEach((f, i) => {
    const col = i % 2
    const x = margin + col * sigW + 2
    if (col === 0) y += 6
    doc.setFont('helvetica', 'bold')
    doc.text(f.label, x, y)
    doc.setFont('helvetica', 'normal')
    if (f.imagen) {
      try {
        doc.addImage(f.imagen, 'PNG', x, y + 2, imgW, imgH)
        doc.text(f.fecha ? format(new Date(f.fecha), "d MMM yyyy, HH:mm", { locale: es }) : '', x, y + 2 + imgH + 4)
      } catch {
        doc.text(f.nombre || '_________________', x, y + 5)
        doc.text(f.fecha ? format(new Date(f.fecha), "d MMM yyyy, HH:mm", { locale: es }) : '_________________', x, y + 10)
      }
    } else {
      doc.text(f.nombre || '_________________', x, y + 5)
      doc.text(f.fecha ? format(new Date(f.fecha), "d MMM yyyy, HH:mm", { locale: es }) : '_________________', x, y + 10)
    }
    if (col === 1) y += f.imagen ? 20 : 16
  })
  if (firmas.length % 2 === 1) y += 20
  y += 4
  drawBox(doc, margin, yFirmasStart - 2, contentW, y - yFirmasStart + 2)

  const footerY = A4_H_MM - 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  FOOTER_LEGAL.forEach((line, i) => {
    doc.text(line, pageW / 2, footerY + i * 4, { align: 'center' })
  })

  doc.save(`MOPER_${(registro.folio || 'sin-folio').replace(/\s*\//g, '-')}.pdf`)
}
