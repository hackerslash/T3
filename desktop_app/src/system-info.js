const si = require('systeminformation');
const os = require('os');

class SystemInfo {
  constructor() {
    this.cachedInfo = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.lastCacheTime = 0;
  }

  async collect() {
    // Return cached info if still valid
    if (this.cachedInfo && (Date.now() - this.lastCacheTime) < this.cacheExpiry) {
      return this.cachedInfo;
    }

    try {
      const info = {
        hostname: os.hostname(),
        os_info: await this.getOSInfo(),
        ip_address: await this.getIPAddress(),
        mac_address: await this.getMACAddress()
      };

      // Cache the result
      this.cachedInfo = info;
      this.lastCacheTime = Date.now();

      return info;
    } catch (error) {
      console.error('Failed to collect system info:', error);
      
      // Return basic info as fallback
      return {
        hostname: os.hostname(),
        os_info: `${os.type()} ${os.release()}`,
        ip_address: null,
        mac_address: null
      };
    }
  }

  async getOSInfo() {
    try {
      const osInfo = await si.osInfo();
      return `${osInfo.platform} ${osInfo.distro} ${osInfo.release} (${osInfo.arch})`;
    } catch (error) {
      return `${os.type()} ${os.release()} (${os.arch()})`;
    }
  }

  async getIPAddress() {
    try {
      const networkInterfaces = await si.networkInterfaces();
      
      // Find the first non-internal IPv4 address
      for (const iface of networkInterfaces) {
        if (!iface.internal && iface.ip4 && iface.ip4 !== '127.0.0.1') {
          return iface.ip4;
        }
      }
      
      // Fallback to first available IP
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            return iface.address;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get IP address:', error);
      return null;
    }
  }

  async getMACAddress() {
    try {
      const networkInterfaces = await si.networkInterfaces();
      
      // Find the first non-internal interface with a MAC address
      for (const iface of networkInterfaces) {
        if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
          return iface.mac;
        }
      }
      
      // Fallback to OS network interfaces
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
            return iface.mac;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get MAC address:', error);
      return null;
    }
  }

  async getSystemStats() {
    try {
      const [cpu, mem, disk] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize()
      ]);

      return {
        cpu_usage: Math.round(cpu.currentLoad),
        memory_usage: Math.round((mem.used / mem.total) * 100),
        disk_usage: disk.length > 0 ? Math.round((disk[0].used / disk[0].size) * 100) : 0,
        uptime: os.uptime()
      };
    } catch (error) {
      console.error('Failed to get system stats:', error);
      return {
        cpu_usage: 0,
        memory_usage: 0,
        disk_usage: 0,
        uptime: os.uptime()
      };
    }
  }

  clearCache() {
    this.cachedInfo = null;
    this.lastCacheTime = 0;
  }
}

module.exports = SystemInfo;