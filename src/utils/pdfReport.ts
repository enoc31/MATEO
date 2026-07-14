import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Beneficiary, Jornada } from '../services/api';

interface ReportOptions {
  records: Beneficiary[];
  jornadas: Jornada[];
  title?: string;
}

export const generateBeneficiariesReport = async ({
  records,
  jornadas,
  title = 'Reporte de Beneficiarios',
}: ReportOptions) => {
  // Crear documento PDF, orientación Landscape (apaisado)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const totalPagesExp = '{total_pages_count_string}';

  // Barra de acento estético primario (azul clásico de la marca)
  doc.setFillColor(21, 101, 192);
  doc.rect(14, 15, 2, 16, 'F');

  // Título del Reporte
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(title, 19, 22);

  // Subtítulo
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Listado oficial de control de beneficiados y entrega de donaciones.', 19, 28);

  // Información del reporte alineada a la derecha
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-VE')}`, 283, 21, {
    align: 'right',
  });
  doc.text(`Total de Registros: ${records.length}`, 283, 27, { align: 'right' });

  const getJornadaName = (id: string) => {
    return jornadas.find((j) => j.id === id)?.nombre || 'Desconocida';
  };

  const getUrlBase64 = async (url: string | null): Promise<string | null> => {
    if (!url) return null;
    try {
      const response = await fetch(url);
      const blob = await response.blob();

      const imgUrl = URL.createObjectURL(blob);
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
          } else {
            resolve(null);
          }
          URL.revokeObjectURL(imgUrl);
        };
        img.onerror = () => {
          console.warn('Error decoding image');
          resolve(null);
          URL.revokeObjectURL(imgUrl);
        };
        img.src = imgUrl;
      });
    } catch (err) {
      console.warn('Error cargando imagen', err);
      return null;
    }
  };

  // Pre-cargar firmas para evitar problemas asíncronos en el render
  const imagesMap: Record<string, string | null> = {};
  for (const record of records) {
    if (record.url_firma) {
      imagesMap[record.id] = await getUrlBase64(record.url_firma);
    }
  }

  // Mapear los datos a formato tabular
  const tableData = records.map((record, index) => {
    const numCedula = parseInt(record.cedula.replace(/\D/g, ''), 10);
    const cedulaFormatted = isNaN(numCedula)
      ? record.cedula
      : numCedula < 80000000
        ? `V-${numCedula.toLocaleString('es-VE')}`
        : `E-${numCedula.toLocaleString('es-VE')}`;

    return [
      (index + 1).toString(),
      record.nombre,
      record.apellido,
      cedulaFormatted,
      new Date(record.fecha_nacimiento).toLocaleDateString('es-VE'),
      record.sexo,
      record.tipo_donacion ? record.tipo_donacion.join(', ') : 'N/A',
      getJornadaName(record.jornada_id),
      // IP y fecha
      `${record.ip_captura || 'N/A'}\n${new Date(record.created_at).toLocaleString('es-VE')}`,
      '', // Espacio para la firma
    ];
  });

  // Generar la tabla de autoTable
  autoTable(doc, {
    startY: 38,
    head: [
      [
        'Nro',
        'Nombre',
        'Apellido',
        'Cédula',
        'Nacimiento',
        'Sexo',
        'Donaciones',
        'Jornada',
        'IP / Registro',
        'Firma de Recibido',
      ],
    ],
    body: tableData,
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      valign: 'middle',
      font: 'helvetica',
      lineColor: [226, 232, 240], // slate-200
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900 (Estilo Corporativo Premium)
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 25 },
      2: { halign: 'left', cellWidth: 25 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 22 },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'left', cellWidth: 45 },
      7: { halign: 'left', cellWidth: 45 },
      8: { halign: 'left', cellWidth: 30 },
      9: { halign: 'center', cellWidth: 35 },
    },
    bodyStyles: {
      minCellHeight: 12, // Altura balanceada para legibilidad y firmas
    },
    didDrawCell: (data) => {
      // Dibujar la firma en la columna 9 del body
      if (data.column.index === 9 && data.cell.section === 'body') {
        const recordIndex = data.row.index;
        const record = records[recordIndex];
        const base64Img = imagesMap[record.id];

        if (base64Img) {
          try {
            const cellWidth = data.cell.width;
            const cellHeight = data.cell.height;
            const imgWidth = 26;
            const imgHeight = 8;
            const x = data.cell.x + (cellWidth - imgWidth) / 2;
            const y = data.cell.y + (cellHeight - imgHeight) / 2;

            doc.setFillColor(255, 255, 255);
            doc.rect(x, y, imgWidth, imgHeight, 'F');
            doc.addImage(base64Img, 'JPEG', x, y, imgWidth, imgHeight);
          } catch (e) {
            console.warn('No se pudo renderizar la firma en PDF', e);
          }
        } else {
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184); // slate-400
          const cellWidth = data.cell.width;
          const cellHeight = data.cell.height;
          const text = 'Sin firma';
          const textWidth = doc.getTextWidth(text);
          const x = data.cell.x + (cellWidth - textWidth) / 2;
          const y = data.cell.y + cellHeight / 2 + 1.5;
          doc.text(text, x, y);
        }
      }
    },
    didDrawPage: () => {
      // Pie de Página
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400

      // Línea divisoria suave antes del pie de página
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.line(14, 196, 283, 196);

      doc.text(
        `Reporte de Entrega de Beneficios | Generado de forma segura y confidencial.`,
        14,
        202,
      );
      doc.text(`Página ${pageCount} de ${totalPagesExp}`, 283, 202, { align: 'right' });
    },
  });

  // Reemplazar marcador de páginas totales
  if (typeof doc.putTotalPages === 'function') {
    doc.putTotalPages(totalPagesExp);
  }

  // Descargar PDF
  doc.save(`Reporte_Jornada_${new Date().toISOString().split('T')[0]}.pdf`);
};
