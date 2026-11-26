import React, { useMemo, useState } from 'react';
import { Search, UserCheck, X } from 'lucide-react';
import type { Beneficiary } from '../services/api';

interface MemberAutocompleteProps {
  id: string;
  label: string;
  members: Beneficiary[];
  selectedMemberId: string;
  onSelect: (member: Beneficiary | null) => void;
  placeholder?: string;
  required?: boolean;
}

export const MemberAutocomplete: React.FC<MemberAutocompleteProps> = ({
  id,
  label,
  members,
  selectedMemberId,
  onSelect,
  placeholder = 'Buscar miembro por nombre o cédula...',
  required = false,
}) => {
  const [query, setQuery] = useState('');

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedMemberId) ?? null,
    [members, selectedMemberId],
  );

  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return members
      .filter((m) => {
        const fullName = `${m.nombre} ${m.apellido}`.toLowerCase();
        const cedula = (m.cedula || '').toLowerCase();
        return fullName.includes(normalized) || cedula.includes(normalized);
      })
      .slice(0, 8);
  }, [members, query]);

  const handleSelectMember = (member: Beneficiary) => {
    onSelect(member);
    setQuery('');
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
  };

  return (
    <div style={{ display: 'grid', gap: '0.45rem' }}>
      <label htmlFor={id} className="form-field-label">
        {label}
      </label>

      {selectedMember ? (
        <div
          data-testid={`${id}-selected`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #10b981',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <UserCheck size={16} />
            {selectedMember.nombre} {selectedMember.apellido} ({selectedMember.cedula})
          </span>
          <button
            type="button"
            aria-label="Cambiar miembro"
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              color: '#065f46',
              cursor: 'pointer',
              padding: '0.15rem',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
                pointerEvents: 'none',
              }}
            />
            <input
              id={id}
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              required={required && !selectedMemberId}
            />
          </div>

          {query.trim().length > 0 && (
            <div
              role="listbox"
              aria-label="Resultados de miembros"
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                maxHeight: '200px',
                overflowY: 'auto',
                display: 'grid',
              }}
            >
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => handleSelectMember(member)}
                    style={{
                      textAlign: 'left',
                      padding: '0.55rem 0.85rem',
                      border: 'none',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.88rem',
                      color: '#0f172a',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      {member.nombre} {member.apellido}
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{member.cedula}</span>
                  </button>
                ))
              ) : (
                <div
                  style={{
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.85rem',
                    color: '#64748b',
                  }}
                >
                  No se encontraron miembros con &ldquo;{query.trim()}&rdquo;.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
