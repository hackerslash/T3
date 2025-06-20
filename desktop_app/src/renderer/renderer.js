const { ipcRenderer } = require('electron');

class TimeTrackerUI {
  constructor() {
    this.currentUser = null;
    this.projects = [];
    this.selectedProject = null;
    this.isTracking = false;
    this.elapsedTimer = null;
    this.startTime = null;

    this.initializeElements();
    this.bindEvents();
    this.checkAuthStatus();
  }

  initializeElements() {
    // Screens
    this.loginScreen = document.getElementById('login-screen');
    this.mainScreen = document.getElementById('main-screen');

    // Login elements
    this.loginForm = document.getElementById('login-form');
    this.emailInput = document.getElementById('email');
    this.passwordInput = document.getElementById('password');
    this.loginBtn = document.getElementById('login-btn');
    this.loginError = document.getElementById('login-error');

    // Main screen elements
    this.userNameEl = document.getElementById('user-name');
    this.userEmailEl = document.getElementById('user-email');
    this.logoutBtn = document.getElementById('logout-btn');

    // Status elements
    this.statusIdle = document.getElementById('status-idle');
    this.statusTracking = document.getElementById('status-tracking');
    this.currentProjectEl = document.getElementById('current-project');
    this.elapsedTimeEl = document.getElementById('elapsed-time');

    // Project elements
    this.projectsList = document.getElementById('projects-list');
    this.startBtn = document.getElementById('start-btn');
    this.stopBtn = document.getElementById('stop-btn');

    // Settings
    this.screenshotIntervalSelect = document.getElementById('screenshot-interval');

    // Status messages
    this.statusMessages = document.getElementById('status-messages');
  }

  bindEvents() {
    // Login form
    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));

    // Logout
    this.logoutBtn.addEventListener('click', () => this.handleLogout());

    // Control buttons
    this.startBtn.addEventListener('click', () => this.handleStartTracking());
    this.stopBtn.addEventListener('click', () => this.handleStopTracking());

    // Settings
    this.screenshotIntervalSelect.addEventListener('change', (e) => {
      // TODO: Implement screenshot interval change
      console.log('Screenshot interval changed to:', e.target.value);
    });
  }

  async checkAuthStatus() {
    try {
      const status = await ipcRenderer.invoke('get-status');
      
      if (status.isAuthenticated) {
        this.currentUser = status.currentUser;
        this.projects = status.projects;
        this.showMainScreen();
        
        if (status.activeTimeLog) {
          this.startTrackingUI(status.activeTimeLog);
        }
      } else {
        this.showLoginScreen();
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      this.showLoginScreen();
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value.trim();
    
    if (!email || !password) {
      this.showError('Please enter both email and password');
      return;
    }

    this.setLoginLoading(true);
    this.hideError();

    try {
      const result = await ipcRenderer.invoke('login', { email, password });
      
      if (result.success) {
        this.currentUser = result.user;
        await this.loadProjects();
        this.showMainScreen();
        this.showMessage('Successfully logged in!', 'success');
      } else {
        this.showError(result.error || 'Authentication failed');
      }
    } catch (error) {
      this.showError('Network error. Please check your connection.');
    } finally {
      this.setLoginLoading(false);
    }
  }

  async handleLogout() {
    try {
      await ipcRenderer.invoke('logout');
      this.currentUser = null;
      this.projects = [];
      this.selectedProject = null;
      this.stopTrackingUI();
      this.showLoginScreen();
      this.emailInput.value = '';
      this.passwordInput.value = '';
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async loadProjects() {
    try {
      const result = await ipcRenderer.invoke('get-projects');
      
      if (result.success) {
        this.projects = result.projects;
        this.renderProjects();
      } else {
        this.showMessage('Failed to load projects: ' + result.error, 'error');
      }
    } catch (error) {
      this.showMessage('Failed to load projects', 'error');
    }
  }

  renderProjects() {
    if (this.projects.length === 0) {
      this.projectsList.innerHTML = '<div class="loading">No projects assigned</div>';
      return;
    }

    this.projectsList.innerHTML = '';
    
    this.projects.forEach(project => {
      const projectEl = document.createElement('div');
      projectEl.className = 'project-item';
      projectEl.dataset.projectId = project.id;
      
      projectEl.innerHTML = `
        <div class="project-name">${project.name}</div>
        <div class="project-description">${project.description || 'No description'}</div>
      `;
      
      projectEl.addEventListener('click', () => this.selectProject(project));
      this.projectsList.appendChild(projectEl);
    });
  }

  selectProject(project) {
    this.selectedProject = project;
    
    // Update UI
    document.querySelectorAll('.project-item').forEach(el => {
      el.classList.remove('selected');
    });
    
    document.querySelector(`[data-project-id="${project.id}"]`).classList.add('selected');
    this.startBtn.disabled = false;
  }

  async handleStartTracking() {
    if (!this.selectedProject) {
      this.showMessage('Please select a project first', 'error');
      return;
    }

    try {
      const result = await ipcRenderer.invoke('start-tracking', this.selectedProject.id);
      
      if (result.success) {
        this.startTrackingUI(result.timeLog);
        this.showMessage(`Started tracking: ${this.selectedProject.name}`, 'success');
      } else {
        this.showMessage('Failed to start tracking: ' + result.error, 'error');
      }
    } catch (error) {
      this.showMessage('Failed to start tracking', 'error');
    }
  }

  async handleStopTracking() {
    try {
      const result = await ipcRenderer.invoke('stop-tracking');
      
      if (result.success) {
        this.stopTrackingUI();
        this.showMessage('Time tracking stopped', 'info');
      } else {
        this.showMessage('Failed to stop tracking: ' + result.error, 'error');
      }
    } catch (error) {
      this.showMessage('Failed to stop tracking', 'error');
    }
  }

  startTrackingUI(timeLog) {
    this.isTracking = true;
    this.startTime = new Date(timeLog.start_time);
    
    // Update UI
    this.statusIdle.classList.add('hidden');
    this.statusTracking.classList.remove('hidden');
    this.currentProjectEl.textContent = timeLog.project_name;
    
    this.startBtn.classList.add('hidden');
    this.stopBtn.classList.remove('hidden');
    
    // Disable project selection
    document.querySelectorAll('.project-item').forEach(el => {
      el.style.pointerEvents = 'none';
      el.style.opacity = '0.6';
    });
    
    // Start elapsed time timer
    this.startElapsedTimer();
  }

  stopTrackingUI() {
    this.isTracking = false;
    this.startTime = null;
    
    // Update UI
    this.statusTracking.classList.add('hidden');
    this.statusIdle.classList.remove('hidden');
    
    this.stopBtn.classList.add('hidden');
    this.startBtn.classList.remove('hidden');
    this.startBtn.disabled = !this.selectedProject;
    
    // Re-enable project selection
    document.querySelectorAll('.project-item').forEach(el => {
      el.style.pointerEvents = 'auto';
      el.style.opacity = '1';
    });
    
    // Stop elapsed time timer
    this.stopElapsedTimer();
  }

  startElapsedTimer() {
    this.updateElapsedTime();
    this.elapsedTimer = setInterval(() => {
      this.updateElapsedTime();
    }, 1000);
  }

  stopElapsedTimer() {
    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
    this.elapsedTimeEl.textContent = '00:00:00';
  }

  updateElapsedTime() {
    if (!this.startTime) return;
    
    const elapsed = Date.now() - this.startTime.getTime();
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.elapsedTimeEl.textContent = timeString;
  }

  showLoginScreen() {
    this.loginScreen.classList.remove('hidden');
    this.mainScreen.classList.add('hidden');
  }

  showMainScreen() {
    this.loginScreen.classList.add('hidden');
    this.mainScreen.classList.remove('hidden');
    
    // Update user info
    if (this.currentUser) {
      this.userNameEl.textContent = `Welcome, ${this.currentUser.first_name}`;
      this.userEmailEl.textContent = this.currentUser.email;
    }
    
    this.renderProjects();
  }

  setLoginLoading(loading) {
    const btnText = this.loginBtn.querySelector('.btn-text');
    const btnSpinner = this.loginBtn.querySelector('.btn-spinner');
    
    if (loading) {
      btnText.classList.add('hidden');
      btnSpinner.classList.remove('hidden');
      this.loginBtn.disabled = true;
    } else {
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
      this.loginBtn.disabled = false;
    }
  }

  showError(message) {
    this.loginError.textContent = message;
    this.loginError.classList.remove('hidden');
  }

  hideError() {
    this.loginError.classList.add('hidden');
  }

  showMessage(message, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `status-message ${type}`;
    messageEl.textContent = message;
    
    this.statusMessages.appendChild(messageEl);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 5000);
  }
}

// Initialize the UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TimeTrackerUI();
});