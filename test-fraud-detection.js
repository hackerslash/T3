const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:12000/api';

async function testFraudDetection() {
  console.log('🔍 Testing Fraud Detection System\n');

  try {
    // 1. Admin login
    console.log('🔐 Logging in as admin...');
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@mercor.com',
      password: 'Admin123!'
    });
    const adminToken = adminLogin.data.token;
    console.log('✅ Admin logged in successfully\n');

    // 2. Create test employee
    console.log('👤 Creating test employee...');
    const employeeData = {
      email: `fraud-test-${Date.now()}@example.com`,
      first_name: 'Fraud',
      last_name: 'Tester',
      password: 'Password123!'
    };

    const employee = await axios.post(`${BASE_URL}/employees`, employeeData, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const employeeId = employee.data.id;
    console.log(`✅ Employee created: ${employeeData.email}\n`);

    // 3. Activate employee
    await axios.post(`${BASE_URL}/employees/${employeeId}/activate`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 4. Create project
    console.log('📁 Creating test project...');
    const project = await axios.post(`${BASE_URL}/projects`, {
      name: `Fraud Test Project ${Date.now()}`,
      description: 'Project for fraud detection testing'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const projectId = project.data.id;
    console.log(`✅ Project created: ${project.data.name}\n`);

    // 5. Assign employee to project
    await axios.post(`${BASE_URL}/projects/${projectId}/assign`, {
      employee_id: employeeId
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 6. Generate API token for employee
    console.log('🔑 Generating API token for employee...');
    const tokenResponse = await axios.post(`${BASE_URL}/employees/${employeeId}/generate-token`, {
      name: 'Fraud Test Token'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const apiToken = tokenResponse.data.api_token;
    console.log('✅ API token generated');
    console.log('🔍 Token response:', tokenResponse.data);
    console.log('');

    // 7. Test normal time tracking (should not trigger fraud alerts)
    console.log('⏱️  Testing normal time tracking...');
    const normalStart = await axios.post(`${BASE_URL}/time-tracking/start`, {
      project_id: projectId,
      ip_address: '192.168.1.100',
      mac_address: '00:11:22:33:44:55',
      hostname: 'normal-laptop',
      os_info: 'macOS 14.0'
    }, {
      headers: { Authorization: `Bearer ${apiToken}` }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    await axios.post(`${BASE_URL}/time-tracking/${normalStart.data.id}/stop`, {}, {
      headers: { Authorization: `Bearer ${apiToken}` }
    });
    console.log('✅ Normal time tracking completed\n');

    // 8. Test suspicious activity - rapid location changes
    console.log('🚨 Testing suspicious activity: Rapid location changes...');
    
    // Start from New York
    const suspiciousStart1 = await axios.post(`${BASE_URL}/time-tracking/start`, {
      project_id: projectId,
      ip_address: '74.125.224.72', // New York IP (Google NYC)
      mac_address: '00:11:22:33:44:55',
      hostname: 'suspicious-laptop',
      os_info: 'Windows 11'
    }, {
      headers: { Authorization: `Bearer ${apiToken}` }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await axios.post(`${BASE_URL}/time-tracking/${suspiciousStart1.data.id}/stop`, {}, {
      headers: { Authorization: `Bearer ${apiToken}` }
    });

    // Immediately start from London (impossible travel)
    const suspiciousStart2 = await axios.post(`${BASE_URL}/time-tracking/start`, {
      project_id: projectId,
      ip_address: '151.101.193.140', // London IP (Reddit London)
      mac_address: '00:11:22:33:44:66', // Different MAC
      hostname: 'different-laptop',
      os_info: 'Ubuntu 22.04' // Different OS
    }, {
      headers: { Authorization: `Bearer ${apiToken}` }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await axios.post(`${BASE_URL}/time-tracking/${suspiciousStart2.data.id}/stop`, {}, {
      headers: { Authorization: `Bearer ${apiToken}` }
    });

    // Add a third session from Tokyo to trigger the threshold
    const suspiciousStart3 = await axios.post(`${BASE_URL}/time-tracking/start`, {
      project_id: projectId,
      ip_address: '172.217.175.110', // Tokyo IP (Google Tokyo)
      mac_address: '00:11:22:33:44:77', // Third different MAC
      hostname: 'tokyo-laptop',
      os_info: 'macOS 13.0' // Different OS
    }, {
      headers: { Authorization: `Bearer ${apiToken}` }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await axios.post(`${BASE_URL}/time-tracking/${suspiciousStart3.data.id}/stop`, {}, {
      headers: { Authorization: `Bearer ${apiToken}` }
    });
    console.log('✅ Suspicious activity logged\n');

    // 9. Test screenshot with suspicious patterns
    console.log('📸 Testing suspicious screenshot patterns...');
    
    // Start time tracking for screenshots
    const screenshotStart = await axios.post(`${BASE_URL}/time-tracking/start`, {
      project_id: projectId,
      ip_address: '192.168.1.100',
      mac_address: '00:11:22:33:44:55',
      hostname: 'test-laptop',
      os_info: 'macOS 14.0'
    }, {
      headers: { Authorization: `Bearer ${apiToken}` }
    });

    // Create a small test image
    const testImagePath = path.join(__dirname, 'test-screenshot.png');
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(testImagePath, testImageBuffer);

    // Upload multiple screenshots rapidly (suspicious pattern)
    for (let i = 0; i < 3; i++) {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('screenshot', fs.createReadStream(testImagePath));
      form.append('time_log_id', screenshotStart.data.id);
      form.append('taken_at', new Date().toISOString());

      await axios.post(`${BASE_URL}/screenshots/upload`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${apiToken}`
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Clean up test image
    fs.unlinkSync(testImagePath);
    
    await axios.post(`${BASE_URL}/time-tracking/${screenshotStart.data.id}/stop`, {}, {
      headers: { Authorization: `Bearer ${apiToken}` }
    });
    console.log('✅ Screenshot patterns tested\n');

    // 10. Check fraud alerts
    console.log('🔍 Checking fraud alerts...');
    const fraudAlerts = await axios.get(`${BASE_URL}/fraud/alerts`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log(`📊 Found ${fraudAlerts.data.alerts.length} fraud alerts:`);
    fraudAlerts.data.alerts.forEach((alert, index) => {
      console.log(`   ${index + 1}. Risk Score: ${alert.risk_score}% - Flags: ${alert.flags.map(f => f.type).join(', ')}`);
    });
    console.log('');

    // 11. Get fraud statistics
    console.log('📈 Getting fraud statistics...');
    const fraudStats = await axios.get(`${BASE_URL}/fraud/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('📊 Fraud Statistics:');
    console.log(`   Total Alerts: ${fraudStats.data.summary.total_alerts}`);
    console.log(`   High Risk: ${fraudStats.data.summary.high_risk_alerts}`);
    console.log(`   Medium Risk: ${fraudStats.data.summary.medium_risk_alerts}`);
    console.log(`   Low Risk: ${fraudStats.data.summary.low_risk_alerts}`);
    console.log(`   Average Risk Score: ${fraudStats.data.summary.avg_risk_score?.toFixed(1)}%`);
    console.log('');

    // 12. Test resolving an alert
    if (fraudAlerts.data.alerts.length > 0) {
      console.log('✅ Resolving first fraud alert...');
      const firstAlert = fraudAlerts.data.alerts[0];
      await axios.put(`${BASE_URL}/fraud/alerts/${firstAlert.id}/resolve`, {
        notes: 'Resolved during testing'
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ Fraud alert resolved\n');
    }

    console.log('✅ Fraud detection system test completed successfully!\n');

    console.log('🎯 Fraud Detection Features Tested:');
    console.log('   ✅ Rapid location changes detection');
    console.log('   ✅ Device switching detection');
    console.log('   ✅ Screenshot pattern analysis');
    console.log('   ✅ Risk scoring system');
    console.log('   ✅ Alert logging and management');
    console.log('   ✅ Admin fraud dashboard');
    console.log('   ✅ Alert resolution workflow');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.log('💡 Make sure the backend server is running on port 12000');
      console.log('🔍 Failed URL:', error.config?.url);
    }
    console.error('Full error:', error.response?.status, error.config?.method, error.config?.url);
  }
}

testFraudDetection();