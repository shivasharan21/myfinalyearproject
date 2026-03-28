// frontend/src/components/DiabetesPrediction.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient'; // FIX: was raw axios + API_URL from useAuth

function DiabetesPrediction() {
  const [formData, setFormData] = useState({
    pregnancies: '', glucose: '', bloodPressure: '', skinThickness: '',
    insulin: '', bmi: '', diabetesPedigreeFunction: '', age: '',
  });
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const response = await apiClient.get('/predictions');
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch prediction history:', err);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const numericData = {};
      Object.keys(formData).forEach((key) => { numericData[key] = parseFloat(formData[key]); });
      const response = await apiClient.post('/predict-diabetes', numericData);
      setPrediction(response.data);
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.error || 'Prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ pregnancies: '', glucose: '', bloodPressure: '', skinThickness: '', insulin: '', bmi: '', diabetesPedigreeFunction: '', age: '' });
    setPrediction(null);
    setError('');
  };

  const testSamples = {
    lowRisk:  { pregnancies: '1', glucose: '85',  bloodPressure: '66', skinThickness: '29', insulin: '0',  bmi: '26.6', diabetesPedigreeFunction: '0.351', age: '31' },
    highRisk: { pregnancies: '6', glucose: '148', bloodPressure: '72', skinThickness: '35', insulin: '0',  bmi: '33.6', diabetesPedigreeFunction: '0.627', age: '50' },
    moderate: { pregnancies: '2', glucose: '120', bloodPressure: '70', skinThickness: '20', insulin: '80', bmi: '25.5', diabetesPedigreeFunction: '0.5',   age: '35' },
  };

  const fillTestData = (t) => { setFormData(testSamples[t]); setPrediction(null); setError(''); };

  const fields = [
    { name: 'pregnancies',              label: 'Pregnancies',                  placeholder: 'Number of pregnancies', step: '1',     min: '0' },
    { name: 'glucose',                  label: 'Glucose Level (mg/dL)',         placeholder: 'e.g., 120',             step: '1',     min: '0' },
    { name: 'bloodPressure',            label: 'Blood Pressure (mm Hg)',        placeholder: 'e.g., 80',              step: '1',     min: '0' },
    { name: 'skinThickness',            label: 'Skin Thickness (mm)',           placeholder: 'e.g., 20',              step: '1',     min: '0' },
    { name: 'insulin',                  label: 'Insulin Level (\u03bcU/mL)',    placeholder: 'e.g., 80',              step: '1',     min: '0' },
    { name: 'bmi',                      label: 'BMI (Body Mass Index)',         placeholder: 'e.g., 25.5',            step: '0.1',   min: '0' },
    { name: 'diabetesPedigreeFunction', label: 'Diabetes Pedigree Function',    placeholder: 'e.g., 0.5',             step: '0.001', min: '0' },
    { name: 'age',                      label: 'Age (years)',                   placeholder: 'e.g., 35',              step: '1',     min: '0' },
  ];

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Diabetes Risk Prediction</h2>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Quick Testing Available</p>
            <p>Use the test buttons to fill the form with sample data for different risk profiles.</p>
          </div>
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Enter Health Metrics</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => fillTestData('lowRisk')}  className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition">Low Risk</button>
                <button type="button" onClick={() => fillTestData('moderate')} className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition">Moderate</button>
                <button type="button" onClick={() => fillTestData('highRisk')} className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition">High Risk</button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map(({ name, label, placeholder, step, min }) => (
                  <div key={name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                    <input type="number" name={name} value={formData[name]} onChange={handleChange}
                      placeholder={placeholder} step={step} min={min} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                ))}
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-blue-400">
                  {loading ? 'Analyzing...' : 'Predict Risk'}
                </button>
                <button type="button" onClick={resetForm}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition">
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        <div>
          {prediction ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Prediction Result</h3>
              <div className={`p-6 rounded-lg mb-4 ${prediction.prediction === 1 ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'}`}>
                <div className="text-center">
                  <h4 className={`text-2xl font-bold mb-2 ${prediction.prediction === 1 ? 'text-red-700' : 'text-green-700'}`}>{prediction.risk_level} Risk</h4>
                  <p className={`text-sm ${prediction.prediction === 1 ? 'text-red-600' : 'text-green-600'}`}>{prediction.message}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Probability</span>
                <span className="text-sm font-bold text-gray-900">{(prediction.probability * 100).toFixed(1)}%</span>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800"><strong>Note:</strong> This prediction should not replace professional medical advice.</p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center py-16">
              <p className="text-gray-600 text-sm">Fill in the form to get your diabetes risk prediction</p>
            </div>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Predictions</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>{['Date','Result','Probability','Glucose','BMI','Age'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-sm text-gray-900">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.prediction === 1 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{item.prediction === 1 ? 'High Risk' : 'Low Risk'}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-900">{(item.probability * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.glucose}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.bmi}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.age}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiabetesPrediction;