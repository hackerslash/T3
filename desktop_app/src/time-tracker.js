const cron = require('node-cron');

class TimeTracker {
  constructor() {
    this.isTracking = false;
    this.currentTimeLog = null;
    this.startTime = null;
    this.apiClient = null;
    this.screenshotManager = null;
    this.statusUpdateTask = null;
  }

  start(timeLog, apiClient, screenshotManager) {
    if (this.isTracking) {
      console.warn('Time tracking already active');
      return;
    }

    this.isTracking = true;
    this.currentTimeLog = timeLog;
    this.startTime = new Date();
    this.apiClient = apiClient;
    this.screenshotManager = screenshotManager;

    console.log(`Started tracking time for project: ${timeLog.project_name}`);

    // Start screenshot capture
    this.screenshotManager.startPeriodicCapture(timeLog.id, apiClient);

    // Start periodic status updates (every 5 minutes)
    this.statusUpdateTask = cron.schedule('*/5 * * * *', async () => {
      await this.sendStatusUpdate();
    }, {
      scheduled: false
    });
    
    this.statusUpdateTask.start();

    // Send initial status update
    this.sendStatusUpdate();
  }

  stop() {
    if (!this.isTracking) {
      console.warn('No active time tracking to stop');
      return;
    }

    console.log('Stopping time tracking');

    this.isTracking = false;
    
    // Stop screenshot capture
    if (this.screenshotManager) {
      this.screenshotManager.stopPeriodicCapture();
    }

    // Stop status updates
    if (this.statusUpdateTask) {
      this.statusUpdateTask.stop();
      this.statusUpdateTask = null;
    }

    // Clear state
    this.currentTimeLog = null;
    this.startTime = null;
    this.apiClient = null;
    this.screenshotManager = null;
  }

  async sendStatusUpdate() {
    if (!this.isTracking || !this.apiClient) {
      return;
    }

    try {
      // Get current time log status from server
      const currentLog = await this.apiClient.getCurrentTimeLog();
      
      if (!currentLog) {
        console.warn('Server reports no active time log, stopping local tracking');
        this.stop();
        return;
      }

      // Update local state if needed
      if (currentLog.id !== this.currentTimeLog?.id) {
        console.log('Time log changed on server, updating local state');
        this.currentTimeLog = currentLog;
      }

      console.log(`Status update: Tracking ${currentLog.project_name} for ${this.getElapsedTime()}`);
    } catch (error) {
      console.error('Failed to send status update:', error);
    }
  }

  getElapsedTime() {
    if (!this.startTime) {
      return '00:00:00';
    }

    const elapsed = Date.now() - this.startTime.getTime();
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getCurrentStatus() {
    return {
      isTracking: this.isTracking,
      timeLog: this.currentTimeLog,
      elapsedTime: this.getElapsedTime(),
      startTime: this.startTime
    };
  }

  isActive() {
    return this.isTracking;
  }
}

module.exports = TimeTracker;