// frontend/src/pages/Landing.jsx (Improved and Consistent)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-4'}`}>
        <div className="mx-auto max-w-7xl px-6">
          <div className={`flex items-center justify-between rounded-2xl px-6 py-4 transition-all duration-300 ${
            scrolled 
              ? 'bg-white/95 backdrop-blur-lg shadow-xl ring-1 ring-gray-200' 
              : 'bg-white/80 backdrop-blur-md shadow-lg'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Dr.AssistAI</span>
            </div>

            <div className="hidden md:flex items-center gap-8 text-gray-700 text-sm font-medium">
              <a href="#features" className="hover:text-cyan-600 transition-colors">Features</a>
              <a href="#doctors" className="hover:text-cyan-600 transition-colors">Doctors</a>
              <a href="#how-it-works" className="hover:text-cyan-600 transition-colors">How It Works</a>
              <a href="#contact" className="hover:text-cyan-600 transition-colors">Contact</a>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-cyan-600 transition-colors"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-6 pt-32 pb-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-100 to-blue-100 px-4 py-2 text-sm font-semibold text-cyan-700 shadow-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-600"></span>
              </span>
              AI-Powered Healthcare Platform
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Your Health,
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                Our Priority
              </span>
            </h1>

            <p className="text-xl text-gray-600 max-w-xl leading-relaxed">
              Experience world-class healthcare with AI-powered diagnosis, video consultations, and 24/7 access to expert doctors from the comfort of your home.
            </p>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => navigate('/register')}
                className="group px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center"
              >
                <span>Book Appointment</span>
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
              <button
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:border-cyan-600 hover:text-cyan-600 hover:shadow-lg transition-all duration-300"
              >
                Learn More
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">50K+</div>
                <div className="text-sm text-gray-600 mt-1">Happy Patients</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">200+</div>
                <div className="text-sm text-gray-600 mt-1">Expert Doctors</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">4.9★</div>
                <div className="text-sm text-gray-600 mt-1">Rating</div>
              </div>
            </div>
          </div>

          {/* Right - Hero Image */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute -top-4 -left-4 h-24 w-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-20 blur-2xl animate-pulse" />
              <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 opacity-20 blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
              
              <div className="relative h-[450px] w-[450px] rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 shadow-2xl flex items-center justify-center ring-4 ring-white">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-600/10 to-blue-600/10 animate-pulse" />
                <img
                  src="/assets/doctorimage2.jpeg"
                  alt="Healthcare Professional"
                  className="w-full h-full object-cover rounded-full"
                  draggable={false}
                />
              </div>

              {/* Floating Feature Cards */}
              <div className="absolute -left-8 top-1/4 rounded-2xl bg-white p-4 shadow-2xl animate-float border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Success Rate</div>
                    <div className="text-lg font-bold text-gray-900">98%</div>
                  </div>
                </div>
              </div>

              <div className="absolute -right-8 bottom-1/4 rounded-2xl bg-white p-4 shadow-2xl animate-float border border-gray-100" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Online Now</div>
                    <div className="text-lg font-bold text-gray-900">120+</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-bold uppercase tracking-widest text-cyan-600 mb-3">Our Features</p>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need for Better Health</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Advanced healthcare solutions powered by AI and delivered by expert doctors
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { 
              icon: "🎥", 
              title: "Video Consultations", 
              desc: "HD video calls with doctors from anywhere, anytime",
              color: "from-blue-500 to-cyan-500"
            },
            { 
              icon: "🤖", 
              title: "AI Health Check", 
              desc: "Advanced ML algorithms for diabetes risk assessment",
              color: "from-purple-500 to-pink-500"
            },
            { 
              icon: "📅", 
              title: "Easy Scheduling", 
              desc: "Book appointments instantly with real-time availability",
              color: "from-green-500 to-emerald-500"
            },
            { 
              icon: "💊", 
              title: "E-Prescriptions", 
              desc: "Digital prescriptions delivered instantly to your device",
              color: "from-orange-500 to-red-500"
            },
            { 
              icon: "📊", 
              title: "Health Records", 
              desc: "Secure cloud storage for all your medical records",
              color: "from-indigo-500 to-purple-500"
            },
            { 
              icon: "🔔", 
              title: "Smart Reminders", 
              desc: "Never miss medications or appointments with alerts",
              color: "from-pink-500 to-rose-500"
            }
          ].map((feature, idx) => (
            <div key={idx} className="group p-6 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-2">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-600 mb-3">How It Works</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Get Started in 3 Simple Steps</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Create Account", desc: "Sign up in seconds with your email" },
              { step: "2", title: "Choose Doctor", desc: "Browse and select from 200+ specialists" },
              { step: "3", title: "Start Consultation", desc: "Connect via video call or book visit" }
            ].map((item, idx) => (
              <div key={idx} className="relative text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 text-white text-3xl font-bold mb-6 shadow-xl">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-10 left-3/4 w-1/2 border-t-2 border-dashed border-cyan-300"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="relative rounded-3xl bg-gradient-to-r from-cyan-600 to-blue-600 p-12 md:p-16 overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10" />
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          
          <div className="relative text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Ready to Take Control of Your Health?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied patients who trust us with their healthcare needs
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button 
                onClick={() => navigate('/register')}
                className="px-8 py-4 bg-white text-cyan-600 font-bold rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                Get Started Free
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 border-2 border-white text-white font-bold rounded-xl hover:bg-white hover:text-cyan-600 transition-all duration-300"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-xl font-bold">Dr.AssistAI</span>
              </div>
              <p className="text-sm text-gray-400">
                Your trusted healthcare partner providing world-class medical services.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Services</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition">Video Consultation</a></li>
                <li><a href="#" className="hover:text-white transition">AI Health Check</a></li>
                <li><a href="#" className="hover:text-white transition">E-Prescriptions</a></li>
                <li><a href="#" className="hover:text-white transition">Health Records</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>📧 support@drassistai.com</li>
                <li>📞 +1 (555) 123-4567</li>
                <li>📍 123 Health Street</li>
                <li>Mumbai, India</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition">HIPAA Compliance</a></li>
                <li><a href="#" className="hover:text-white transition">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>© {new Date().getFullYear()} Dr.AssistAI. All rights reserved. Built with ❤️ for better healthcare.</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .bg-grid-white\\/10 {
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 30px 30px;
        }
      `}</style>
    </div>
  );
}