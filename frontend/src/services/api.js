// frontend/src/services/api.js
// Re-export everything from apiClient so both import paths work:
//   import { authAPI } from '../services/api'      ← AuthContext uses this
//   import { authAPI } from '../services/apiClient' ← also valid
export {
  authAPI,
  appointmentsAPI,
  doctorsAPI,
  healthAPI,
  prescriptionsAPI,
  predictionsAPI,
  statsAPI,
  remindersAPI,
  default,
} from './apiClient';