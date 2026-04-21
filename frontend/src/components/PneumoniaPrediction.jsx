// frontend/src/components/PneumoniaPrediction.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

function PneumoniaPrediction() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const response = await apiClient.get('/pneumonia-predictions');
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch prediction history:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(selectedFile);
      setPrediction(null);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an image file.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await apiClient.post('/predict-pneumonia', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPrediction(response.data);
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.error || 'Prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setPrediction(null);
    setError('');
  };

  const testSamples = {
    normal: 'Normal chest X-ray',
    pneumonia: 'Pneumonia chest X-ray'
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Pneumonia Detection</h2>
        <p className="text-gray-600">Upload a chest X-ray image to detect pneumonia</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700">Click to upload chest X-ray</p>
                <p className="text-sm text-gray-500">PNG, JPG, JPEG up to 10MB</p>
              </div>
            </div>
          </label>
        </div>

        {preview && (
          <div className="flex justify-center">
            <div className="relative">
              <img src={preview} alt="Preview" className="max-w-xs max-h-64 rounded-lg shadow-md" />
              <button
                type="button"
                onClick={resetForm}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={!file || loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Analyzing...' : 'Analyze Image'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {prediction && (
        <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Prediction Result</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-lg">
                <span className="font-semibold">Diagnosis:</span>{' '}
                <span className={prediction.prediction === 'PNEUMONIA' ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                  {prediction.prediction}
                </span>
              </p>
              <p className="text-lg mt-2">
                <span className="font-semibold">Confidence:</span> {prediction.probability}%
              </p>
              <p className="text-lg mt-2">
                <span className="font-semibold">Risk Level:</span>{' '}
                <span className={`font-bold ${prediction.risk === 'High Risk' ? 'text-red-600' : prediction.risk === 'Moderate Risk' ? 'text-yellow-600' : 'text-green-600'}`}>
                  {prediction.risk}
                </span>
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Probabilities</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Normal:</span>
                  <span className="font-mono">{prediction.probabilities.NORMAL}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Pneumonia:</span>
                  <span className="font-mono">{prediction.probabilities.PNEUMONIA}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Predictions</h3>
          <div className="space-y-3">
            {history.slice(0, 5).map((item, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className={`font-semibold ${item.prediction === 'PNEUMONIA' ? 'text-red-600' : 'text-green-600'}`}>
                    {item.prediction}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Confidence: {item.probability}% | Risk: {item.risk}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PneumoniaPrediction;