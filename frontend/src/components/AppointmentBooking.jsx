// frontend/src/components/AppointmentBooking.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient'; // FIX: was raw axios + API_URL from useAuth

function AppointmentBooking({ onBookingComplete }) {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [formData, setFormData] = useState({ date: '', time: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [fetchingDoctors, setFetchingDoctors] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setFetchingDoctors(true);
      const response = await apiClient.get('/doctors');
      setDoctors(response.data);
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
      setError('Failed to load doctors. Please refresh the page.');
    } finally {
      setFetchingDoctors(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctor) { setError('Please select a doctor'); return; }
    if (!formData.date || !formData.time) { setError('Please select both date and time'); return; }

    setError('');
    setLoading(true);
    try {
      await apiClient.post('/appointments', { doctorId: selectedDoctor._id, ...formData });
      setSuccess(true);
      setFormData({ date: '', time: '', reason: '' });
      setSelectedDoctor(null);
      if (onBookingComplete) onBookingComplete();
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30'];

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Book an Appointment</h2>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 text-green-700 rounded-xl flex items-center">
          <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <p className="font-semibold">Appointment booked successfully!</p>
            <p className="text-sm">The doctor will review and confirm your appointment soon.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl flex items-center">
          <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Doctor selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Select a Doctor
            </h3>

            {fetchingDoctors ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading doctors...</p>
              </div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No doctors available at the moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map(doctor => (
                  <div
                    key={doctor._id}
                    onClick={() => setSelectedDoctor(doctor)}
                    className={`p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${selectedDoctor?._id === doctor._id ? 'border-cyan-600 bg-gradient-to-r from-cyan-50 to-blue-50 shadow-lg scale-105' : 'border-gray-200 hover:border-cyan-300 hover:shadow-md'}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ${selectedDoctor?._id === doctor._id ? 'bg-gradient-to-br from-cyan-600 to-blue-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'}`}>
                        {doctor.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{doctor.name}</p>
                        <p className="text-sm text-cyan-600 font-medium">{doctor.specialization}</p>
                        {doctor.phone && <p className="text-xs text-gray-500 mt-1">📞 {doctor.phone}</p>}
                      </div>
                      {selectedDoctor?._id === doctor._id && (
                        <svg className="w-6 h-6 text-cyan-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Appointment form */}
          {selectedDoctor && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Appointment Details
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Appointment Date *</label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} min={getMinDate()}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" required />
                  <p className="text-xs text-gray-500 mt-1">Select a date from tomorrow onwards</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Preferred Time *</label>
                  <div className="grid grid-cols-3 gap-3">
                    {timeSlots.map(slot => (
                      <button key={slot} type="button" onClick={() => setFormData({ ...formData, time: slot })}
                        className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${formData.time === slot ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-600 shadow-lg scale-105' : 'bg-white text-gray-700 border-gray-300 hover:border-cyan-300 hover:shadow-md'}`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reason for Visit <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea name="reason" value={formData.reason} onChange={handleChange} rows="4"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none transition-all"
                    placeholder="Describe your symptoms or reason for consultation..."></textarea>
                </div>
                <button type="submit" disabled={loading || !formData.date || !formData.time}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      <span>Booking...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>Book Appointment</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          {selectedDoctor ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Selected Doctor</h3>
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg">
                  {selectedDoctor.name.charAt(0)}
                </div>
                <h4 className="text-xl font-bold text-gray-800">{selectedDoctor.name}</h4>
                <p className="text-cyan-600 font-semibold mt-1">{selectedDoctor.specialization}</p>
                {selectedDoctor.email && (
                  <p className="text-sm text-gray-600 mt-3 flex items-center justify-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    {selectedDoctor.email}
                  </p>
                )}
                {selectedDoctor.phone && (
                  <p className="text-sm text-gray-600 mt-1 flex items-center justify-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {selectedDoctor.phone}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300 p-8">
              <div className="text-center">
                <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <p className="text-gray-600 font-medium">Select a doctor to continue</p>
                <p className="text-sm text-gray-500 mt-2">Choose from the available doctors above</p>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 p-6">
            <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Appointment Guidelines
            </h4>
            <ul className="space-y-3">
              {['Appointments are confirmed within 24 hours','Arrive 10 minutes before scheduled time',"You'll receive email confirmation",'Bring valid ID and previous records','Consultation time: 15-30 minutes'].map((item, idx) => (
                <li key={idx} className="flex items-start text-xs text-blue-800">
                  <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppointmentBooking;