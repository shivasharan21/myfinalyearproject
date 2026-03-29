// frontend/src/components/HealthRecords.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";
import websocketService from "../services/websocket";
import {
  X,
  Plus,
  Edit2,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle,
  Search,
  Activity,
  Thermometer,
  Heart,
  ClipboardList,
} from "lucide-react";

// ─── Reusable email-based patient selector ────────────────────────────────────

function PatientEmailSelector({ patients, value, onChange, required }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef(null);

  const selected = patients.find((p) => p._id === value);

  const filtered = query.trim()
    ? patients.filter(
        (p) =>
          p.email?.toLowerCase().includes(query.toLowerCase()) ||
          p.name?.toLowerCase().includes(query.toLowerCase()),
      )
    : patients;

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (patient) => {
    onChange(patient);
    setOpen(false);
    setQuery("");
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div
        className={`w-full flex items-center px-4 py-3 border rounded-xl cursor-text transition bg-white
          ${open || focused ? "ring-2 ring-cyan-500 border-transparent" : "border-gray-300"}`}
        onClick={() => setOpen(true)}
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
            placeholder={
              selected
                ? `${selected.name} (${selected.email})`
                : "Search patient by name or email…"
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setFocused(true);
              setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            required={required && !value}
          />
        )}
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="ml-2 text-gray-400 hover:text-red-500 transition flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

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
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(p)}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {p.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {p.name || "Unknown"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{p.email}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {required && (
        <select
          className="sr-only"
          value={value || ""}
          onChange={() => {}}
          required={required}
          tabIndex={-1}
          aria-hidden
        >
          <option value="" />
          {patients.map((p) => (
            <option key={p._id} value={p._id}>
              {p.email}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// ─── Record type config ───────────────────────────────────────────────────────

const RECORD_TYPES = [
  {
    value: "lab_result",
    label: "Lab Result",
    icon: <Activity className="w-4 h-4" />,
  },
  {
    value: "diagnosis",
    label: "Diagnosis",
    icon: <ClipboardList className="w-4 h-4" />,
  },
  {
    value: "vital_signs",
    label: "Vital Signs",
    icon: <Thermometer className="w-4 h-4" />,
  },
  {
    value: "imaging",
    label: "Imaging",
    icon: <FileText className="w-4 h-4" />,
  },
  {
    value: "consultation",
    label: "Consultation",
    icon: <Heart className="w-4 h-4" />,
  },
  { value: "other", label: "Other", icon: <FileText className="w-4 h-4" /> },
];

const typeLabel = (val) =>
  RECORD_TYPES.find((t) => t.value === val)?.label || val;
const typeIcon = (val) =>
  RECORD_TYPES.find((t) => t.value === val)?.icon || (
    <FileText className="w-4 h-4" />
  );

const SEVERITY_STYLES = {
  normal: {
    badge: "bg-green-100 text-green-700",
    card: "border-green-200 from-green-50 to-emerald-50",
  },
  mild: {
    badge: "bg-yellow-100 text-yellow-700",
    card: "border-yellow-200 from-yellow-50 to-amber-50",
  },
  moderate: {
    badge: "bg-orange-100 text-orange-700",
    card: "border-orange-200 from-orange-50 to-red-50",
  },
  severe: {
    badge: "bg-red-100 text-red-700",
    card: "border-red-200 from-red-50 to-pink-50",
  },
  critical: {
    badge: "bg-purple-100 text-purple-700",
    card: "border-purple-200 from-purple-50 to-violet-50",
  },
};

const EMPTY_FORM = {
  patientId: "",
  title: "",
  type: "diagnosis",
  content: "",
  severity: "normal",
  notes: "",
  date: new Date().toISOString().split("T")[0],
};

// ─── Main HealthRecords component ─────────────────────────────────────────────

function HealthRecords({ doctorPatients }) {
  const { user } = useAuth();

  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);

  // ─── Sync parent-supplied patient list ───────────────────────────────────

  useEffect(() => {
    if (doctorPatients && doctorPatients.length > 0) {
      setPatients(doctorPatients);
    }
  }, [doctorPatients]);

  // ─── Initial fetch ────────────────────────────────────────────────────────

  useEffect(() => {
    fetchRecords();
  }, []);

  // ─── WebSocket listeners ──────────────────────────────────────────────────

  useEffect(() => {
    const onCreated = (data) => {
      const record = data?.record || (data?._id ? data : null);
      if (record) {
        setRecords((prev) => {
          if (prev.some((r) => r._id === record._id)) return prev;
          return [record, ...prev];
        });
      }
    };
    const onUpdated = (data) => {
      const record = data?.record || (data?._id ? data : null);
      if (record) {
        setRecords((prev) =>
          prev.map((r) => (r._id === record._id ? record : r)),
        );
      }
    };
    const onDeleted = (data) => {
      const id = data?.recordId || data?._id;
      if (id) {
        setRecords((prev) => prev.filter((r) => r._id !== id));
      }
    };

    websocketService.onHealthRecordCreated(onCreated);
    websocketService.onHealthRecordUpdated(onUpdated);
    websocketService.onHealthRecordDeleted(onDeleted);

    return () => {
      websocketService.offHealthRecordCreated(onCreated);
      websocketService.offHealthRecordUpdated(onUpdated);
      websocketService.offHealthRecordDeleted(onDeleted);
    };
  }, []);

  // ─── Fetch data ───────────────────────────────────────────────────────────

  // Helper: extract an array from various API response shapes
  const extractArray = (data, keys = []) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return [];
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError("");

      if (user?.role === "patient") {
        // Patients only need health records — skip the doctor-only cross-fetches
        const recordsRes = await apiClient
          .get("/health-records")
          .catch(() => ({ data: [] }));
        const recordsData = extractArray(recordsRes.data, ["records", "data"]);
        setRecords(recordsData);
        return;
      }

      // Doctor path: fetch all three sources to build the patient list
      const [recordsRes, appointRes, prescRes] = await Promise.all([
        apiClient.get("/health-records").catch(() => ({ data: [] })),
        apiClient.get("/appointments").catch(() => ({ data: [] })),
        apiClient.get("/prescriptions").catch(() => ({ data: [] })),
      ]);

      const recordsData = extractArray(recordsRes.data, ["records", "data"]);
      const apptData = extractArray(appointRes.data, ["appointments", "data"]);
      const prescData = extractArray(prescRes.data, ["prescriptions", "data"]);

      setRecords(recordsData);

      // Build scoped patient list (only if parent hasn't provided one)
      if (!(doctorPatients && doctorPatients.length > 0)) {
        const patientMap = new Map();
        const addPatient = (obj) => {
          if (!obj) return;
          const id = obj._id || obj;
          if (typeof id !== "string") return;
          if (!patientMap.has(id)) {
            patientMap.set(id, {
              _id: id,
              name: obj.name || "Unknown Patient",
              email: obj.email || "",
            });
          }
        };
        recordsData.forEach((r) => addPatient(r.patientId));
        apptData.forEach((a) => addPatient(a.patientId));
        prescData.forEach((p) => addPatient(p.patientId));

        setPatients(
          [...patientMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
    } catch (err) {
      setError("Failed to load health records");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ─── CRUD helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingRecord(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      patientId: record.patientId?._id || record.patientId || "",
      title: record.title || "",
      type: record.type || record.recordType || "diagnosis",
      content: record.content || record.description || "",
      severity: record.severity || "normal",
      notes: record.notes || "",
      date: record.date
        ? new Date(record.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!formData.content.trim()) {
      setError("Content is required.");
      return;
    }

    try {
      if (editingRecord) {
        const res = await apiClient.patch(
          `/health-records/${editingRecord._id}`,
          formData,
        );
        setRecords((prev) =>
          prev.map((r) =>
            r._id === editingRecord._id ? res.data.record || res.data : r,
          ),
        );
        setSuccess("Health record updated successfully");
      } else {
        if (user?.role !== "doctor") {
          setError("Only doctors can create health records");
          return;
        }
        const res = await apiClient.post("/health-records", formData);
        setRecords((prev) => [res.data.record || res.data, ...prev]);
        setSuccess("Health record created successfully");
      }
      setShowModal(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this health record? This cannot be undone."))
      return;
    try {
      setError("");
      await apiClient.delete(`/health-records/${id}`);
      setRecords((prev) => prev.filter((r) => r._id !== id));
      setSuccess("Record deleted successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete record");
    }
  };

  // ─── Filtered list ────────────────────────────────────────────────────────

  const filtered =
    filterType === "all"
      ? records
      : records.filter((r) => r.type === filterType);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Health Records</h2>
          <p className="text-gray-600 text-sm mt-1">
            {user?.role === "doctor"
              ? "Manage and review patient health records"
              : "Your health records added by your doctor"}
          </p>
        </div>
        {user?.role === "doctor" && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            Add Record
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-start">
          <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{success}</span>
          <button
            onClick={() => setSuccess("")}
            className="text-green-400 hover:text-green-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Type filters */}
      <div className="flex flex-wrap gap-2">
        {[{ value: "all", label: "All" }, ...RECORD_TYPES].map((t) => (
          <button
            key={t.value}
            onClick={() => setFilterType(t.value)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              filterType === t.value
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:border-cyan-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Records list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-cyan-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No health records found</p>
          <p className="text-gray-400 text-sm mt-1">
            {user?.role === "doctor"
              ? "Add a new health record for your patients"
              : "Your doctor will add health records here after your visits"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((record) => (
            <RecordCard
              key={record._id}
              record={record}
              userRole={user?.role}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <RecordModal
          record={editingRecord}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          userRole={user?.role}
          patients={patients}
        />
      )}
    </div>
  );
}

// ─── Record card ──────────────────────────────────────────────────────────────

function RecordCard({ record, userRole, onEdit, onDelete }) {
  const sev = SEVERITY_STYLES[record.severity] || SEVERITY_STYLES.normal;

  // Handle both new and legacy field names
  const content =
    record.content || record.description || "No content available";
  const recordType = record.type || record.recordType || "diagnosis";

  return (
    <div
      className={`rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md bg-gradient-to-r ${sev.card}`}
    >
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shadow-sm flex-shrink-0 text-cyan-700">
              {typeIcon(recordType)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-gray-800">
                {record.title}
              </h3>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="text-xs font-semibold text-gray-500 bg-white/70 px-2 py-0.5 rounded-full">
                  {typeLabel(recordType)}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${sev.badge}`}
                >
                  {record.severity?.charAt(0).toUpperCase() +
                    record.severity?.slice(1) || "Normal"}
                </span>
              </div>
            </div>
          </div>

          {userRole === "doctor" && (
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => onEdit(record)}
                className="p-2 hover:bg-blue-200 rounded-lg transition text-blue-600"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(record._id)}
                className="p-2 hover:bg-red-200 rounded-lg transition text-red-600"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Metadata row */}
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase">
              Date
            </p>
            <p className="text-gray-700 font-medium">
              {record.date
                ? new Date(record.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "N/A"}
            </p>
          </div>

          {/* Doctor sees patient; patient sees doctor */}
          {userRole === "doctor" && record.patientId && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">
                Patient
              </p>
              <div className="text-gray-700 font-medium">
                {typeof record.patientId === "object"
                  ? record.patientId.name
                  : record.patientId || "Unknown"}
                {typeof record.patientId === "object" &&
                  record.patientId.email && (
                    <p className="text-gray-500 text-xs font-normal">
                      {record.patientId.email}
                    </p>
                  )}
              </div>
            </div>
          )}

          {userRole === "patient" && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">
                Doctor
              </p>
              <p className="text-gray-700 font-medium">
                {record.doctorId?.name || "Your Doctor"}
              </p>
            </div>
          )}
        </div>

        {/* Content section */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
            Findings / Content
          </p>
          <div className="text-sm text-gray-700 bg-white/50 p-3 rounded-lg border border-white/80 leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </div>

        {/* Notes section */}
        {record.notes && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
              Doctor's Notes
            </p>
            <div className="text-sm text-gray-700 bg-white/50 p-3 rounded-lg border border-white/80 leading-relaxed italic whitespace-pre-wrap">
              {record.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function RecordModal({
  record,
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  userRole,
  patients,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50">
          <h3 className="text-2xl font-bold text-gray-800">
            {record ? "Edit Health Record" : "New Health Record"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {/* Patient selector — doctors only, new records only */}
          {userRole === "doctor" && !record && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Patient <span className="text-red-500">*</span>
              </label>
              {patients.length > 0 ? (
                <PatientEmailSelector
                  patients={patients}
                  value={formData.patientId}
                  onChange={(patient) =>
                    setFormData({ ...formData, patientId: patient?._id || "" })
                  }
                  required
                />
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                  No patients found. Patients appear here once they have had an
                  appointment, prescription, or health record with you.
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {patients.length > 0
                  ? `${patients.length} patient${patients.length !== 1 ? "s" : ""} available — search by name or email`
                  : ""}
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="e.g., Blood Test Results, Annual Checkup"
              required
            />
          </div>

          {/* Type + Severity row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Record Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
              >
                {RECORD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Severity
              </label>
              <select
                value={formData.severity}
                onChange={(e) =>
                  setFormData({ ...formData, severity: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
              >
                {Object.keys(SEVERITY_STYLES).map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Content / Findings <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Describe the findings, results, or record details…"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Doctor's Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              rows={2}
              placeholder="Additional notes or recommendations for the patient…"
            />
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
              {record ? "Update Record" : "Create Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HealthRecords;
