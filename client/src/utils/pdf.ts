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

const LOGO_HEADER_H_MM = 10

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

export function generarPDF(registro: RegistroMoper, logoDataUrl?: string | null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = A4_W_MM
  const margin = 18
  let y = 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('TACTICAL', margin, y)
  doc.text('SUPPORT', pageW - margin - doc.getTextWidth('SUPPORT'), y)
  if (logoDataUrl && logoDataUrl.startsWith('data:image/')) {
    try {
      const logoW = 25
      doc.addImage(logoDataUrl, 'PNG', pageW / 2 - logoW / 2, y - 2, logoW, LOGO_HEADER_H_MM)
    } catch {
      doc.setFontSize(10)
      doc.text('[Logo]', pageW / 2 - doc.getTextWidth('[Logo]') / 2, y)
    }
  } else {
    doc.setFontSize(10)
    doc.text('[Logo]', pageW / 2 - doc.getTextWidth('[Logo]') / 2, y)
  }
  y += LOGO_HEADER_H_MM + 2

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Movimiento de Personal (MOPER)', pageW / 2, y, { align: 'center' })
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const folio = registro.folio || 'SPT/No. ----/MOP'
  doc.text('Folio: ' + folio, margin, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('A. Datos Generales', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Oficial: ' + (registro.oficial_nombre || ''), margin, y)
  y += 5
  doc.text('CURP: ' + (registro.curp || ''), margin, y)
  y += 5
  doc.text('Fecha de Ingreso: ' + soloFecha(registro.fecha_ingreso), margin, y)
  y += 5
  doc.text('Fecha Inicio Efectiva: ' + soloFecha(registro.fecha_inicio_efectiva), margin, y)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.text('B. Comparativa de Movimiento', margin, y)
  y += 6
  const colW = (pageW - 2 * margin) / 3
  const headers = ['Campo', 'Situación ACTUAL', 'Situación NUEVA']
  doc.setFont('helvetica', 'bold')
  headers.forEach((h, i) => doc.text(h, margin + i * colW + 2, y))
  y += 6
  doc.setFont('helvetica', 'normal')
  const rows = [
    ['Servicio', registro.servicio_actual_nombre || '-', registro.servicio_nuevo_nombre || '-'],
    ['Puesto', registro.puesto_actual_nombre || '-', registro.puesto_nuevo_nombre || '-'],
    ['Sueldo Mensual', registro.sueldo_actual != null ? `$ ${Number(registro.sueldo_actual).toLocaleString('es-MX')}` : '-', registro.sueldo_nuevo != null ? `$ ${Number(registro.sueldo_nuevo).toLocaleString('es-MX')}` : '-'],
    ['Motivo', '-', registro.motivo || '-'],
  ]
  rows.forEach(([campo, actual, nuevo]) => {
    doc.text(campo, margin + 2, y)
    doc.text(actual, margin + colW + 2, y)
    doc.text(nuevo, margin + 2 * colW + 2, y)
    y += 5
  })
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Firmas', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const firmas = [
    { label: 'Firma de conformidad', nombre: registro.firma_conformidad_nombre, fecha: registro.firma_conformidad_at, imagen: registro.firma_conformidad_imagen },
    { label: 'Recursos Humanos', nombre: registro.firma_rh_nombre, fecha: registro.firma_rh_at, imagen: registro.firma_rh_imagen },
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
  y += 6

  const footerY = A4_H_MM - 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  FOOTER_LEGAL.forEach((line, i) => {
    doc.text(line, pageW / 2, footerY + i * 4, { align: 'center' })
  })

  doc.save(`MOPER_${(registro.folio || 'sin-folio').replace(/\s*\//g, '-')}.pdf`)
}
