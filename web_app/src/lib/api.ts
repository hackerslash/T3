import axios from 'axios'
import Cookies from 'js-cookie'

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://work-1-pgpfbenspnnkijab.prod-runtime.all-hands.dev/api'
  : 'http://localhost:12000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('auth_token')
      Cookies.remove('user_type')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface LoginResponse {
  token: string
  user: {
    id: number
    email: string
    name: string
    role: string
  }
}

export interface Employee {
  id: number
  email: string
  name: string
  is_active: boolean
  created_at: string
  api_token?: string
}

export interface Project {
  id: number
  name: string
  description: string
  is_active: boolean
  created_at: string
}

export interface TimeLog {
  id: number
  user_id: number
  project_id: number
  start_time: string
  end_time?: string
  duration?: number
  ip_address?: string
  mac_address?: string
  hostname?: string
  os_info?: string
}

export interface Screenshot {
  id: number
  time_log_id: number
  file_path: string
  file_size: number
  created_at: string
}

export interface FraudAlert {
  id: number
  user_id: number
  alert_type: string
  risk_score: number
  flags: string
  metadata?: string
  resolved: boolean
  resolved_by?: number
  resolved_at?: string
  created_at: string
}

export interface FraudStats {
  total_alerts: number
  high_risk: number
  medium_risk: number
  low_risk: number
  average_risk_score: number
}

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),
  
  employeeLogin: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/employee-login', { email, password }),
}

// Employee API
export const employeeAPI = {
  getProfile: () => api.get<Employee>('/employees/profile'),
  
  getStats: () => api.get('/employees/stats'),
  
  getTimeLogs: (limit = 50) => 
    api.get<TimeLog[]>(`/employees/time-logs?limit=${limit}`),
  
  downloadApp: () => api.get('/employees/download-app', { responseType: 'blob' }),
}

// Admin API
export const adminAPI = {
  // Employees
  getEmployees: () => api.get<Employee[]>('/employees'),
  
  createEmployee: (data: { email: string; name: string; password: string }) =>
    api.post<Employee>('/employees', data),
  
  updateEmployee: (id: number, data: Partial<Employee>) =>
    api.put<Employee>(`/employees/${id}`, data),
  
  deleteEmployee: (id: number) => api.delete(`/employees/${id}`),
  
  // Projects
  getProjects: () => api.get<Project[]>('/projects'),
  
  createProject: (data: { name: string; description: string }) =>
    api.post<Project>('/projects', data),
  
  updateProject: (id: number, data: Partial<Project>) =>
    api.put<Project>(`/projects/${id}`, data),
  
  deleteProject: (id: number) => api.delete(`/projects/${id}`),
  
  assignEmployee: (projectId: number, employeeId: number) =>
    api.post(`/projects/${projectId}/assign`, { employee_id: employeeId }),
  
  // Time tracking
  getTimeLogs: (params?: { user_id?: number; project_id?: number; limit?: number }) =>
    api.get<TimeLog[]>('/time-tracking', { params }),
  
  // Screenshots
  getScreenshots: (timeLogId: number) =>
    api.get<Screenshot[]>(`/screenshots/time-log/${timeLogId}`),
  
  // Fraud detection
  getFraudAlerts: (params?: { resolved?: boolean; risk_level?: string; limit?: number }) =>
    api.get<FraudAlert[]>('/fraud/alerts', { params }),
  
  getFraudStats: () => api.get<FraudStats>('/fraud/stats'),
  
  resolveAlert: (id: number, notes?: string) =>
    api.post(`/fraud/alerts/${id}/resolve`, { notes }),
}

export default api