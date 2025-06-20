const axios = require('axios');

class ApiClient {
  constructor() {
    this.baseURL = process.env.API_URL || 'http://localhost:12000';
    this.apiToken = null;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use((config) => {
      if (this.apiToken) {
        config.headers.Authorization = `Bearer ${this.apiToken}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.apiToken = null;
        }
        return Promise.reject(error);
      }
    );
  }

  async login(email, password) {
    try {
      // First, login with email/password to get JWT token
      const loginResponse = await this.client.post('/api/auth/employee-login', {
        email,
        password
      });

      const jwtToken = loginResponse.data.token;
      const user = loginResponse.data.user;

      // Now generate an API token using the JWT token
      const apiTokenResponse = await this.client.post('/api/auth/generate-api-token', {}, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      const apiToken = apiTokenResponse.data.api_token;
      
      // Set the API token for future requests
      this.apiToken = apiToken;

      return {
        success: true,
        user: user,
        apiToken: apiToken
      };
    } catch (error) {
      this.apiToken = null;
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async authenticate(apiToken) {
    try {
      this.apiToken = apiToken;
      
      // Test the token by getting user profile
      const response = await this.client.get('/api/auth/api-profile');
      
      return {
        success: true,
        user: response.data
      };
    } catch (error) {
      this.apiToken = null;
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async getProjects() {
    try {
      const response = await this.client.get('/api/projects/my-projects');
      return response.data.projects || [];
    } catch (error) {
      throw new Error(error.response?.data?.error || error.message);
    }
  }

  async startTimeTracking(projectId, systemInfo = {}) {
    try {
      const payload = {
        project_id: projectId,
        ip_address: systemInfo.ip_address,
        mac_address: systemInfo.mac_address,
        hostname: systemInfo.hostname,
        os_info: systemInfo.os_info
      };

      const response = await this.client.post('/api/time-tracking/start', payload);
      
      return {
        success: true,
        timeLog: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async stopTimeTracking(timeLogId) {
    try {
      const response = await this.client.post(`/api/time-tracking/${timeLogId}/stop`);
      
      return {
        success: true,
        timeLog: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async getCurrentTimeLog() {
    try {
      const response = await this.client.get('/api/time-tracking/current');
      return response.data.active_log;
    } catch (error) {
      throw new Error(error.response?.data?.error || error.message);
    }
  }

  async uploadScreenshot(timeLogId, screenshotBuffer, takenAt, permissionDenied = false, errorMessage = null) {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      
      if (screenshotBuffer && !permissionDenied) {
        formData.append('screenshot', screenshotBuffer, {
          filename: 'screenshot.png',
          contentType: 'image/png'
        });
      }
      
      formData.append('time_log_id', timeLogId);
      formData.append('taken_at', takenAt);
      formData.append('permission_denied', permissionDenied.toString());
      
      if (errorMessage) {
        formData.append('error_message', errorMessage);
      }

      const response = await this.client.post('/api/screenshots/upload', formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      return {
        success: true,
        screenshot: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async logout() {
    try {
      if (this.apiToken) {
        await this.client.post('/api/auth/logout');
      }
    } catch (error) {
      // Ignore logout errors
      console.warn('Logout error:', error.message);
    } finally {
      this.apiToken = null;
    }
  }

  isAuthenticated() {
    return !!this.apiToken;
  }
}

module.exports = ApiClient;