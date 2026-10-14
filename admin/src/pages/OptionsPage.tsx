import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  PauseCircle,
  X,
  Sliders,
  DollarSign
} from 'lucide-react';
import { getOptionGroups, saveOptionGroup, deleteOptionGroup } from '../db';
import { formatCurrency, generateId } from '../utils/formatters';
import { useToast } from '../components/Toast';
import type { OptionGroup, OptionChoice } from '../types';

export const OptionsPage: React.FC = () => {
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'single' | 'multiple'>('single');
  const [formMin, setFormMin] = useState(0);
  const [formMax, setFormMax] = useState(1);
  const [formIsRequired, setFormIsRequired] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formOptions, setFormOptions] = useState<OptionChoice[]>([]);

  // New option input row
  const [newOptName, setNewOptName] = useState('');
  const [newOptPrice, setNewOptPrice] = useState<number>(0);

  const { showSuccess, showError, showWarning } = useToast();

  const loadAll = async () => {
    try {
      const groups = await getOptionGroups();
      setOptionGroups(groups);
    } catch (err: any) {
      showError(`Error al cargar opciones: ${err.message}`);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openCreateModal = () => {
    setEditingGroup(null);
    setFormName('');
    setFormType('single');
    setFormMin(0);
    setFormMax(1);
    setFormIsRequired(false);
    setFormIsActive(true);
    setFormOptions([]);
    setNewOptName('');
    setNewOptPrice(0);
    setIsModalOpen(true);
  };

  const openEditModal = (og: OptionGroup) => {
    setEditingGroup(og);
    setFormName(og.name);
    setFormType(og.type);
    setFormMin(og.min);
    setFormMax(og.max);
    setFormIsRequired(og.isRequired);
    setFormIsActive(og.isActive);
    setFormOptions([...og.options]);
    setNewOptName('');
    setNewOptPrice(0);
    setIsModalOpen(true);
  };

  const handleAddOptionChoice = () => {
    if (!newOptName.trim()) {
      showWarning('Ingresá el nombre de la opción.');
      return;
    }
    const choice: OptionChoice = {
      id: generateId('opt'),
      name: newOptName.trim(),
      price: Math.max(0, Math.round(Number(newOptPrice) || 0))
    };
    setFormOptions(prev => [...prev, choice]);
    setNewOptName('');
    setNewOptPrice(0);
  };

  const handleRemoveOptionChoice = (id: string) => {
    setFormOptions(prev => prev.filter(o => o.id !== id));
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      showWarning('El nombre del grupo no puede estar vacío.');
      return;
    }

    if (formOptions.length === 0) {
      showWarning('Agregá al menos una opción a la lista.');
      return;
    }

    const groupToSave: OptionGroup = {
      id: editingGroup ? editingGroup.id : generateId('grp'),
      name: formName.trim(),
      type: formType,
      min: formIsRequired && formType === 'single' ? 1 : Math.max(0, formMin),
      max: formType === 'single' ? 1 : Math.max(1, formMax),
      isRequired: formIsRequired,
      isActive: formIsActive,
      options: formOptions
    };

    try {
      await saveOptionGroup(groupToSave);
      showSuccess(editingGroup ? 'Grupo de opciones actualizado.' : 'Grupo de opciones creado.');
      setIsModalOpen(false);
      loadAll();
    } catch (err: any) {
      showError(`Error al guardar: ${err.message}`);
    }
  };

  const handleToggleActive = async (og: OptionGroup) => {
    const updated: OptionGroup = { ...og, isActive: !og.isActive };
    try {
      await saveOptionGroup(updated);
      showSuccess(updated.isActive ? `"${og.name}" activado.` : `"${og.name}" pausado.`);
      loadAll();
    } catch (err: any) {
      showError(`Error al cambiar estado: ${err.message}`);
    }
  };

  const handleDelete = async (og: OptionGroup) => {
    const confirm = window.confirm(`¿Seguro que deseás eliminar el grupo "${og.name}"?`);
    if (!confirm) return;

    try {
      await deleteOptionGroup(og.id);
      showSuccess(`"${og.name}" eliminado correctamente.`);
      loadAll();
    } catch (err: any) {
      showError(`Error al eliminar: ${err.message}`);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Opciones y Adicionales</h2>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {optionGroups.length} grupos configurados
          </span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
          <Plus size={16} /> Nuevo Grupo
        </button>
      </div>

      {/* Option Groups List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {optionGroups.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--color-text-muted)' }}>
            <Sliders size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '15px', color: 'var(--color-text)', marginBottom: '4px' }}>
              No hay grupos de opciones
            </h3>
            <p style={{ fontSize: '12px' }}>
              Crea grupos como "Puntos de cocción", "Panes", "Salsas" o "Adicionales extra".
            </p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: '14px' }} onClick={openCreateModal}>
              <Plus size={16} /> Crear Grupo
            </button>
          </div>
        ) : (
          optionGroups.map(og => (
            <div
              key={og.id}
              className="card"
              style={{
                margin: 0,
                padding: '14px',
                opacity: og.isActive ? 1 : 0.65,
                borderLeft: og.isActive ? '3px solid #a855f7' : '3px solid var(--color-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
                    {og.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span className="badge badge-info" style={{ fontSize: '9px', padding: '2px 6px' }}>
                      {og.type === 'single' ? 'Selección única' : 'Selección múltiple'}
                    </span>
                    {og.isRequired && (
                      <span className="badge badge-danger" style={{ fontSize: '9px', padding: '2px 6px' }}>
                        Obligatorio
                      </span>
                    )}
                    {og.type === 'multiple' && (
                      <span className="badge badge-warning" style={{ fontSize: '9px', padding: '2px 6px' }}>
                        Máx: {og.max}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px', minHeight: '30px' }}
                    onClick={() => handleToggleActive(og)}
                    title={og.isActive ? 'Pausar' : 'Activar'}
                  >
                    {og.isActive ? <CheckCircle2 size={14} color="#22c55e" /> : <PauseCircle size={14} color="#f59e0b" />}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px', minHeight: '30px' }}
                    onClick={() => openEditModal(og)}
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ padding: '4px 8px', minHeight: '30px' }}
                    onClick={() => handleDelete(og)}
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Options Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {og.options.map(opt => (
                  <div
                    key={opt.id}
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 8px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{opt.name}</span>
                    <strong style={{ color: opt.price > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                      {opt.price > 0 ? `+${formatCurrency(opt.price)}` : 'Sin cargo'}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Create / Edit Option Group */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingGroup ? 'Editar Grupo de Opciones' : 'Nuevo Grupo de Opciones'}</h2>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del Grupo *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Punto de cocción, Tipo de pan, Adicionales"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Tipo de Selección</label>
                    <select
                      className="form-select"
                      value={formType}
                      onChange={e => setFormType(e.target.value as 'single' | 'multiple')}
                    >
                      <option value="single">Única (Elige 1 sola)</option>
                      <option value="multiple">Múltiple (Puede elegir varias)</option>
                    </select>
                  </div>

                  {formType === 'multiple' && (
                    <div className="form-group">
                      <label className="form-label">Máx. Selecciones</label>
                      <input
                        type="number"
                        className="form-input"
                        min="1"
                        max="20"
                        value={formMax}
                        onChange={e => setFormMax(Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <div className="switch-wrapper">
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>Selección Obligatoria</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        El cliente no podrá agregar al carrito sin elegir
                      </div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={formIsRequired}
                        onChange={e => setFormIsRequired(e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                {/* Sub-options list */}
                <div className="form-group">
                  <label className="form-label">Opciones del Grupo ({formOptions.length})</label>

                  {/* Add option input row */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nombre (ej. Panceta crocante)"
                      value={newOptName}
                      onChange={e => setNewOptName(e.target.value)}
                      style={{ flex: 2 }}
                    />
                    <input
                      type="number"
                      className="form-input"
                      placeholder="$ Extra"
                      min="0"
                      step="100"
                      value={newOptPrice || ''}
                      onChange={e => setNewOptPrice(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleAddOptionChoice}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Items list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {formOptions.map(opt => (
                      <div
                        key={opt.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <span style={{ fontSize: '13px' }}>{opt.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: opt.price > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                            {opt.price > 0 ? `+${formatCurrency(opt.price)}` : '$ 0'}
                          </span>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                            onClick={() => handleRemoveOptionChoice(opt.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {editingGroup ? 'Guardar Cambios' : 'Crear Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
