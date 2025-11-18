import React, { useState, useEffect } from "react";

const textShadowStyle = { textShadow: "0 2px 6px rgba(0,0,0,0.15)" };

const SectionTitle = ({ eyebrow, title, subtitle }) => (
  <div className="mx-auto mb-8 max-w-3xl text-center">
    {eyebrow && (
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-600 animate-fade-in">
        {eyebrow}
      </p>
    )}
    <h2
      style={textShadowStyle}
      className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl"
    >
      {title}
    </h2>
    {subtitle && <p className="mt-3 text-lg text-slate-600">{subtitle}</p>}
  </div>
);

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 text-slate-900">
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-3' : 'py-5'}`}>
          <div className="mx-auto max-w-7xl px-6">
            <div className={`flex items-center justify-between rounded-2xl px-6 py-4 transition-all duration-300 ${
          scrolled 
            ? 'bg-white/95 backdrop-blur-lg shadow-lg ring-1 ring-black/5' 
            : 'bg-transparent'
            }`}>
          <div className="flex items-center gap-3">
            
          
            <span className="text-xl font-bold text-slate-900">Dr.AssistAI</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-slate-600 text-sm font-medium">
            <a href="#services" className="hover:text-sky-600 transition-colors">Services</a>
            <a href="#doctors" className="hover:text-sky-600 transition-colors">Doctors</a>
            <a href="#about" className="hover:text-sky-600 transition-colors">About</a>
            <a href="#contact" className="hover:text-sky-600 transition-colors">Contact</a>
          </div>

          <div className="flex items-center gap-3">
            <button className="rounded-full px-5 py-2.5 text-sm font-medium text-slate-700 hover:text-sky-600 transition-colors" onClick={() => window.location.href = '/login'}>
              Sign in
            </button>
            <button className="rounded-full bg-gradient-to-r from-sky-600 to-cyan-600 text-white px-5 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300" onClick={() => window.location.href = '/register'}>
              Get Started
            </button>
          </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-6 pt-32 pb-16">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-cyan-200/30 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
              Available 24/7 for emergencies
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
              <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                World-Class
              </span>
              <br />
              <span className="bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">
                Healthcare Services
              </span>
            </h1>

            <p className="text-xl text-slate-600 max-w-xl leading-relaxed">
              Book appointments, consult online with expert doctors, and access your health records securely from anywhere, anytime.
            </p>

            <div className="flex flex-wrap gap-4">
              <button onClick={() => window.location.href = '/register'} className="group rounded-full bg-gradient-to-r from-sky-600 to-cyan-600 px-8 py-4 text-base font-semibold text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                Get Started
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <a
                href="#services"
                className="rounded-full border-2 border-slate-200 px-8 py-4 text-base font-semibold text-slate-700 hover:border-sky-600 hover:text-sky-600 hover:shadow-lg transition-all duration-300"
              >
                Explore Services
              </a>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-8">
              <div>
                <div className="text-3xl font-bold text-sky-600">50K+</div>
                <div className="text-sm text-slate-600">Patients Served</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-sky-600">200+</div>
                <div className="text-sm text-slate-600">Expert Doctors</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-sky-600">4.9★</div>
                <div className="text-sm text-slate-600">Patient Rating</div>
              </div>
            </div>
          </div>

          {/* Right - Hero Image */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              {/* Decorative circles */}
              <div className="absolute -top-4 -left-4 h-24 w-24 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 opacity-20 blur-2xl" />
              <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-20 blur-2xl" />
              
              {/* Main circle */}
                      <div className="relative h-[400px] w-[400px] rounded-full bg-gradient-to-br from-sky-100 to-cyan-100 shadow-2xl flex items-center justify-center ring-1 ring-sky-200/50">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-600/10 to-cyan-600/10 animate-pulse" />
                      <img
                        src="/assets/doctorimage2.jpeg"
                        alt="Doctor"
                        className="w-full h-full object-cover rounded-full"
                        draggable={false}
                      />
                      </div>

                      {/* Floating cards */}
              <div className="absolute -left-8 top-1/4 rounded-2xl bg-white p-4 shadow-xl animate-float">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl">
                    ✓
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Success Rate</div>
                    <div className="text-lg font-bold text-slate-900">98%</div>
                  </div>
                </div>
              </div>

              <div className="absolute -right-8 bottom-1/4 rounded-2xl bg-white p-4 shadow-xl animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 text-xl">
                    👥
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Online Now</div>
                    <div className="text-lg font-bold text-slate-900">120+</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickActionCard
            icon="🕐"
            title="Opening Hours"
            subtitle="Mon–Sat: 9:00am – 9:00pm"
            highlight="Emergency 24×7"
            color="sky"
          />
          <QuickActionCard
            icon="📅"
            title="Appointment"
            subtitle="Book with top specialists"
            highlight="Online or In-person"
            color="cyan"
          />
          <QuickActionCard
            icon="👨‍⚕️"
            title="Find Doctors"
            subtitle="By specialty or rating"
            highlight="200+ Specialists"
            color="blue"
          />
          <QuickActionCard
            icon="📍"
            title="Find Locations"
            subtitle="Nearby clinics & hospitals"
            highlight="Get Directions"
            color="indigo"
          />
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="mx-auto max-w-7xl px-6 py-16">
        <SectionTitle 
          eyebrow="Our Services" 
          title="Comprehensive Medical Care" 
          subtitle="Expert healthcare services across all specialties"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: "🚨", title: "Emergency Services", body: "24/7 immediate medical care for critical conditions with rapid response team.", color: "red" },
            { icon: "🔬", title: "Radiology & Imaging", body: "Advanced X-ray, CT, MRI and ultrasound diagnostics with latest technology.", color: "purple" },
            { icon: "🧪", title: "Laboratory Services", body: "Comprehensive blood, urine and diagnostic laboratory testing.", color: "green" },
            { icon: "💊", title: "Pharmacy", body: "In-house pharmacy for prescriptions and essential medications.", color: "blue" },
            { icon: "❤️", title: "Cardiology", body: "Complete heart care from screening to advanced intervention.", color: "red" },
            { icon: "👶", title: "Pediatrics", body: "Specialized child healthcare and immunization programs.", color: "pink" },
          ].map((service, idx) => (
            <ServiceCard key={idx} {...service} />
          ))}
        </div>
      </section>

      {/* Doctors Section */}
      <section id="doctors" className="mx-auto max-w-7xl px-6 py-16">
        <SectionTitle 
          eyebrow="Our Team" 
          title="Meet Our Expert Doctors" 
          subtitle="Highly qualified healthcare professionals dedicated to your wellbeing"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: "Dr. Sarah Johnson", specialty: "Cardiologist", rating: "4.9", experience: "15 years", patients: "5000+" },
            { name: "Dr. Rajesh Kumar", specialty: "Neurologist", rating: "4.8", experience: "12 years", patients: "4500+" },
            { name: "Dr. Emily Williams", specialty: "Pediatrician", rating: "4.9", experience: "10 years", patients: "6000+" },
            { name: "Dr. Amit Patel", specialty: "Orthopedist", rating: "4.7", experience: "18 years", patients: "5500+" },
          ].map((doctor, idx) => (
            <DoctorCard key={idx} {...doctor} />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section id="about" className="mx-auto max-w-7xl px-6 py-16">
        <div className="relative rounded-3xl bg-gradient-to-r from-sky-600 to-cyan-600 p-12 md:p-16 overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/10" />
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          
          <div className="relative text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied patients who trust us with their healthcare needs
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button className="rounded-full bg-white text-sky-600 px-8 py-4 text-base font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                Create Account
              </button>
              <button className="rounded-full border-2 border-white text-white px-8 py-4 text-base font-semibold hover:bg-white hover:text-sky-600 transition-all duration-300">
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4 mb-12">
          <div className="md:col-span-1">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center text-white font-bold text-xl shadow-lg mb-4">
              TM
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Your trusted healthcare partner providing world-class medical services.
            </p>
            <div className="flex gap-3">
              <a href="#" className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-sky-600 hover:text-white transition-all">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-sky-600 hover:text-white transition-all">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 7-7 7-7-2.25 1.5-4.75 0-4.75 0s1.5-2 5.5-2.5z"/></svg>
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-sky-600 hover:text-white transition-all">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.002 1.413-.103.249-.129.597-.129.946v5.446h-3.554s.047-8.842 0-9.769h3.554v1.383c.43-.664 1.2-1.61 2.923-1.61 2.135 0 3.738 1.393 3.738 4.39v5.596zM5.337 9.433c-1.144 0-1.915-.758-1.915-1.71 0-.955.77-1.71 1.958-1.71 1.187 0 1.915.755 1.94 1.71 0 .952-.753 1.71-1.983 1.71zm1.581 11.019H3.757V9.684h3.161v10.768z"/></svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Services</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><a href="#" className="hover:text-sky-600 transition-colors">Emergency Care</a></li>
              <li><a href="#" className="hover:text-sky-600 transition-colors">Online Consultation</a></li>
              <li><a href="#" className="hover:text-sky-600 transition-colors">Laboratory Tests</a></li>
              <li><a href="#" className="hover:text-sky-600 transition-colors">Health Checkups</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>📧 hello@telemed.app</li>
              <li>📞 +91 (555) 123-4567</li>
              <li>📍 123 Health Street</li>
              <li>Mumbai, Maharashtra, India</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><a href="#" className="hover:text-sky-600 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-sky-600 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-sky-600 transition-colors">Cookie Policy</a></li>
              <li><a href="#" className="hover:text-sky-600 transition-colors">HIPAA Compliance</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8 text-center text-sm text-slate-600">
          <p>© {new Date().getFullYear()} TeleMed. All rights reserved. Made with ❤️ for better healthcare.</p>
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
        .bg-grid-white\/10 {
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 30px 30px;
        }
      `}</style>
    </div>
  );
}

function QuickActionCard({ icon, title, subtitle, highlight, color }) {
  const colors = {
    sky: "from-sky-500 to-cyan-500",
    cyan: "from-cyan-500 to-blue-500",
    blue: "from-blue-500 to-indigo-500",
    indigo: "from-indigo-500 to-purple-500"
  };

  return (
    <div className="group rounded-2xl bg-white p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-slate-100">
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${colors[color]} text-2xl shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 text-lg mb-1">{title}</h3>
      <p className="text-sm text-slate-600 mb-2">{subtitle}</p>
      <p className="text-xs font-semibold text-sky-600">{highlight}</p>
    </div>
  );
}

function ServiceCard({ icon, title, body, color }) {
  const colors = {
    red: "from-red-50 to-pink-50 border-red-100",
    purple: "from-purple-50 to-indigo-50 border-purple-100",
    green: "from-green-50 to-emerald-50 border-green-100",
    blue: "from-blue-50 to-cyan-50 border-blue-100",
    pink: "from-pink-50 to-rose-50 border-pink-100"
  };

  return (
    <div className={`group rounded-2xl bg-gradient-to-br ${colors[color]} p-6 border hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <h3 className="font-semibold text-slate-900 text-lg mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}

function DoctorCard({ name, specialty, rating, experience, patients }) {
  return (
    <div className="group rounded-2xl bg-white p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-slate-100">
      <div className="relative mb-4">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center text-white text-2xl font-bold mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
          {name.split(' ')[1][0]}
        </div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-green-500 h-4 w-4 rounded-full border-4 border-white" />
      </div>
      <h3 className="font-semibold text-slate-900 text-center mb-1">{name}</h3>
      <p className="text-sm text-sky-600 text-center mb-3">{specialty}</p>
      
      <div className="flex items-center justify-center gap-1 mb-3">
        <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span className="font-semibold text-slate-700">{rating}</span>
      </div>

      <div className="flex justify-between text-xs text-slate-600 pt-3 border-t border-slate-100">
        <div>
          <div className="font-semibold text-slate-900">{experience}</div>
          <div>Experience</div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-slate-900">{patients}</div>
          <div>Patients</div>
        </div>
      </div>
    </div>
  );
}