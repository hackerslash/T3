const screenshot = require('screenshot-desktop');
const fs = require('fs');
const path = require('path');
const os = require('os');

class ScreenshotManager {
  constructor() {
    this.isCapturing = false;
    this.captureInterval = 10 * 60 * 1000; // 10 minutes in milliseconds
    this.tempDir = path.join(os.tmpdir(), 'mercor-screenshots');
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async captureScreenshot() {
    try {
      // Capture screenshot
      const screenshotBuffer = await screenshot({ format: 'png' });
      
      // Save temporarily
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;
      const filepath = path.join(this.tempDir, filename);
      
      fs.writeFileSync(filepath, screenshotBuffer);
      
      return {
        success: true,
        buffer: screenshotBuffer,
        filepath,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      
      // Check if it's a permission error
      const isPermissionError = error.message.includes('permission') || 
                               error.message.includes('access') ||
                               error.message.includes('denied');
      
      return {
        success: false,
        permissionDenied: isPermissionError,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async startPeriodicCapture(timeLogId, apiClient) {
    if (this.isCapturing) {
      console.warn('Screenshot capture already running');
      return;
    }

    this.isCapturing = true;
    console.log('Starting periodic screenshot capture');

    // Take initial screenshot
    await this.captureAndUpload(timeLogId, apiClient);

    // Set up interval for periodic captures
    this.captureIntervalId = setInterval(async () => {
      if (this.isCapturing) {
        await this.captureAndUpload(timeLogId, apiClient);
      }
    }, this.captureInterval);
  }

  async captureAndUpload(timeLogId, apiClient) {
    try {
      const result = await this.captureScreenshot();
      
      if (result.success) {
        // Upload screenshot
        const uploadResult = await apiClient.uploadScreenshot(
          timeLogId,
          result.buffer,
          result.timestamp
        );
        
        if (uploadResult.success) {
          console.log('Screenshot uploaded successfully');
          // Clean up temp file
          this.cleanupTempFile(result.filepath);
        } else {
          console.error('Screenshot upload failed:', uploadResult.error);
        }
      } else {
        // Upload error information (e.g., permission denied)
        const uploadResult = await apiClient.uploadScreenshot(
          timeLogId,
          null,
          result.timestamp,
          result.permissionDenied,
          result.error
        );
        
        if (uploadResult.success) {
          console.log('Screenshot error logged successfully');
        }
      }
    } catch (error) {
      console.error('Screenshot capture and upload failed:', error);
    }
  }

  stopPeriodicCapture() {
    if (!this.isCapturing) {
      return;
    }

    this.isCapturing = false;
    
    if (this.captureIntervalId) {
      clearInterval(this.captureIntervalId);
      this.captureIntervalId = null;
    }
    
    console.log('Stopped periodic screenshot capture');
    
    // Clean up temp directory
    this.cleanupTempDirectory();
  }

  cleanupTempFile(filepath) {
    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    } catch (error) {
      console.warn('Failed to cleanup temp file:', error.message);
    }
  }

  cleanupTempDirectory() {
    try {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        const filepath = path.join(this.tempDir, file);
        fs.unlinkSync(filepath);
      }
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error.message);
    }
  }

  setCaptureInterval(minutes) {
    this.captureInterval = minutes * 60 * 1000;
    console.log(`Screenshot capture interval set to ${minutes} minutes`);
  }

  isActive() {
    return this.isCapturing;
  }
}

module.exports = ScreenshotManager;