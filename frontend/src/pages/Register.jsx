// frontend/src/pages/Register.jsx (Updated - Same Box Size)
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "patient",
    specialization: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill in all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (formData.role === "doctor" && !formData.specialization) {
      setError("Specialization is required for doctors");
      return;
    }

    setLoading(true);

    const { confirmPassword, ...registerData } = formData;
    const result = await register(registerData);

    if (result.success) {
      navigate(result.user.role === "doctor" ? "/doctor-dashboard" : "/patient-dashboard");
    } else {
      setError(result.error || "Registration failed. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-fixed bg-cover bg-center p-6"
      style={{ backgroundImage: 'url("/assets/medical-bg.png")' }}
    >
      <div className="w-full max-w-6xl">
        <div className="bg-transparent rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 h-[650px]">

          {/* LEFT PANEL */}
          <div
            className="relative flex items-center justify-center hidden md:flex"
            style={{
              background: "linear-gradient(180deg, #E0F7FA 0%, #B2EBF2 100%)",
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background: "radial-gradient(circle at 40% 40%, rgba(34,211,238,0.1), rgba(6,182,212,0.05))",
                filter: "blur(10px)",
              }}
            />
            <div className="relative flex flex-col items-center text-center z-10 px-6">
              <div className="w-56 h-56 rounded-full overflow-hidden border-4 border-white/70 shadow-2xl hover:scale-105 transition-all duration-300">
                <img
                  src="/assets/doctorimage.jpeg"
                  alt="Medical"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
              <p className="mt-8 text-cyan-700/80 text-sm max-w-[220px]">
                Join <span className="font-semibold text-cyan-900">Dr.AssistAI</span> and experience healthcare like never before.
              </p>
            </div>
          </div>

          {/* RIGHT PANEL - FORM */}
          <div className="p-8 md:p-10 flex items-center justify-center bg-white overflow-y-auto">
            <div className="w-full max-w-sm">
              {/* Logo */}
              <div className="flex justify-center mb-3">
                <div className="text-3xl font-bold text-cyan-600">Dr.AssistAI</div>
              </div>

              <h2 className="text-2xl md:text-3xl font-semibold text-cyan-700 text-center mb-1">
                Create Account
              </h2>
              <p className="text-center text-sm text-gray-600 mb-5">
                Join our community today
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-2.5">
                <div>
                  <label className="block text-xs font-medium text-cyan-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    placeholder="John Doe"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-cyan-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-cyan-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    placeholder="+1 (555) 000-0000"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-cyan-700 mb-1">
                    Register As *
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    required
                    disabled={loading}
                  >
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                  </select>
                </div>

                {formData.role === "doctor" && (
                  <div>
                    <label className="block text-xs font-medium text-cyan-700 mb-1">
                      Specialization *
                    </label>
                    <input
                      type="text"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                      placeholder="e.g., Cardiology"
                      required={formData.role === "doctor"}
                      disabled={loading}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-cyan-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-cyan-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-white font-semibold transition transform hover:scale-105 mt-3 text-sm bg-cyan-600 hover:bg-cyan-700"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-cyan-700 hover:underline font-semibold">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}