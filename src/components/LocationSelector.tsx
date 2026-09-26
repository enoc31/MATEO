import React from 'react';
import { MapPin } from 'lucide-react';
import { VENEZUELA_LOCATIONS } from '../data/venezuelaLocations';

export interface LocationSelectorProps {
  estado: string;
  municipio: string;
  parroquia: string;
  direccionDetalle: string;
  onChangeEstado: (estado: string) => void;
  onChangeMunicipio: (municipio: string) => void;
  onChangeParroquia: (parroquia: string) => void;
  onChangeDireccionDetalle: (direccion: string) => void;
  required?: boolean;
  disabled?: boolean;
  labelDireccion?: string;
  placeholderDireccion?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  estado,
  municipio,
  parroquia,
  direccionDetalle,
  onChangeEstado,
  onChangeMunicipio,
  onChangeParroquia,
  onChangeDireccionDetalle,
  required = true,
  disabled = false,
  labelDireccion = 'Dirección de Habitación (Detallada)',
  placeholderDireccion = 'Ej. Calle 5, Sector Las Acacias, Edif. San José, Apto 4-B',
}) => {
  // Obtener municipios del estado seleccionado
  const currentEstadoObj = VENEZUELA_LOCATIONS.find((loc) => loc.estado === estado);
  const municipiosList = currentEstadoObj?.municipios || [];

  // Obtener parroquias del municipio seleccionado
  const currentMunicipioObj = municipiosList.find((m) => m.nombre === municipio);
  const parroquiasList = currentMunicipioObj?.parroquias || [];

  const handleEstadoChange = (newEstado: string) => {
    onChangeEstado(newEstado);
    const estObj = VENEZUELA_LOCATIONS.find((loc) => loc.estado === newEstado);
    if (estObj && estObj.municipios.length > 0) {
      const firstMun = estObj.municipios[0];
      onChangeMunicipio(firstMun.nombre);
      onChangeParroquia(firstMun.parroquias[0] || '');
    } else {
      onChangeMunicipio('');
      onChangeParroquia('');
    }
  };

  const handleMunicipioChange = (newMunicipio: string) => {
    onChangeMunicipio(newMunicipio);
    const munObj = municipiosList.find((m) => m.nombre === newMunicipio);
    if (munObj && munObj.parroquias.length > 0) {
      onChangeParroquia(munObj.parroquias[0]);
    } else {
      onChangeParroquia('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* Fila de Selección de Ubicación Estandarizada: Estado, Municipio, Parroquia */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Selector de Estado */}
        <div className="form-field">
          <label className="form-field-label">
            Estado {required && <span className="form-field-required">*</span>}
          </label>
          <select
            className="form-input-premium"
            value={estado}
            onChange={(e) => handleEstadoChange(e.target.value)}
            disabled={disabled}
            style={{ paddingLeft: '0.85rem' }}
            required={required}
          >
            {VENEZUELA_LOCATIONS.map((loc) => (
              <option key={loc.estado} value={loc.estado}>
                {loc.estado}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Municipio */}
        <div className="form-field">
          <label className="form-field-label">
            Municipio {required && <span className="form-field-required">*</span>}
          </label>
          <select
            className="form-input-premium"
            value={municipio}
            onChange={(e) => handleMunicipioChange(e.target.value)}
            disabled={disabled || municipiosList.length === 0}
            style={{ paddingLeft: '0.85rem' }}
            required={required}
          >
            {municipiosList.map((mun) => (
              <option key={mun.nombre} value={mun.nombre}>
                {mun.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Parroquia */}
        <div className="form-field">
          <label className="form-field-label">
            Parroquia {required && <span className="form-field-required">*</span>}
          </label>
          <select
            className="form-input-premium"
            value={parroquia}
            onChange={(e) => onChangeParroquia(e.target.value)}
            disabled={disabled || parroquiasList.length === 0}
            style={{ paddingLeft: '0.85rem' }}
            required={required}
          >
            {parroquiasList.map((parr) => (
              <option key={parr} value={parr}>
                {parr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Campo de Texto para Dirección Detallada */}
      <div className="form-field">
        <label className="form-field-label">
          {labelDireccion} {required && <span className="form-field-required">*</span>}
        </label>
        <div className="input-with-icon">
          <MapPin size={18} className="input-icon" />
          <input
            type="text"
            className="form-input-premium"
            placeholder={placeholderDireccion}
            value={direccionDetalle}
            onChange={(e) => onChangeDireccionDetalle(e.target.value)}
            disabled={disabled}
            required={required}
          />
        </div>
      </div>
    </div>
  );
};
