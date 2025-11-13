import React, { useState } from "react";

const textShadowStyle = { textShadow: "0 2px 6px rgba(0,0,0,0.15)" };

const SectionTitle = ({ eyebrow, title, subtitle }) => (
  <div className="mx-auto mb-6 max-w-3xl text-center">
    {eyebrow && (
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">
        {eyebrow}
      </p>
    )}
    <h2
      style={textShadowStyle}
      className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl"
    >
      {title}
    </h2>
    {subtitle && <p className="mt-3 text-slate-600">{subtitle}</p>}
  </div>
);

export default function Landing() {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 text-slate-900">
      {/* ================= HERO TILE ================= */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="group relative w-full rounded-3xl bg-sky-600/55 text-white overflow-visible shadow-lg ring-1 ring-black/5 transition-all duration-500 ease-out md:hover:-translate-y-2 md:hover:shadow-2xl md:hover:z-50">
          {/* NAVBAR */}
          <div className="flex items-center justify-between px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center text-sky-600 font-bold text-xl">
                TM
              </div>
              <span
                style={textShadowStyle}
                className="text-xl font-bold transition-shadow duration-500 md:group-hover:shadow-lg"
              >
                TeleMed
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-6 text-white/90 text-sm transition-colors duration-500 md:group-hover:text-white">
              <a href="#services" className="hover:text-white transition-colors">
                Services
              </a>
              <a href="#features" className="hover:text-white transition-colors">
                Features
              </a>
              <a href="#about" className="hover:text-white transition-colors">
                About
              </a>
              <a href="#contact" className="hover:text-white transition-colors">
                Contact
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <a
                href="/login"
                className="rounded-full border border-white/30 px-4 py-2 text-sm transition-shadow duration-500 hover:shadow-md md:group-hover:shadow-md"
              >
                Sign in
              </a>

              <a
                href="/register"
                className="rounded-full bg-white text-sky-700 px-4 py-2 text-sm font-semibold transition-shadow duration-500 hover:shadow-lg md:group-hover:shadow-lg"
              >
                Get Started
              </a>
            </div>
          </div>

          {/* HERO CONTENT */}
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6 px-8 pb-10">
            <div className="py-6">
              <h1
                style={{ ...textShadowStyle, lineHeight: 1.05 }}
                className="text-4xl md:text-5xl font-extrabold leading-tight transition-shadow duration-500 ease-out md:group-hover:shadow-lg"
              >
                World-Class Healthcare Services for you and your loved ones
              </h1>

              <p className="mt-4 max-w-xl text-white/90 transition-shadow duration-500 md:group-hover:shadow-sm">
                Book appointments, consult online with AI-powered health predictions, and access your health records securely from anywhere.
              </p>

              <div className="mt-6 flex gap-3">
                <a
                  href="/register"
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-sky-700 shadow transition-shadow duration-500 hover:shadow-xl md:group-hover:shadow-xl"
                >
                  Get Started
                </a>

                <a
                  href="#services"
                  className="rounded-full border border-white/30 px-5 py-3 text-sm transition-shadow duration-500 hover:shadow-md md:group-hover:shadow-md"
                >
                  Explore Features
                </a>
              </div>
            </div>

            {/* Right: circular doctor image inside tile */}
            <div className="flex justify-end">
              <div className="relative flex items-center justify-center">
                <div className="absolute h-[340px] w-[340px] rounded-full bg-sky-400/20 blur-2xl pointer-events-none" />
                <div className="relative h-[300px] w-[300px] rounded-full bg-white/20 backdrop-blur-md shadow-2xl flex items-center justify-center ring-1 ring-white/30 transition-transform duration-500 hover:scale-105 hover:shadow-[0_0_40px_rgba(56,189,248,0.5)]">
                  <div className="h-[260px] w-[260px] rounded-full bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center">
                    <svg className="w-32 h-32 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= QUICK ACTIONS TILE ================= */}
      <section className="mx-auto max-w-7xl px-6 -mt-8">
        <div className="relative rounded-3xl bg-white p-8 shadow-lg ring-1 ring-black/6 transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <CardBlue
              title="AI Health Check"
              subtitle="Get instant diabetes risk predictions using machine learning."
              icon={<BrainIcon />}
            />
            <CardBlue
              title="Video Consultations"
              subtitle="Connect with doctors via secure HD video calls."
              icon={<VideoIcon />}
            />
            <CardBlue
              title="Book Appointments"
              subtitle="Schedule appointments with top specialists instantly."
              icon={<CalendarIcon />}
            />
            <CardBlue
              title="24/7 Support"
              subtitle="Round-the-clock medical assistance and emergency care."
              icon={<ClockIcon />}
            />
          </div>
        </div>
      </section>

      {/* ================= FEATURES TILE ================= */}
      <section id="features" className="mx-auto max-w-7xl px-6 mt-10">
        <div className="group relative rounded-3xl bg-sky-50 p-10 shadow-inner ring-1 ring-black/5 transition-all duration-500 ease-out md:hover:-translate-y-2 md:hover:shadow-2xl md:hover:z-30">
          <SectionTitle 
            eyebrow="Features" 
            title="Why Choose TeleMed?" 
            subtitle="Advanced healthcare solutions at your fingertips." 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {[
              { 
                title: "AI-Powered Predictions", 
                body: "Advanced machine learning models for diabetes risk assessment and health insights.",
                icon: <BrainIcon />
              },
              { 
                title: "HD Video Consultations", 
                body: "Crystal-clear video calls with WebRTC technology for seamless doctor-patient communication.",
                icon: <VideoIcon />
              },
              { 
                title: "Real-Time Updates", 
                body: "WebSocket-powered instant notifications for appointment confirmations and updates.",
                icon: <BoltIcon />
              },
              { 
                title: "Secure & Private", 
                body: "End-to-end encrypted communications and HIPAA-compliant data storage.",
                icon: <ShieldIcon />
              },
              { 
                title: "Easy Scheduling", 
                body: "Intuitive appointment booking system with calendar integration and reminders.",
                icon: <CalendarIcon />
              },
              { 
                title: "Comprehensive Dashboard", 
                body: "Track your health metrics, appointments, and medical history in one place.",
                icon: <ChartIcon />
              },
            ].map((s) => (
              <div
                key={s.title}
                className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-black/5 hover:-translate-y-1 hover:shadow-xl hover:z-10 transition-all duration-500"
              >
                <div className="inline-flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                    {s.icon}
                  </div>
                  <h4 style={textShadowStyle} className="font-semibold text-slate-900">
                    {s.title}
                  </h4>
                </div>
                <p className="text-sm text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SERVICES TILE ================= */}
      <section id="services" className="mx-auto max-w-7xl px-6 mt-10">
        <div className="group relative rounded-3xl bg-white p-10 shadow-lg ring-1 ring-black/5 transition-all duration-500 ease-out md:hover:-translate-y-2 md:hover:shadow-2xl md:hover:z-30">
          <SectionTitle 
            eyebrow="Services" 
            title="Comprehensive Medical Services" 
            subtitle="Quality healthcare for all your needs." 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {[
              { title: "General Practice", body: "Primary care for common health issues and preventive medicine." },
              { title: "Specialist Consultations", body: "Connect with specialists across various medical fields." },
              { title: "Mental Health", body: "Confidential counseling and mental wellness support." },
              { title: "Pediatrics", body: "Specialized care for children from infancy to adolescence." },
              { title: "Cardiology", body: "Heart health screenings and cardiovascular care." },
              { title: "Chronic Disease Management", body: "Ongoing support for diabetes, hypertension, and more." },
            ].map((s) => (
              <div
                key={s.title}
                className="rounded-2xl bg-sky-50 p-6 shadow-sm ring-1 ring-sky-100 hover:-translate-y-1 hover:shadow-lg hover:z-10 transition-all duration-500"
              >
                <div className="inline-flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center text-sky-600">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <h4 style={textShadowStyle} className="font-semibold text-slate-900">
                    {s.title}
                  </h4>
                </div>
                <p className="mt-3 text-sm text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer id="contact" className="mx-auto mt-16 max-w-7xl px-6 pb-12">
        <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-black/5 transition-shadow duration-500 hover:shadow-2xl">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white font-bold">
                TM
              </div>
              <p className="mt-3 text-sm text-slate-600">
                © {new Date().getFullYear()} TeleMed. All rights reserved.
              </p>
            </div>
            <div className="text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Contact</p>
              <p className="mt-1">hello@telemed.app</p>
              <p>+91 99999 99999</p>
            </div>
            <div className="text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Address</p>
              <p className="mt-1">123 Health Street, Mumbai</p>
              <p>Maharashtra, India</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ✅ Card that turns full sky-blue on hover */
function CardBlue({ title, subtitle, icon }) {
  return (
    <div className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:z-10 transition-all duration-500 hover:bg-sky-600">
      <div className="inline-flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center transition-colors duration-300 text-sky-600 group-hover:text-white">
          {React.cloneElement(icon, {
            className: "h-6 w-6 text-current transition-colors duration-300",
          })}
        </div>
        <h4
          style={textShadowStyle}
          className="font-semibold text-slate-900 group-hover:text-white transition-colors duration-300"
        >
          {title}
        </h4>
      </div>
      {subtitle && (
        <p className="mt-3 text-sm text-slate-600 group-hover:text-white/90 transition-colors duration-300">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ICONS */
function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.25A9.75 9.75 0 1021.75 12 9.76 9.76 0 0012 2.25Zm.75 5.25a.75.75 0 00-1.5 0V12l3.22 3.22a.75.75 0 101.06-1.06l-2.78-2.78V7.5Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6.75 2.25a.75.75 0 01.75.75V4.5h9V3a.75.75 0 011.5 0V4.5h.75A2.25 2.25 0 0121.75 6.75v12A2.25 2.25 0 0119.5 21H4.5A2.25 2.25 0 012.25 18.75v-12A2.25 2.25 0 014.5 4.5h.75V3a.75.75 0 01.75-.75ZM4.5 9h15v9.75a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9Z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.983 12h6.89l-2.757 8.271a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0016.017 10h-6.89l2.757-8.093z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}