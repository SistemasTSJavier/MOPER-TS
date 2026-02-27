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

/** Logo como marca de agua de fondo: tamaño grande (+40%), centrado, opacidad baja. */
const WATERMARK_LOGO_W_MM = 196
const WATERMARK_LOGO_ASPECT_RATIO = 2.5
const WATERMARK_LOGO_H_MM = WATERMARK_LOGO_W_MM / WATERMARK_LOGO_ASPECT_RATIO
const WATERMARK_OPACITY = 0.14

const tryLoadImage = (url: string) =>
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

/** Carga la plantilla (encabezado/footer) para el PDF. */
export function loadPlantillaAsDataUrl(): Promise<string | null> {
  return tryLoadImage('/plantilla.png').catch(() => null)
}

/** Carga la imagen del logo para el PDF (prueba image.png y logo.png). */
export function loadLogoAsDataUrl(): Promise<string | null> {
  return tryLoadImage('/image.png').catch(() => tryLoadImage('/logo.png').catch(() => null))
}

/** Dibuja un recuadro (borde gris). */
function drawBox(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(160, 160, 160)
  doc.setLineWidth(0.25)
  doc.rect(x, y, w, h)
}

/** Dibuja una tabla de 2 columnas: título, fila de encabezado y filas de datos con cuadrícula. */
function drawTwoColumnTable(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  title: string,
  headers: [string, string],
  rows: [string, string][],
  pad: number
): number {
  const headerH = 7
  const rowH = 6
  const col1W = w * 0.38
  let yy = y
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(title, x + pad, yy + 4)
  yy += 6
  const tableTop = yy
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(headers[0], x + pad, yy + 4)
  doc.text(headers[1], x + col1W + pad, yy + 4)
  yy += headerH
  doc.setDrawColor(160, 160, 160)
  doc.setLineWidth(0.25)
  doc.line(x, yy, x + w, yy)
  doc.line(x + col1W, tableTop, x + col1W, yy)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  rows.forEach(([label, value]) => {
    doc.text(label, x + pad, yy + 4)
    doc.text(value, x + col1W + pad, yy + 4)
    doc.line(x, yy + rowH, x + w, yy + rowH)
    doc.line(x + col1W, yy, x + col1W, yy + rowH)
    yy += rowH
  })
  drawBox(doc, x, tableTop, w, yy - tableTop)
  return yy
}

export function generarPDF(
  registro: RegistroMoper,
  logoDataUrl?: string | null,
  plantillaDataUrl?: string | null
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = A4_W_MM
  const pageH = A4_H_MM
  const margin = 18
  const contentW = pageW - 2 * margin
  const pad = 4

  // 1. Plantilla de fondo (encabezado y footer) a página completa, simétrica
  if (plantillaDataUrl && plantillaDataUrl.startsWith('data:image/')) {
    try {
      doc.addImage(plantillaDataUrl, 'PNG', 0, 0, pageW, pageH)
    } catch {
      // Si falla la plantilla, se omite
    }
  }

  // 2. Marca de agua: logo de fondo, centrado (+40%), simétrico, transparente
  if (logoDataUrl && logoDataUrl.startsWith('data:image/')) {
    try {
      const xLogo = (pageW - WATERMARK_LOGO_W_MM) / 2
      const yLogo = (pageH - WATERMARK_LOGO_H_MM) / 2
      const gState = doc.GState({ opacity: WATERMARK_OPACITY })
      doc.setGState(gState)
      doc.addImage(logoDataUrl, 'PNG', xLogo, yLogo, WATERMARK_LOGO_W_MM, WATERMARK_LOGO_H_MM)
      doc.setGState(doc.GState({ opacity: 1 }))
    } catch {
      // Si falla la marca de agua, se omite
    }
  }

  let y = margin
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('TACTICAL', margin, y)
  doc.text('SUPPORT', pageW - margin - doc.getTextWidth('SUPPORT'), y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Movimiento de Personal (MOPER)', pageW / 2, y, { align: 'center' })
  y += 8

  // ——— Tabla: Datos del documento ———
  const folio = registro.folio || 'SPT/No. ----/MOP'
  const docRows: [string, string][] = [
    ['Folio', folio],
    ['Creado por', registro.creado_por || '-'],
    ['Fecha de llenado', registro.created_at ? format(new Date(registro.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es }) : '-'],
    ['Solicitado por', registro.solicitado_por || '-'],
  ]
  y = drawTwoColumnTable(doc, margin, y, contentW, 'Datos del documento', ['Campo', 'Valor'], docRows, pad)
  y += 6

  // ——— Tabla: A. Datos Generales ———
  const datosRows: [string, string][] = [
    ['Oficial', registro.oficial_nombre || '-'],
    ['CURP', registro.curp || '-'],
    ['Fecha de Ingreso', soloFecha(registro.fecha_ingreso)],
    ['Fecha Inicio Efectiva', soloFecha(registro.fecha_inicio_efectiva)],
  ]
  y = drawTwoColumnTable(doc, margin, y, contentW, 'A. Datos Generales', ['Campo', 'Valor'], datosRows, pad)
  y += 6

  // ——— Tabla: B. Comparativa de Movimiento ———
  const yTablaStart = y
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('B. Comparativa de Movimiento', margin + pad, y + 4)
  y += 8
  doc.setDrawColor(160, 160, 160)
  doc.setLineWidth(0.25)
  const colW = contentW / 3
  const rowH = 7
  const headers = ['Campo', 'Situación ACTUAL', 'Situación NUEVA']
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  for (let i = 0; i < 3; i++) doc.text(headers[i], margin + i * colW + pad, y + 4)
  y += rowH
  doc.line(margin, y, pageW - margin, y)
  doc.line(margin + colW, yTablaStart + 6, margin + colW, y)
  doc.line(margin + 2 * colW, yTablaStart + 6, margin + 2 * colW, y)
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
  drawBox(doc, margin, yTablaStart + 6, contentW, y - yTablaStart - 6)
  y += 6

  // ——— Tabla: Firmas (2 columnas, 4 filas) ———
  const firmas = [
    { label: 'Firma de conformidad', nombre: registro.firma_conformidad_nombre, fecha: registro.firma_conformidad_at, imagen: registro.firma_conformidad_imagen },
    { label: 'Gerente RH', nombre: registro.firma_rh_nombre, fecha: registro.firma_rh_at, imagen: registro.firma_rh_imagen },
    { label: 'Gerente de Operaciones', nombre: registro.firma_gerente_nombre, fecha: registro.firma_gerente_at, imagen: registro.firma_gerente_imagen },
    { label: 'Centro de Control', nombre: registro.firma_control_nombre, fecha: registro.firma_control_at, imagen: registro.firma_control_imagen },
  ]
  const sigW = contentW / 2
  const imgH = 12
  const imgW = 38
  const yFirmasStart = y
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Firmas', margin + pad, y + 4)
  y += 6
  const firmaRowH = 22
  const tablaFirmasY = yFirmasStart + 6
  doc.setDrawColor(160, 160, 160)
  doc.setLineWidth(0.25)
  doc.line(margin, tablaFirmasY, margin + contentW, tablaFirmasY)
  doc.line(margin, tablaFirmasY + firmaRowH, margin + contentW, tablaFirmasY + firmaRowH)
  doc.line(margin + sigW, tablaFirmasY, margin + sigW, tablaFirmasY + 2 * firmaRowH)
  drawBox(doc, margin, tablaFirmasY, contentW, 2 * firmaRowH)
  firmas.forEach((f, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = margin + col * sigW + pad
    const yy = tablaFirmasY + row * firmaRowH
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(f.label, x, yy + 5)
    doc.setFont('helvetica', 'normal')
    if (f.imagen) {
      try {
        doc.addImage(f.imagen, 'PNG', x, yy + 7, imgW, imgH)
        doc.setFontSize(8)
        doc.text(f.fecha ? format(new Date(f.fecha), "d MMM yyyy, HH:mm", { locale: es }) : '', x, yy + 7 + imgH + 3)
      } catch {
        doc.text(f.nombre || '_________________', x, yy + 12)
        doc.text(f.fecha ? format(new Date(f.fecha), "d MMM yyyy, HH:mm", { locale: es }) : '_________________', x, yy + 17)
      }
    } else {
      doc.text(f.nombre || '_________________', x, yy + 12)
      doc.text(f.fecha ? format(new Date(f.fecha), "d MMM yyyy, HH:mm", { locale: es }) : '_________________', x, yy + 17)
    }
  })
  y = tablaFirmasY + 2 * firmaRowH

  const footerY = A4_H_MM - 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  FOOTER_LEGAL.forEach((line, i) => {
    doc.text(line, pageW / 2, footerY + i * 4, { align: 'center' })
  })

  doc.save(`MOPER_${(registro.folio || 'sin-folio').replace(/\s*\//g, '-')}.pdf`)
}
