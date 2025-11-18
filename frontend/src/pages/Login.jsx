// frontend/src/pages/Login.jsx (Updated - Same Box Size)
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState("patient");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }
    try {
      const result = await login(formData.email, formData.password);
      if (result?.success) {
        navigate(userType === "doctor" ? "/doctor-dashboard" : "/patient-dashboard");
      }
    } catch (err) {
      setError(err?.response?.data?.error || "Login failed. Please check your credentials.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-fixed bg-cover bg-center p-6"
      style={{ backgroundImage: 'url("/assets/medical-bg.png")' }}
    >
      <div className="w-full max-w-6xl">
        {/* Split card - Fixed height */}
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
                  alt="Doctor"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
              <p className="mt-8 text-cyan-700/80 text-sm max-w-[220px]">
                We at <span className="font-semibold text-cyan-900">Dr.AssistAI</span> are always focused on your health.
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
                Welcome Back
              </h2>
              <p className="text-center text-sm text-gray-600 mb-5">
                Your health. Our priority.
              </p>

              {/* Login Type Toggle */}
              <div className="flex justify-center mb-5 bg-cyan-50 rounded-full p-1">
                <button
                  onClick={() => setUserType("patient")}
                  className={`w-1/2 py-2 rounded-full font-semibold text-sm transition-all ${
                    userType === "patient"
                      ? "bg-cyan-600 text-white shadow-md"
                      : "text-cyan-700"
                  }`}
                >
                  Patient
                </button>
                <button
                  onClick={() => setUserType("doctor")}
                  className={`w-1/2 py-2 rounded-full font-semibold text-sm transition-all ${
                    userType === "doctor"
                      ? "bg-cyan-600 text-white shadow-md"
                      : "text-cyan-700"
                  }`}
                >
                  Doctor
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-cyan-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-cyan-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-gray-600">
                    <input type="checkbox" className="w-3 h-3 rounded border-gray-300" />
                    Remember me
                  </label>
                  <Link to="/forgot-password" className="text-cyan-700 hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-white font-semibold transition transform hover:scale-105 text-sm bg-cyan-600 hover:bg-cyan-700"
                >
                  {loading
                    ? "Signing in..."
                    : `Sign In as ${userType === "doctor" ? "Doctor" : "Patient"}`}
                </button>
              </form>

              <div className="mt-4 text-center text-xs text-gray-600">or sign in with</div>
              <div className="mt-2.5 flex gap-2 justify-center">
                <button className="flex-1 px-3 py-2 rounded-md border border-gray-200 hover:shadow-md transition text-sm">
                  Google
                </button>
                <button className="flex-1 px-3 py-2 rounded-md border border-gray-200 hover:shadow-md transition text-sm">
                  Apple
                </button>
              </div>

              <p className="mt-4 text-center text-xs text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-cyan-700 hover:underline font-semibold">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}