import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { api } from '../../services/api';
import {
  Send,
  Eraser,
  Calendar,
  AlertCircle,
  Apple,
  Pill,
  Shirt,
  Gamepad2,
  Bath,
  Droplet,
} from 'lucide-react';

interface RegistrationFormProps {
  onSuccess: (id: string) => void;
  jornadaId: string;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSuccess, jornadaId }) => {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cedula, setCedula] = useState('');
  const [sexo, setSexo] = useState<'Masculino' | 'Femenino'>('Masculino');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [donaciones, setDonaciones] = useState<string[]>([]);

  const TIPOS_DONACION = [
    { label: 'Comida', icon: <Apple size={16} /> },
    { label: 'Medicamentos', icon: <Pill size={16} /> },
    { label: 'Ropa', icon: <Shirt size={16} /> },
    { label: 'Juguetes', icon: <Gamepad2 size={16} /> },
    { label: 'Higiene', icon: <Bath size={16} /> },
    { label: 'Agua', icon: <Droplet size={16} /> },
  ];

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 200 });

  const sigCanvas = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.offsetWidth,
          height: 200,
        });
      }
    };

    // Initial size
    updateSize();

    // Update size on window resize (debounced slightly or just direct)
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (sigCanvas.current?.isEmpty()) {
      setError('La firma es obligatoria.');
      return;
    }

    if (donaciones.length === 0) {
      setError('Debes seleccionar al menos un tipo de donación.');
      return;
    }

    setSubmitting(true);
    try {
      const dataUrl = sigCanvas.current.getCanvas().toDataURL('image/png');
      const signatureFile = dataURLtoFile(dataUrl, `firma_${cedula}_${Date.now()}.png`);

      if (!signatureFile) throw new Error('No se pudo generar el archivo de la firma.');

      let ip_captura = 'Desconocida';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        ip_captura = data.ip;
      } catch {
        console.warn('No se pudo obtener la IP pública');
      }

      const saved = await api.saveBeneficiary(
        {
          nombre,
          apellido,
          cedula,
          sexo,
          fecha_nacimiento: fechaNacimiento,
          tipo_donacion: donaciones,
          jornada_id: jornadaId,
          ip_captura,
        },
        signatureFile,
      );

      onSuccess(saved.id);
    } catch {
      console.error(err);
      setError(err.message || 'Error al guardar el beneficiario.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      {error && (
        <div
          style={{
            padding: '0.8rem',
            backgroundColor: 'var(--danger-light, #fee2e2)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div>
        <h3
          style={{
            fontSize: '1.1rem',
            color: 'var(--primary)',
            marginBottom: '1rem',
            borderBottom: '2px solid var(--neutral-light)',
            paddingBottom: '0.5rem',
          }}
        >
          DATOS PERSONALES
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cédula de Identidad * (Solo números)</label>
            <input
              type="text"
              className="app-input"
              placeholder="Ej: 12345678"
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
              required
              disabled={submitting}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nombre *</label>
            <input
              type="text"
              className="app-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Apellido *</label>
            <input
              type="text"
              className="app-input"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '1rem',
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Sexo *</label>
            <select
              className="app-input"
              value={sexo}
              onChange={(e) => setSexo(e.target.value as any)}
              disabled={submitting}
            >
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Fecha de Nacimiento *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                className="app-input"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                required
                disabled={submitting}
              />
              <Calendar
                size={18}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'var(--neutral-dark)',
                  opacity: 0.5,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3
          style={{
            fontSize: '1.1rem',
            color: 'var(--primary)',
            marginBottom: '1rem',
            borderBottom: '2px solid var(--neutral-light)',
            paddingBottom: '0.5rem',
          }}
        >
          TIPO DE DONACIÓN *
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {TIPOS_DONACION.map((tipo) => {
            const isSelected = donaciones.includes(tipo.label);
            return (
              <button
                key={tipo.label}
                type="button"
                onClick={() => {
                  setDonaciones((prev) =>
                    isSelected ? prev.filter((t) => t !== tipo.label) : [...prev, tipo.label],
                  );
                }}
                disabled={submitting}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '20px',
                  border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--neutral-light)'}`,
                  backgroundColor: isSelected ? 'rgba(0,143,166,0.1)' : '#fff',
                  color: isSelected ? 'var(--accent)' : 'var(--neutral-dark)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {tipo.icon}
                {tipo.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3
          style={{
            fontSize: '1.1rem',
            color: 'var(--primary)',
            marginBottom: '1rem',
            borderBottom: '2px solid var(--neutral-light)',
            paddingBottom: '0.5rem',
          }}
        >
          FIRMA AUTÓGRAFA *
        </h3>
        <div
          ref={containerRef}
          style={{
            border: '2px dashed var(--border-color)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#fff',
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            touchAction: 'none',
          }}
        >
          <SignatureCanvas
            ref={sigCanvas}
            backgroundColor="rgb(255,255,255)"
            canvasProps={{
              width: canvasSize.width,
              height: canvasSize.height,
              className: 'sigCanvas',
              style: { cursor: 'crosshair', touchAction: 'none' },
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={clearSignature}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              padding: '0.4rem 0.8rem',
              backgroundColor: 'var(--neutral-light)',
              color: 'var(--neutral-dark)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
            }}
            disabled={submitting}
          >
            <Eraser size={14} /> Limpiar Lienzo
          </button>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '1rem',
            fontSize: '1.1rem',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {submitting ? (
            'Guardando...'
          ) : (
            <>
              <Send size={20} /> ENVIAR REGISTRO
            </>
          )}
        </button>
      </div>
    </form>
  );
};
