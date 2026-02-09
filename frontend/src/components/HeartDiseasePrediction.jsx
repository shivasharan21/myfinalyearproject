// frontend/src/components/HeartDiseasePrediction.jsx
// VERSION: Data-Aware (matches actual dataset patterns)

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

function HeartDiseasePrediction() {
  const { API_URL } = useAuth();
  const [formData, setFormData] = useState({
    age: '',
    sex: '1',
    chestPainType: '0',
    restingBP: '',
    cholesterol: '',
    fastingBS: '0',
    restingECG: '0',
    maxHeartRate: '',
    exerciseAngina: '0',
    oldpeak: '',
    stSlope: '2',
    ca: '0',
    thal: '2'
  });
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/heart-predictions`);
      setHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch prediction history:', error);
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
    setError('');
    setLoading(true);

    try {
      const numericData = {};
      Object.keys(formData).forEach(key => {
        numericData[key] = parseFloat(formData[key]);
      });

      const response = await axios.post(`${API_URL}/predict-heart-disease`, numericData);
      setPrediction(response.data);
      fetchHistory();
    } catch (error) {
      setError(error.response?.data?.error || 'Prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      age: '',
      sex: '1',
      chestPainType: '0',
      restingBP: '',
      cholesterol: '',
      fastingBS: '0',
      restingECG: '0',
      maxHeartRate: '',
      exerciseAngina: '0',
      oldpeak: '',
      stSlope: '2',
      ca: '0',
      thal: '2'
    });
    setPrediction(null);
    setError('');
  };

  // DATA-AWARE test cases (match actual dataset patterns)
  const testSamples = {
    lowRisk: {
      age: '40',
      sex: '1',
      chestPainType: '0',  // Typical angina → NO disease (in this dataset)
      restingBP: '120',
      cholesterol: '200',
      fastingBS: '0',
      restingECG: '0',
      maxHeartRate: '170',
      exerciseAngina: '0',
      oldpeak: '0',
      stSlope: '2',
      ca: '2',             // Multiple vessels → NO disease (in this dataset)
      thal: '3'            // Reversible defect → NO disease (in this dataset)
    },
    moderate: {
      age: '50',
      sex: '1',
      chestPainType: '1',  // Atypical angina
      restingBP: '135',
      cholesterol: '220',
      fastingBS: '0',
      restingECG: '1',
      maxHeartRate: '150',
      exerciseAngina: '0',
      oldpeak: '1.0',
      stSlope: '1',
      ca: '1',
      thal: '1'
    },
    highRisk: {
      age: '55',
      sex: '0',
      chestPainType: '2',  // Non-anginal pain → DISEASE (in this dataset)
      restingBP: '140',
      cholesterol: '230',
      fastingBS: '0',
      restingECG: '0',
      maxHeartRate: '140',
      exerciseAngina: '1',
      oldpeak: '1.5',
      stSlope: '1',
      ca: '0',             // No vessels → DISEASE (in this dataset)
      thal: '2'            // Fixed defect → DISEASE (in this dataset)
    }
  };

  const fillTestData = (sampleType) => {
    setFormData(testSamples[sampleType]);
    setPrediction(null);
    setError('');
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Heart Disease Risk Prediction</h2>

      {/* Dataset Warning Banner */}
      <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm">
            <p className="font-semibold text-yellow-800 mb-2">⚠️ Important: Dataset-Specific Patterns</p>
            <p className="text-yellow-700 mb-2">
              This model learns from a specific dataset with some counterintuitive patterns. For example:
            </p>
            <ul className="list-disc list-inside text-yellow-700 space-y-1 text-xs">
              <li><strong>Typical angina (cp=0)</strong> is more common in patients WITHOUT disease in this dataset</li>
              <li><strong>No blocked vessels (ca=0)</strong> is more common in patients WITH disease</li>
              <li><strong>These patterns are specific to this dataset</strong> and may not reflect general medical reality</li>
            </ul>
            <p className="text-yellow-800 font-semibold mt-2 text-xs">
              ⚠️ DO NOT use for actual medical decisions. For educational/demonstration purposes only.
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Quick Testing Available</p>
            <p>Use the buttons below to test with sample data that matches this dataset's patterns.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prediction Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Enter Health Metrics</h3>
              
              {/* Test Data Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fillTestData('lowRisk')}
                  className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
                  title="Pattern suggests low risk in this dataset"
                >
                  Low Risk
                </button>
                <button
                  type="button"
                  onClick={() => fillTestData('moderate')}
                  className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition"
                  title="Mixed pattern"
                >
                  Moderate
                </button>
                <button
                  type="button"
                  onClick={() => fillTestData('highRisk')}
                  className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                  title="Pattern suggests high risk in this dataset"
                >
                  High Risk
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age (years)
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 55"
                    required
                    min="1"
                    max="120"
                  />
                </div>

                {/* Sex */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sex
                  </label>
                  <select
                    name="sex"
                    value={formData.sex}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="1">Male</option>
                    <option value="0">Female</option>
                  </select>
                </div>

                {/* Chest Pain Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chest Pain Type
                    <span className="ml-1 text-xs text-gray-500" title="Note: In this dataset, cp=0 is more common in NO disease cases">ⓘ</span>
                  </label>
                  <select
                    name="chestPainType"
                    value={formData.chestPainType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="0">Typical Angina</option>
                    <option value="1">Atypical Angina</option>
                    <option value="2">Non-Anginal Pain</option>
                    <option value="3">Asymptomatic</option>
                  </select>
                </div>

                {/* Resting Blood Pressure */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resting Blood Pressure (mm Hg)
                  </label>
                  <input
                    type="number"
                    name="restingBP"
                    value={formData.restingBP}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 130"
                    required
                    min="80"
                    max="200"
                  />
                </div>

                {/* Cholesterol */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cholesterol (mg/dl)
                  </label>
                  <input
                    type="number"
                    name="cholesterol"
                    value={formData.cholesterol}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 250"
                    required
                    min="100"
                    max="600"
                  />
                </div>

                {/* Fasting Blood Sugar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fasting Blood Sugar &gt; 120 mg/dl
                  </label>
                  <select
                    name="fastingBS"
                    value={formData.fastingBS}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>

                {/* Resting ECG */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resting ECG Results
                  </label>
                  <select
                    name="restingECG"
                    value={formData.restingECG}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="0">Normal</option>
                    <option value="1">ST-T Wave Abnormality</option>
                    <option value="2">Left Ventricular Hypertrophy</option>
                  </select>
                </div>

                {/* Max Heart Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Heart Rate Achieved
                  </label>
                  <input
                    type="number"
                    name="maxHeartRate"
                    value={formData.maxHeartRate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 150"
                    required
                    min="60"
                    max="220"
                  />
                </div>

                {/* Exercise Induced Angina */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exercise Induced Angina
                  </label>
                  <select
                    name="exerciseAngina"
                    value={formData.exerciseAngina}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>

                {/* Oldpeak */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ST Depression (Oldpeak)
                  </label>
                  <input
                    type="number"
                    name="oldpeak"
                    value={formData.oldpeak}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 1.0"
                    required
                    min="0"
                    max="10"
                    step="0.1"
                  />
                </div>

                {/* ST Slope */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ST Slope
                  </label>
                  <select
                    name="stSlope"
                    value={formData.stSlope}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="0">Downsloping</option>
                    <option value="1">Flat</option>
                    <option value="2">Upsloping</option>
                  </select>
                </div>

                {/* Number of Major Vessels */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Major Vessels (0-3)
                    <span className="ml-1 text-xs text-gray-500" title="Note: In this dataset, ca=0 is more common in DISEASE cases">ⓘ</span>
                  </label>
                  <select
                    name="ca"
                    value={formData.ca}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>

                {/* Thalassemia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thalassemia
                    <span className="ml-1 text-xs text-gray-500" title="Note: Dataset patterns vary by type">ⓘ</span>
                  </label>
                  <select
                    name="thal"
                    value={formData.thal}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="0">Unknown</option>
                    <option value="1">Normal</option>
                    <option value="2">Fixed Defect</option>
                    <option value="3">Reversible Defect</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-4 pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </span>
                  ) : (
                    'Predict Risk'
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition duration-200"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Results Panel */}
        <div>
          {prediction ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Prediction Result</h3>
              
              <div className={`p-6 rounded-lg mb-4 ${
                prediction.prediction === 1 
                  ? 'bg-red-50 border-2 border-red-200' 
                  : 'bg-green-50 border-2 border-green-200'
              }`}>
                <div className="text-center">
                  <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
                    prediction.prediction === 1 ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    {prediction.prediction === 1 ? (
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <h4 className={`text-2xl font-bold mb-2 ${
                    prediction.prediction === 1 ? 'text-red-700' : 'text-green-700'
                  }`}>
                    {prediction.prediction_label}
                  </h4>
                  <p className={`text-lg font-semibold mb-1 ${
                    prediction.prediction === 1 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {prediction.risk_level} Risk
                  </p>
                  <p className={`text-sm ${
                    prediction.prediction === 1 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {prediction.message}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Disease Probability</span>
                  <span className="text-sm font-bold text-gray-900">
                    {(prediction.probability_disease * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">No Disease Probability</span>
                  <span className="text-sm font-bold text-gray-900">
                    {(prediction.probability_no_disease * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs text-red-800">
                  <strong>🚫 NOT FOR MEDICAL USE:</strong> This is a demonstration model trained on a specific dataset with non-standard patterns. Results are for educational purposes only and should NOT be used for actual medical decisions. Always consult qualified healthcare professionals.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
              <div className="text-center py-12">
                <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <p className="text-gray-600 text-sm font-medium mb-2">No Prediction Yet</p>
                <p className="text-gray-500 text-xs">Fill in the form to see the model's prediction</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prediction History */}
      {history.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Predictions</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Probability</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cholesterol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        item.prediction === 1 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.prediction === 1 ? 'Disease' : 'No Disease'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {(item.probability * 100).toFixed(1)}%
                    </td>
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