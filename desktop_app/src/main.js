const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, systemPreferences } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Import our modules
const ApiClient = require('./api-client');
const ScreenshotManager = require('./screenshot-manager');
const SystemInfo = require('./system-info');
const TimeTracker = require('./time-tracker');

class MercorTimeTracker {
  constructor() {
    this.mainWindow = null;
    this.tray = null;
    this.apiClient = new ApiClient();
    this.screenshotManager = new ScreenshotManager();
    this.systemInfo = new SystemInfo();
    this.timeTracker = new TimeTracker();
    this.isQuitting = false;
    
    // App state
    this.isAuthenticated = false;
    this.currentUser = null;
    this.activeTimeLog = null;
    this.projects = [];
  }

  async initialize() {
    // Set app user model ID for Windows
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.mercor.timetracker');
    }

    // Handle app events
    app.whenReady().then(() => this.onReady());
    app.on('window-all-closed', () => this.onWindowAllClosed());
    app.on('activate', () => this.onActivate());
    app.on('before-quit', () => this.onBeforeQuit());

    // Setup IPC handlers
    this.setupIpcHandlers();
  }

  async onReady() {
    // Check for required permissions on macOS
    if (process.platform === 'darwin') {
      await this.checkMacPermissions();
    }

    // Create main window
    this.createMainWindow();
    
    // Create system tray
    this.createTray();
    
    // Load saved authentication
    await this.loadSavedAuth();
  }

  onWindowAllClosed() {
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  onActivate() {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createMainWindow();
    }
  }

  onBeforeQuit() {
    this.isQuitting = true;
    
    // Stop any active time tracking
    if (this.activeTimeLog) {
      this.timeTracker.stopTracking();
    }
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 400,
      height: 600,
      minWidth: 350,
      minHeight: 500,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      },
      icon: path.join(__dirname, '../assets/icon.png'),
      show: false,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
    });

    // Load the main HTML file
    this.mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    // Handle window close
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow.hide();
      }
    });

    // Open dev tools in development
    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools();
    }
  }

  createTray() {
    const iconPath = path.join(__dirname, '../assets/tray-icon.png');
    this.tray = new Tray(iconPath);

    this.updateTrayMenu();

    this.tray.on('click', () => {
      if (this.mainWindow.isVisible()) {
        this.mainWindow.hide();
      } else {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
  }

  updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: this.activeTimeLog ? 'Stop Tracking' : 'Start Tracking',
        click: () => this.toggleTimeTracking(),
        enabled: this.isAuthenticated && this.projects.length > 0
      },
      { type: 'separator' },
      {
        label: 'Show Window',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      },
      {
        label: 'Quit',
        click: () => {
          this.isQuitting = true;
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
    
    // Update tooltip
    const tooltip = this.activeTimeLog 
      ? `Tracking: ${this.activeTimeLog.project_name}`
      : 'Mercor Time Tracker';
    this.tray.setToolTip(tooltip);
  }

  async checkMacPermissions() {
    // Check screen recording permission on macOS
    const screenAccess = systemPreferences.getMediaAccessStatus('screen');
    
    if (screenAccess !== 'granted') {
      const result = await dialog.showMessageBox({
        type: 'warning',
        title: 'Screen Recording Permission Required',
        message: 'This app needs screen recording permission to capture screenshots for time tracking.',
        detail: 'Please grant permission in System Preferences > Security & Privacy > Privacy > Screen Recording',
        buttons: ['Open System Preferences', 'Continue Without Screenshots'],
        defaultId: 0
      });

      if (result.response === 0) {
        // Open system preferences
        require('child_process').exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"');
      }
    }
  }

  setupIpcHandlers() {
    // Authentication
    ipcMain.handle('authenticate', async (event, apiToken) => {
      try {
        const result = await this.apiClient.authenticate(apiToken);
        if (result.success) {
          this.isAuthenticated = true;
          this.currentUser = result.user;
          await this.saveAuth(apiToken);
          await this.loadProjects();
        }
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Get projects
    ipcMain.handle('get-projects', async () => {
      try {
        const projects = await this.apiClient.getProjects();
        this.projects = projects;
        return { success: true, projects };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Start time tracking
    ipcMain.handle('start-tracking', async (event, projectId) => {
      try {
        const systemInfo = await this.systemInfo.collect();
        const result = await this.apiClient.startTimeTracking(projectId, systemInfo);
        
        if (result.success) {
          this.activeTimeLog = result.timeLog;
          this.timeTracker.start(this.activeTimeLog, this.apiClient, this.screenshotManager);
          this.updateTrayMenu();
        }
        
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Stop time tracking
    ipcMain.handle('stop-tracking', async () => {
      try {
        if (!this.activeTimeLog) {
          return { success: false, error: 'No active time log' };
        }

        const result = await this.apiClient.stopTimeTracking(this.activeTimeLog.id);
        
        if (result.success) {
          this.timeTracker.stop();
          this.activeTimeLog = null;
          this.updateTrayMenu();
        }
        
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Get current status
    ipcMain.handle('get-status', () => {
      return {
        isAuthenticated: this.isAuthenticated,
        currentUser: this.currentUser,
        activeTimeLog: this.activeTimeLog,
        projects: this.projects
      };
    });

    // Logout
    ipcMain.handle('logout', async () => {
      try {
        if (this.activeTimeLog) {
          await this.apiClient.stopTimeTracking(this.activeTimeLog.id);
          this.timeTracker.stop();
        }
        
        await this.apiClient.logout();
        this.clearAuth();
        
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  async toggleTimeTracking() {
    if (this.activeTimeLog) {
      await this.apiClient.stopTimeTracking(this.activeTimeLog.id);
      this.timeTracker.stop();
      this.activeTimeLog = null;
    } else if (this.projects.length > 0) {
      // Start tracking with first available project
      const systemInfo = await this.systemInfo.collect();
      const result = await this.apiClient.startTimeTracking(this.projects[0].id, systemInfo);
      
      if (result.success) {
        this.activeTimeLog = result.timeLog;
        this.timeTracker.start(this.activeTimeLog, this.apiClient, this.screenshotManager);
      }
    }
    
    this.updateTrayMenu();
  }

  async loadProjects() {
    try {
      const projects = await this.apiClient.getProjects();
      this.projects = projects;
      this.updateTrayMenu();
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  async saveAuth(apiToken) {
    const configPath = path.join(os.homedir(), '.mercor-time-tracker');
    const configFile = path.join(configPath, 'config.json');
    
    try {
      if (!fs.existsSync(configPath)) {
        fs.mkdirSync(configPath, { recursive: true });
      }
      
      const config = { apiToken };
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Failed to save auth:', error);
    }
  }

  async loadSavedAuth() {
    const configFile = path.join(os.homedir(), '.mercor-time-tracker', 'config.json');
    
    try {
      if (fs.existsSync(configFile)) {
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        if (config.apiToken) {
          const result = await this.apiClient.authenticate(config.apiToken);
          if (result.success) {
            this.isAuthenticated = true;
            this.currentUser = result.user;
            await this.loadProjects();
          }
        }
      }
    } catch (error) {
      console.error('Failed to load saved auth:', error);
    }
  }

  clearAuth() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.activeTimeLog = null;
    this.projects = [];
    
    const configFile = path.join(os.homedir(), '.mercor-time-tracker', 'config.json');
    try {
      if (fs.existsSync(configFile)) {
        fs.unlinkSync(configFile);
      }
    } catch (error) {
      console.error('Failed to clear auth:', error);
    }
    
    this.updateTrayMenu();
  }
}

// Create and initialize the app
const timeTrackerApp = new MercorTimeTracker();
timeTrackerApp.initialize();