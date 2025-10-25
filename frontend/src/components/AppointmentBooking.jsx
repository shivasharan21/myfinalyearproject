// frontend/src/components/AppointmentBooking.jsx (Updated)
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import websocketService from '../services/websocket';
import axios from 'axios';

function AppointmentBooking({ onBookingComplete }) {
  const { API_URL, user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchDoctors();
    
    // Listen for real-time appointment updates
    websocketService.onAppointmentUpdated((data) => {
      if (data.type === 'created' || data.type === 'updated') {
        // Refresh data if needed
        if (onBookingComplete) {
          onBookingComplete();
        }
      }
    });

    return () => {
      websocketService.off('appointment:updated');
    };
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await axios.get(`${API_URL}/doctors`);
      setDoctors(response.data);
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDoctor) {
      setError('Please select a doctor');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/appointments`, {
        doctorId: selectedDoctor._id,
        ...formData
      });

      setSuccess(true);
      setFormData({ date: '', time: '', reason: '' });
      setSelectedDoctor(null);
      
      // Real-time update will trigger via WebSocket
      // No need to manually call onBookingComplete

      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Book an Appointment</h2>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Appointment booked successfully! The doctor will confirm your appointment soon.
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Select a Doctor</h3>
            
            {doctors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading doctors...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map(doctor => (
                  <div
                    key={doctor._id}
                    onClick={() => setSelectedDoctor(doctor)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                      selectedDoctor?._id === doctor._id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {doctor.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{doctor.name}</p>
                        <p className="text-sm text-gray-600">{doctor.specialization}</p>
                        {doctor.phone && (
                          <p className="text-xs text-gray-500 mt-1">{doctor.phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Appointment Form */}
          {selectedDoctor && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Appointment Details</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Time
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setFormData({ ...formData, time: slot })}
                        className={`py-2 px-3 rounded-lg border text-sm font-medium transition ${
                          formData.time === slot
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Visit (Optional)
                  </label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your symptoms or reason for consultation..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={loading || !formData.date || !formData.time}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:bg-blue-400"
                >
                  {loading ? 'Booking...' : 'Book Appointment'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Selected Doctor Info */}
        <div>
          {selectedDoctor ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Selected Doctor</h3>
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-2xl mx-auto mb-3">
                  {selectedDoctor.name.charAt(0)}
                </div>
                <h4 className="text-xl font-bold text-gray-800">{selectedDoctor.name}</h4>
                <p className="text-blue-600 font-medium mt-1">{selectedDoctor.specialization}</p>
                {selectedDoctor.email && (
                  <p className="text-sm text-gray-600 mt-2">{selectedDoctor.email}</p>
                )}
                {selectedDoctor.phone && (
                  <p className="text-sm text-gray-600">{selectedDoctor.phone}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-gray-600 text-sm">Select a doctor to continue</p>
              </div>
            </div>
          )}

          <div className="mt-6 bg-blue-50 rounded-xl border border-blue-200 p-6">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Appointment Guidelines</h4>
            <ul className="text-xs text-blue-800 space-y-2">
              <li className="flex items-start">
                <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Please arrive 10 minutes before your scheduled time</span>
                  <span>Appointments are subject to doctor availability</span>
              </li>
              <li className="flex items-start">
                <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>You will receive confirmation via email</span>
              </li>
              <li className="flex items-start">
                <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppointmentBooking;
              