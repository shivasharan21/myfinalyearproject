// frontend/src/components/HeartDiseasePrediction.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient'; // FIX: was raw axios + API_URL

function HeartDiseasePrediction() {
  const [formData, setFormData] = useState({
    age: '', sex: '1', chestPainType: '0', restingBP: '', cholesterol: '',
    fastingBS: '0', restingECG: '0', maxHeartRate: '', exerciseAngina: '0',
    oldpeak: '', stSlope: '2', ca: '0', thal: '2'
  });
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const response = await apiClient.get('/heart-predictions');
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
      const response = await apiClient.post('/predict-heart-disease', numericData);
      setPrediction(response.data);
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.error || 'Prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ age: '', sex: '1', chestPainType: '0', restingBP: '', cholesterol: '', fastingBS: '0', restingECG: '0', maxHeartRate: '', exerciseAngina: '0', oldpeak: '', stSlope: '2', ca: '0', thal: '2' });
    setPrediction(null);
    setError('');
  };

  const testSamples = {
    lowRisk:  { age: '40', sex: '1', chestPainType: '0', restingBP: '120', cholesterol: '200', fastingBS: '0', restingECG: '0', maxHeartRate: '170', exerciseAngina: '0', oldpeak: '0',   stSlope: '2', ca: '2', thal: '3' },
    moderate: { age: '50', sex: '1', chestPainType: '1', restingBP: '135', cholesterol: '220', fastingBS: '0', restingECG: '1', maxHeartRate: '150', exerciseAngina: '0', oldpeak: '1.0', stSlope: '1', ca: '1', thal: '1' },
    highRisk: { age: '55', sex: '0', chestPainType: '2', restingBP: '140', cholesterol: '230', fastingBS: '0', restingECG: '0', maxHeartRate: '140', exerciseAngina: '1', oldpeak: '1.5', stSlope: '1', ca: '0', thal: '2' },
  };

  const fillTestData = (t) => { setFormData(testSamples[t]); setPrediction(null); setError(''); };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Heart Disease Risk Prediction</h2>

      <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div className="text-sm">
            <p className="font-semibold text-yellow-800 mb-1">For educational/demonstration purposes only.</p>
            <p className="text-yellow-700">Do NOT use for actual medical decisions. Always consult qualified healthcare professionals.</p>
          </div>
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Enter Health Metrics</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => fillTestData('lowRisk')}  className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition">Low Risk</button>
                <button type="button" onClick={() => fillTestData('moderate')} className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition">Moderate</button>
                <button type="button" onClick={() => fillTestData('highRisk')} className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition">High Risk</button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age (years)</label>
                  <input type="number" name="age" value={formData.age} onChange={handleChange} placeholder="e.g., 55" required min="1" max="120"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sex</label>
                  <select name="sex" value={formData.sex} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="1">Male</option><option value="0">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chest Pain Type</label>
                  <select name="chestPainType" value={formData.chestPainType} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="0">Typical Angina</option><option value="1">Atypical Angina</option>
                    <option value="2">Non-Anginal Pain</option><option value="3">Asymptomatic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resting Blood Pressure (mm Hg)</label>
                  <input type="number" name="restingBP" value={formData.restingBP} onChange={handleChange} placeholder="e.g., 130" required min="80" max="200"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cholesterol (mg/dl)</label>
                  <input type="number" name="cholesterol" value={formData.cholesterol} onChange={handleChange} placeholder="e.g., 250" required min="100" max="600"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fasting Blood Sugar &gt; 120 mg/dl</label>
                  <select name="fastingBS" value={formData.fastingBS} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="0">No</option><option value="1">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resting ECG Results</label>
                  <select name="restingECG" value={formData.restingECG} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="0">Normal</option><option value="1">ST-T Wave Abnormality</option><option value="2">Left Ventricular Hypertrophy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Heart Rate Achieved</label>
                  <input type="number" name="maxHeartRate" value={formData.maxHeartRate} onChange={handleChange} placeholder="e.g., 150" required min="60" max="220"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exercise Induced Angina</label>
                  <select name="exerciseAngina" value={formData.exerciseAngina} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="0">No</option><option value="1">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ST Depression (Oldpeak)</label>
                  <input type="number" name="oldpeak" value={formData.oldpeak} onChange={handleChange} placeholder="e.g., 1.0" required min="0" max="10" step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ST Slope</label>
                  <select name="stSlope" value={formData.stSlope} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="0">Downsloping</option><option value="1">Flat</option><option value="2">Upsloping</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Major Vessels (0-3)</label>
                  <select name="ca" value={formData.ca} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thalassemia</label>
                  <select name="thal" value={formData.thal} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="0">Unknown</option><option value="1">Normal</option>
                    <option value="2">Fixed Defect</option><option value="3">Reversible Defect</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-4 pt-6">
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-blue-400 disabled:cursor-not-allowed">
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
                  <h4 className={`text-2xl font-bold mb-2 ${prediction.prediction === 1 ? 'text-red-700' : 'text-green-700'}`}>{prediction.prediction_label}</h4>
                  <p className={`text-lg font-semibold mb-1 ${prediction.prediction === 1 ? 'text-red-600' : 'text-green-600'}`}>{prediction.risk_level} Risk</p>
                  <p className={`text-sm ${prediction.prediction === 1 ? 'text-red-600' : 'text-green-600'}`}>{prediction.message}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Disease Probability</span>
                  <span className="text-sm font-bold text-gray-900">{(prediction.probability_disease * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">No Disease Probability</span>
                  <span className="text-sm font-bold text-gray-900">{(prediction.probability_no_disease * 100).toFixed(1)}%</span>
                </div>
              </div>
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs text-red-800"><strong>NOT FOR MEDICAL USE.</strong> For educational purposes only.</p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center py-16">
              <p className="text-gray-500 text-sm">Fill in the form to see the model's prediction</p>
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
                <tr>{['Date','Result','Probability','Age','BP','Cholesterol'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.prediction === 1 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{item.prediction === 1 ? 'Disease' : 'No Disease'}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-900">{(item.probability * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.age}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.restingBP}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.cholesterol}</td>
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

export default HeartDiseasePrediction;