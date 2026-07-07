import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Beneficiary, Jornada } from '../services/api';

interface ReportOptions {
  records: Beneficiary[];
  jornadas: Jornada[];
  title?: string;
}

export const generateBeneficiariesReport = async ({ records, jornadas, title = 'Reporte de Beneficiarios' }: ReportOptions) => {
  // Crear documento PDF, orientación Landscape (apaisado) para que quepan bien todas las columnas
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Título
  doc.setFontSize(18);
  doc.setTextColor(21, 101, 192); // Color primario
  doc.text(title, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 14, 30);
  doc.text(`Total de Registros: ${records.length}`, 14, 35);

  const getJornadaName = (id: string) => {
    return jornadas.find(j => j.id === id)?.nombre || 'Desconocida';
  };

  const getUrlBase64 = async (url: string | null): Promise<string | null> => {
    if (!url) return null;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      const imgUrl = URL.createObjectURL(blob);
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Just in case
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(null);
          }
          URL.revokeObjectURL(imgUrl);
        };
        img.onerror = () => {
          console.warn("Error decoding image");
          resolve(null);
          URL.revokeObjectURL(imgUrl);
        };
        img.src = imgUrl;
      });
    } catch (err) {
      console.warn("Error cargando imagen", err);
      return null;
    }
  };

  // Pre-cargar imágenes para evitar problemas asíncronos dentro del renderizado de la tabla
  // Se cargan en paralelo pero con límite si son muchas (para este caso, máximo algunas decenas)
  const imagesMap: Record<string, string | null> = {};
  for (const record of records) {
    if (record.url_firma) {
      imagesMap[record.id] = await getUrlBase64(record.url_firma);
    }
  }

  // Preparar datos de la tabla
  const tableData = records.map((record, index) => {
    return [
      (index + 1).toString(),
      record.nombre,
      record.apellido,
      record.cedula,
      new Date(record.fecha_nacimiento).toLocaleDateString(),
      record.sexo,
      getJornadaName(record.jornada_id),
      // Columna IP y Fecha
      `${record.ip_captura || 'N/A'}\n${new Date(record.created_at).toLocaleString()}`,
      // Espacio para la firma (texto en blanco)
      ''
    ];
  });

  // Dibujar tabla
  autoTable(doc, {
    startY: 45,
    head: [['Nro', 'Nombre', 'Apellido', 'Cédula', 'Nacimiento', 'Sexo', 'Jornada', 'IP y Captura', 'Firma Autógrafa']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      valign: 'middle',
      halign: 'center'
    },
    headStyles: {
      fillColor: [21, 101, 192],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 22 },
      4: { cellWidth: 20 },
      5: { cellWidth: 15 },
      6: { cellWidth: 40 },
      7: { cellWidth: 35 },
      8: { cellWidth: 45 } // Celda de la firma
    },
    // Configurar para unas 30 líneas por hoja (ajustando la altura mínima de la celda)
    bodyStyles: {
      minCellHeight: 15 // Suficiente para que entren 30 líneas por página A4 Landscape y se vea la firma
    },
    didDrawCell: (data) => {
      // Si estamos en la columna de la Firma (índice 8) y es del cuerpo (body)
      if (data.column.index === 8 && data.cell.section === 'body') {
        const recordIndex = data.row.index;
        const record = records[recordIndex];
        const base64Img = imagesMap[record.id];

        if (base64Img) {
          try {
            const x = data.cell.x + 2;
            const y = data.cell.y + 2;
            const width = 40; // Ancho máximo
            const height = 11; // Alto máximo dentro de la celda de 15

            // Evitar que las firmas transparentes se vean como un cuadro negro
            doc.setFillColor(255, 255, 255);
            doc.rect(x, y, width, height, 'F');

            doc.addImage(base64Img, 'PNG', x, y, width, height);
          } catch (e) {
            console.warn("No se pudo dibujar imagen", e);
          }
        } else {
          doc.text("Sin firma", data.cell.x + 10, data.cell.y + 10);
        }
      }
    }
  });

  // Descargar PDF
  doc.save(`Reporte_Beneficiarios_${new Date().toISOString().split('T')[0]}.pdf`);
};
