// frontend/src/components/Prescriptions.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/apiClient';
import websocketService from '../services/websocket';
import { X, Plus, Edit2, Trash2, Calendar, Pill, FileText, AlertCircle, CheckCircle, Search } from 'lucide-react';

// ─── Email Patient Selector ───────────────────────────────────────────────────
// Shows a searchable dropdown of the doctor's own patients (by email/name).
// `patients` is the array built by the parent from appointments/prescriptions/records.
// `value` is the currently-selected patient._id; onChange(patient) calls back with the full obj.

function PatientEmailSelector({ patients, value, onChange, required }) {
  const [query, setQuery]       = useState('');
  const [open, setOpen]         = useState(false);
  const [focused, setFocused]   = useState(false);
  const wrapRef                 = useRef(null);

  // Display label for the currently-selected patient
  const selected = patients.find((p) => p._id === value);

  // Filter list
  const filtered = query.trim()
    ? patients.filter(
        (p) =>
          p.email?.toLowerCase().includes(query.toLowerCase()) ||
          p.name?.toLowerCase().includes(query.toLowerCase()),
      )
    : patients;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (patient) => {
    onChange(patient);
    setOpen(false);
    setQuery('');
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger / display */}
      <div
        className={`w-full flex items-center px-4 py-3 border rounded-xl cursor-text transition
          ${open || focused ? 'ring-2 ring-cyan-500 border-transparent' : 'border-gray-300'}
          ${selected ? 'bg-white' : 'bg-white'}`}
        onClick={() => { setOpen(true); }}
      >
        <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
        {selected && !open ? (
          <span className="flex-1 text-sm text-gray-800 truncate">
            <span className="font-medium">{selected.name}</span>
            <span className="text-gray-500 ml-2">({selected.email})</span>
          </span>
        ) : (
          <input
            type="text"
            className="flex-1 outline-none text-sm bg-transparent placeholder-gray-400"
            placeholder={selected ? `${selected.name} (${selected.email})` : 'Search patient by name or email…'}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => { setFocused(true); setOpen(true); }}
            onBlur={() => setFocused(false)}
            required={required && !value}
          />
        )}
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="ml-2 text-gray-400 hover:text-red-500 transition flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No patients found
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p._id}
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-cyan-50 transition flex items-center space-x-3 border-b border-gray-100 last:border-0"
                onMouseDown={(e) => e.preventDefault()} // keep input focused
                onClick={() => handleSelect(p)}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {p.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500 truncate">{p.email}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Hidden native select so form validation still works */}
      {required && (
        <select
          className="sr-only"
          value={value || ''}
          onChange={() => {}}
          required={required}
          tabIndex={-1}
          aria-hidden
        >
          <option value="" />
          {patients.map((p) => <option key={p._id} value={p._id}>{p.email}</option>)}
        </select>
      )}
    </div>
  );
}

// ─── Main Prescriptions component ────────────────────────────────────────────
// `doctorPatients` — optional prop injected by DoctorDashboard with the
// scoped patient list. Falls back to building the list from fetched data.

function Prescriptions({ doctorPatients }) {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showCreateModal, setShowCreateModal]     = useState(false);
  const [editingPrescription, setEditingPrescription] = useState(null);
  const [filterStatus, setFilterStatus]   = useState('all');
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');
  const [refillLoading, setRefillLoading] = useState({});

  const [formData, setFormData] = useState({
    patientId: '',
    diagnosis: '',
    medicines: [{ name: '', dosage: '', frequency: '', duration: '' }],
    advice:    '',
    validUntil: '',
  });

  // ─── Initial fetch ────────────────────────────────────────────────────────

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  // Keep local patient list in sync with parent-provided list
  useEffect(() => {
    if (doctorPatients && doctorPatients.length > 0) {
      setPatients(doctorPatients);
    }
  }, [doctorPatients]);

  // ─── Real-time WebSocket listeners ───────────────────────────────────────

  useEffect(() => {
    const handleCreated = (data) => {
      // Support both { prescription, type:'created' } and bare prescription object
      const prescription = data?.prescription || (data?._id ? data : null);
      if (prescription) {
        setPrescriptions((prev) => {
          if (prev.some((p) => p._id === prescription._id)) return prev;
          return [prescription, ...prev];
        });
      }
    };

    const handleUpdated = (data) => {
      const prescription = data?.prescription || (data?._id ? data : null);
      if (prescription) {
        setPrescriptions((prev) =>
          prev.map((p) => (p._id === prescription._id ? prescription : p))
        );
      }
    };

    const handleDeleted = (data) => {
      const id = data?.prescriptionId || data?._id;
      if (id) {
        setPrescriptions((prev) => prev.filter((p) => p._id !== id));
      }
    };

    websocketService.onPrescriptionCreated(handleCreated);
    websocketService.onPrescriptionUpdated(handleUpdated);
    websocketService.onPrescriptionDeleted(handleDeleted);

    return () => {
      websocketService.offPrescriptionCreated(handleCreated);
      websocketService.offPrescriptionUpdated(handleUpdated);
      websocketService.offPrescriptionDeleted(handleDeleted);
    };
  }, []);

  // ─── Data fetching ────────────────────────────────────────────────────────

  // Helper: extract an array from various API response shapes
  // Handles: plain array, { prescriptions: [] }, { data: [] }, etc.
  const extractArray = (data, keys = []) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  };

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setError('');

      if (user?.role === 'patient') {
        // Patients only need prescriptions — skip the doctor-only cross-fetches
        const prescRes = await apiClient.get('/prescriptions').catch(() => ({ data: [] }));
        const prescriptionsData = extractArray(prescRes.data, ['prescriptions', 'data']);
        setPrescriptions(prescriptionsData);
        return;
      }

      // Doctor path: fetch all three sources to build the patient list
      const [prescRes, appointRes, recordsRes] = await Promise.all([
        apiClient.get('/prescriptions').catch(() => ({ data: [] })),
        apiClient.get('/appointments').catch(() => ({ data: [] })),
        apiClient.get('/health-records').catch(() => ({ data: [] })),
      ]);

      const prescriptionsData = extractArray(prescRes.data, ['prescriptions', 'data']);
      const appointmentsData  = extractArray(appointRes.data, ['appointments', 'data']);
      const recordsData       = extractArray(recordsRes.data, ['records', 'data']);

      setPrescriptions(prescriptionsData);

      // Build scoped patient list (doctorPatients prop takes priority — see other useEffect)
      if (!(doctorPatients && doctorPatients.length > 0)) {
        const patientMap = new Map();

        const addPatient = (patientObj) => {
          if (!patientObj) return;
          const id = patientObj._id || patientObj;
          if (typeof id !== 'string') return;
          if (!patientMap.has(id)) {
            patientMap.set(id, {
              _id:   id,
              name:  patientObj.name  || 'Unknown Patient',
              email: patientObj.email || '',
            });
          }
        };

        prescriptionsData.forEach((p) => addPatient(p.patientId));
        appointmentsData.forEach((a)  => addPatient(a.patientId));
        recordsData.forEach((r)       => addPatient(r.patientId));

        setPatients([...patientMap.values()].sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (err) {
      setError('Failed to load prescriptions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Modal helpers ────────────────────────────────────────────────────────

  const handleCreateClick = () => {
    setEditingPrescription(null);
    setFormData({
      patientId: '',
      diagnosis: '',
      medicines: [{ name: '', dosage: '', frequency: '', duration: '' }],
      advice:    '',
      validUntil: '',
    });
    setShowCreateModal(true);
  };

  const handleEditClick = (prescription) => {
    setEditingPrescription(prescription);
    setFormData({
      patientId:  prescription.patientId?._id || prescription.patientId,
      diagnosis:  prescription.diagnosis || '',
      medicines:  prescription.medicines || [{ name: '', dosage: '', frequency: '', duration: '' }],
      advice:     prescription.advice    || '',
      validUntil: prescription.validUntil
        ? new Date(prescription.validUntil).toISOString().split('T')[0]
        : '',
    });
    setShowCreateModal(true);
  };

  const handleAddMedicine = () => {
    setFormData({
      ...formData,
      medicines: [...formData.medicines, { name: '', dosage: '', frequency: '', duration: '' }],
    });
  };

  const handleRemoveMedicine = (index) => {
    setFormData({
      ...formData,
      medicines: formData.medicines.filter((_, i) => i !== index),
    });
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...formData.medicines];
    updated[index][field] = value;
    setFormData({ ...formData, medicines: updated });
  };

  // ─── Submit (create / update) ─────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.medicines.some((m) => m.name.trim())) {
      setError('Please add at least one medicine with a name.');
      return;
    }

    try {
      if (editingPrescription) {
        const res = await apiClient.patch(`/prescriptions/${editingPrescription._id}`, formData);
        setPrescriptions((prev) =>
          prev.map((p) => (p._id === editingPrescription._id ? res.data : p))
        );
        setSuccess('Prescription updated successfully');
      } else {
        if (user?.role !== 'doctor') {
          setError('Only doctors can create prescriptions');
          return;
        }
        const res = await apiClient.post('/prescriptions', formData);
        setPrescriptions((prev) => [res.data, ...prev]);
        setSuccess('Prescription created successfully');
      }

      setShowCreateModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this prescription? This cannot be undone.')) return;

    try {
      setError('');
      await apiClient.delete(`/prescriptions/${id}`);
      setPrescriptions((prev) => prev.filter((p) => p._id !== id));
      setSuccess('Prescription deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete prescription');
    }
  };

  // ─── Refill request (patients only) ──────────────────────────────────────

  const handleRequestRefill = async (id) => {
    try {
      setRefillLoading((prev) => ({ ...prev, [id]: true }));
      setError('');
      await apiClient.post(`/prescriptions/${id}/refill`);
      setSuccess('Refill request sent to your doctor');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request refill');
    } finally {
      setRefillLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ─── Derived state ────────────────────────────────────────────────────────

  const filteredPrescriptions = filterStatus === 'all'
    ? prescriptions
    : prescriptions.filter((p) => p.status === filterStatus);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Prescriptions</h2>
          <p className="text-gray-600 text-sm mt-1">
            {user?.role === 'doctor'
              ? 'Manage patient prescriptions'
              : 'View your prescriptions and request refills'}
          </p>
        </div>
        {user?.role === 'doctor' && (
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            New Prescription
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-start">
          <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Filter by status */}
      <div className="flex flex-wrap gap-2">
        {['all', 'active', 'expired', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              filterStatus === status
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-cyan-400'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-cyan-600" />
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No prescriptions found</p>
          <p className="text-gray-400 text-sm mt-1">
            {user?.role === 'doctor'
              ? 'Create a new prescription for your patients'
              : 'Your prescriptions will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPrescriptions.map((prescription) => (
            <PrescriptionCard
              key={prescription._id}
              prescription={prescription}
              userRole={user?.role}
              refillLoading={refillLoading}
              onEdit={handleEditClick}
              onDelete={handleDelete}
              onRefill={handleRequestRefill}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <PrescriptionModal
          prescription={editingPrescription}
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          onAddMedicine={handleAddMedicine}
          onRemoveMedicine={handleRemoveMedicine}
          onMedicineChange={handleMedicineChange}
          userRole={user?.role}
          patients={patients}
        />
      )}
    </div>
  );
}

// ─── Prescription card ────────────────────────────────────────────────────────

function PrescriptionCard({ prescription, userRole, refillLoading, onEdit, onDelete, onRefill }) {
  const statusStyles = {
    active:    'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50',
    expired:   'border-gray-300 bg-gradient-to-r from-gray-50 to-slate-50',
    cancelled: 'border-red-200 bg-gradient-to-r from-red-50 to-pink-50',
  };
  const statusBadge = {
    active:    'bg-green-100 text-green-700',
    expired:   'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div
      className={`rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
        statusStyles[prescription.status] || statusStyles.active
      }`}
    >
      {/* Header */}
      <div className="p-6 border-b border-current border-opacity-10">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              {prescription.diagnosis || 'General Prescription'}
            </p>
            {userRole === 'doctor' && prescription.patientId && (
              <h3 className="text-lg font-bold text-gray-800 mt-1">
                Patient:{' '}
                <span className="text-cyan-600">
                  {prescription.patientId.name || 'Unknown'}
                </span>
                {prescription.patientId.email && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({prescription.patientId.email})
                  </span>
                )}
              </h3>
            )}
            {userRole === 'patient' && (
              <h3 className="text-lg font-bold text-gray-800 mt-1">
                By{' '}
                <span className="text-cyan-600">
                  {prescription.doctorId?.name || prescription.doctorName || 'Your Doctor'}
                </span>
              </h3>
            )}
          </div>

          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge[prescription.status]}`}>
              {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
            </span>
            {userRole === 'doctor' && (
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(prescription)}
                  className="p-2 hover:bg-blue-200 rounded-lg transition text-blue-600"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(prescription._id)}
                  className="p-2 hover:bg-red-200 rounded-lg transition text-red-600"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
            <Pill className="w-4 h-4 mr-2" /> Medicines
          </h4>
          <div className="space-y-2">
            {prescription.medicines?.map((medicine, i) => (
              <div key={i} className="p-3 bg-white rounded-lg border border-current border-opacity-20">
                <p className="font-semibold text-gray-800">{medicine.name}</p>
                <div className="grid grid-cols-3 gap-2 mt-2 text-sm text-gray-600">
                  {medicine.dosage    && <div><span className="text-xs font-semibold">Dosage:</span> {medicine.dosage}</div>}
                  {medicine.frequency && <div><span className="text-xs font-semibold">Frequency:</span> {medicine.frequency}</div>}
                  {medicine.duration  && <div><span className="text-xs font-semibold">Duration:</span> {medicine.duration}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {prescription.advice && (
          <div>
            <p className="text-xs font-bold text-gray-700 uppercase mb-2">Additional Advice</p>
            <p className="text-sm text-gray-700 italic">{prescription.advice}</p>
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-current border-opacity-20">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              Valid until{' '}
              <span className="font-semibold text-gray-800">
                {new Date(prescription.validUntil).toLocaleDateString()}
              </span>
            </span>
          </div>

          {userRole === 'patient' && prescription.status === 'active' && (
            <button
              onClick={() => onRefill(prescription._id)}
              disabled={refillLoading[prescription._id]}
              className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refillLoading[prescription._id] ? 'Requesting…' : 'Request Refill'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function PrescriptionModal({
  prescription,
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  onAddMedicine,
  onRemoveMedicine,
  onMedicineChange,
  userRole,
  patients,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50">
          <h3 className="text-2xl font-bold text-gray-800">
            {prescription ? 'Edit Prescription' : 'New Prescription'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {/* Patient selector — doctors, new prescriptions only */}
          {userRole === 'doctor' && !prescription && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Patient <span className="text-red-500">*</span>
              </label>
              {patients.length > 0 ? (
                <PatientEmailSelector
                  patients={patients}
                  value={formData.patientId}
                  onChange={(patient) =>
                    setFormData({ ...formData, patientId: patient?._id || '' })
                  }
                  required
                />
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                  No patients found. Patients appear here once they have had an appointment, prescription, or health record with you.
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {patients.length > 0
                  ? `${patients.length} patient${patients.length !== 1 ? 's' : ''} available — search by name or email`
                  : ''}
              </p>
            </div>
          )}

          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Diagnosis</label>
            <input
              type="text"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="e.g., Common Cold, Hypertension"
            />
          </div>

          {/* Medicines */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">
                Medicines <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={onAddMedicine}
                className="text-sm text-cyan-600 hover:text-cyan-700 font-semibold"
              >
                + Add Medicine
              </button>
            </div>
            <div className="space-y-3">
              {formData.medicines.map((medicine, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-700 text-sm">Medicine {i + 1}</h4>
                    {formData.medicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveMedicine(i)}
                        className="text-red-500 hover:text-red-700 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={medicine.name}
                      onChange={(e) => onMedicineChange(i, 'name', e.target.value)}
                      placeholder="Medicine name *"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                      required
                    />
                    <input
                      type="text"
                      value={medicine.dosage}
                      onChange={(e) => onMedicineChange(i, 'dosage', e.target.value)}
                      placeholder="e.g., 500mg"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                    />
                    <input
                      type="text"
                      value={medicine.frequency}
                      onChange={(e) => onMedicineChange(i, 'frequency', e.target.value)}
                      placeholder="e.g., 3 times daily"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                    />
                    <input
                      type="text"
                      value={medicine.duration}
                      onChange={(e) => onMedicineChange(i, 'duration', e.target.value)}
                      placeholder="e.g., 7 days"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advice */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Advice</label>
            <textarea
              value={formData.advice}
              onChange={(e) => setFormData({ ...formData, advice: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="e.g., Take with food, avoid dairy products, rest well..."
            />
          </div>

          {/* Valid Until */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Valid Until</label>
            <input
              type="date"
              value={formData.validUntil}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Defaults to 30 days if left blank</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition"
            >
              {prescription ? 'Update Prescription' : 'Create Prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Prescriptions;