// frontend/js/test-suite.js
// Automated Testing Suite for WaQtek2 Backend

class WaQtekTestSuite {
  constructor() {
    this.baseURL = 'http://localhost:5000/api';
    this.token = localStorage.getItem('token');
    this.results = [];
    this.testUser = {
      email: `test-${Date.now()}@waqtek.com`,
      password: 'TestPass123!',
      role: 'admin'
    };
  }

  // ====== UTILITY FUNCTIONS ======
  async request(endpoint, method = 'GET', body = null) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (this.token) {
      options.headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    if (body) options.body = JSON.stringify(body);
    
    return fetch(`${this.baseURL}${endpoint}`, options);
  }

  logResult(testName, passed, message, data = null) {
    const result = {
      test: testName,
      passed,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    this.results.push(result);
    
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${testName}: ${message}`);
    if (data) console.log('   Data:', data);
  }

  printSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = ((passed / total) * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log(`TESTING SUMMARY: ${passed}/${total} tests passed (${percentage}%)`);
    console.log('='.repeat(60) + '\n');
    
    return { passed, total, percentage };
  }

  // ====== PHASE 1: AUTHENTICATION ======
  async testPhase1() {
    console.log('\n📝 PHASE 1: AUTHENTICATION TESTS\n');
    
    // Test 1.1: Registration
    await this.testRegistration();
    
    // Test 1.2: Login
    await this.testLogin();
    
    // Test 1.3: Invalid Login
    await this.testInvalidLogin();
  }

  async testRegistration() {
    try {
      const res = await this.request('/auth/register', 'POST', {
        email: this.testUser.email,
        password: this.testUser.password,
        role: this.testUser.role
      });
      
      const data = await res.json();
      
      if (res.ok && data.token) {
        this.token = data.token;
        localStorage.setItem('token', this.token);
        this.logResult('Registration', true, 'User registered successfully', {
          email: this.testUser.email,
          hasToken: !!data.token
        });
      } else {
        this.logResult('Registration', false, `Status ${res.status}: ${data.error}`, data);
      }
    } catch (e) {
      this.logResult('Registration', false, `Error: ${e.message}`);
    }
  }

  async testLogin() {
    try {
      const res = await this.request('/auth/login', 'POST', {
        email: this.testUser.email,
        password: this.testUser.password
      });
      
      const data = await res.json();
      
      if (res.ok && data.token) {
        this.token = data.token;
        localStorage.setItem('token', this.token);
        this.logResult('Login', true, 'Login successful', {
          email: this.testUser.email,
          tokenLength: data.token.length
        });
      } else {
        this.logResult('Login', false, `Status ${res.status}: ${data.error}`, data);
      }
    } catch (e) {
      this.logResult('Login', false, `Error: ${e.message}`);
    }
  }

  async testInvalidLogin() {
    try {
      const res = await this.request('/auth/login', 'POST', {
        email: this.testUser.email,
        password: 'WrongPassword123'
      });
      
      const passed = res.status === 401 || res.status === 400;
      this.logResult('Invalid Login (Negative Test)', passed, 
        `Correctly rejected with status ${res.status}`);
    } catch (e) {
      this.logResult('Invalid Login', false, `Error: ${e.message}`);
    }
  }

  // ====== PHASE 2: ESTABLISHMENTS ======
  async testPhase2() {
    console.log('\n🏢 PHASE 2: ESTABLISHMENTS TESTS\n');
    
    await this.testCreateEstablishment();
    await this.testGetEstablishments();
    this.estId = 1; // For subsequent tests
  }

  async testCreateEstablishment() {
    try {
      const res = await this.request('/establishments', 'POST', {
        name: 'Test Restaurant ' + Date.now(),
        address: '123 Test Street',
        email: 'test@restaurant.com',
        phone: '+212612345678',
        description: 'Test establishment'
      });
      
      const data = await res.json();
      
      if (res.ok && data.id) {
        this.estId = data.id;
        this.logResult('Create Establishment', true, 
          `Created establishment ID: ${data.id}`, data);
      } else {
        this.logResult('Create Establishment', false, 
          `Status ${res.status}: ${data.message || data.error}`, data);
      }
    } catch (e) {
      this.logResult('Create Establishment', false, `Error: ${e.message}`);
    }
  }

  async testGetEstablishments() {
    try {
      const res = await this.request('/establishments');
      const data = await res.json();
      
      const passed = res.ok && Array.isArray(data);
      this.logResult('Get Establishments', passed, 
        `Retrieved ${data.length || 0} establishments`, 
        { count: data.length, data: data.slice(0, 2) });
    } catch (e) {
      this.logResult('Get Establishments', false, `Error: ${e.message}`);
    }
  }

  // ====== PHASE 3: QUEUES ======
  async testPhase3() {
    console.log('\n📋 PHASE 3: QUEUES TESTS\n');
    
    await this.testCreateQueue();
    await this.testGetQueues();
  }

  async testCreateQueue() {
    try {
      const res = await this.request('/queues', 'POST', {
        establishmentId: this.estId || 1,
        name: 'Test Queue ' + Date.now(),
        type: 'standard',
        description: 'Test queue',
        capacity: 50,
        priority: 'normal'
      });
      
      const data = await res.json();
      
      if (res.ok && data.id) {
        this.queueId = data.id;
        this.logResult('Create Queue', true, 
          `Created queue ID: ${data.id}`, data);
      } else {
        this.logResult('Create Queue', false, 
          `Status ${res.status}: ${data.message || data.error}`);
      }
    } catch (e) {
      this.logResult('Create Queue', false, `Error: ${e.message}`);
    }
  }

  async testGetQueues() {
    try {
      const res = await this.request(`/queues`);
      const data = await res.json();
      
      const passed = res.ok && Array.isArray(data);
      this.logResult('Get Queues', passed, 
        `Retrieved ${data.length || 0} queues`);
    } catch (e) {
      this.logResult('Get Queues', false, `Error: ${e.message}`);
    }
  }

  // ====== PHASE 4: TICKETS ======
  async testPhase4() {
    console.log('\n🎫 PHASE 4: TICKETS TESTS\n');
    
    await this.testCreatePublicTicket();
    await this.testGetTickets();
    await this.testUpdateTicketStatus();
  }

  async testCreatePublicTicket() {
    try {
      const res = await fetch(`${this.baseURL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueId: this.queueId || 1,
          customerName: 'Test Customer',
          customerEmail: 'customer@test.com',
          customerPhone: '+212612345678'
        })
      });
      
      const data = await res.json();
      
      if (res.ok && data.id) {
        this.ticketId = data.id;
        this.ticketNumber = data.number;
        this.logResult('Create Public Ticket', true, 
          `Created ticket #${data.number}`, { id: data.id, number: data.number });
      } else {
        this.logResult('Create Public Ticket', false, 
          `Status ${res.status}`);
      }
    } catch (e) {
      this.logResult('Create Public Ticket', false, `Error: ${e.message}`);
    }
  }

  async testGetTickets() {
    try {
      const res = await this.request(`/queues/${this.queueId || 1}/tickets`);
      const data = await res.json();
      
      const passed = res.ok && Array.isArray(data);
      this.logResult('Get Tickets', passed, 
        `Retrieved ${data.length || 0} tickets`);
    } catch (e) {
      this.logResult('Get Tickets', false, `Error: ${e.message}`);
    }
  }

  async testUpdateTicketStatus() {
    if (!this.ticketId) {
      console.log('⚠️  Skipping: No ticket created');
      return;
    }
    
    try {
      const res = await this.request(`/tickets/${this.ticketId}/status`, 'PUT', {
        status: 'called'
      });
      
      const data = await res.json();
      const passed = res.ok;
      
      this.logResult('Update Ticket Status', passed, 
        `Status updated to: called`, { newStatus: 'called' });
    } catch (e) {
      this.logResult('Update Ticket Status', false, `Error: ${e.message}`);
    }
  }

  // ====== PHASE 5: STATISTICS ======
  async testPhase5() {
    console.log('\n📊 PHASE 5: STATISTICS TESTS\n');
    
    await this.testDashboardStats();
    await this.testEstablishmentStats();
  }

  async testDashboardStats() {
    try {
      const res = await this.request('/stats/dashboard');
      const data = await res.json();
      
      const hasRequiredFields = data && 
        ('establishments' in data || 'est_count' in data);
      
      this.logResult('Dashboard Stats', res.ok && hasRequiredFields, 
        'Stats loaded', { fields: Object.keys(data).slice(0, 5) });
    } catch (e) {
      this.logResult('Dashboard Stats', false, `Error: ${e.message}`);
    }
  }

  async testEstablishmentStats() {
    try {
      const res = await this.request(`/stats/establishment/${this.estId || 1}`);
      const data = await res.json();
      
      this.logResult('Establishment Stats', res.ok, 
        'Establishment stats loaded');
    } catch (e) {
      this.logResult('Establishment Stats', false, `Error: ${e.message}`);
    }
  }

  // ====== RUN ALL TESTS ======
  async runAllTests() {
    console.log('🚀 STARTING COMPREHENSIVE TEST SUITE\n');
    console.log('Backend URL:', this.baseURL);
    console.log('Environment:', localStorage.getItem('token') ? 'Authenticated' : 'Public');
    console.log('=' .repeat(60) + '\n');
    
    try {
      await this.testPhase1();
      await this.testPhase2();
      await this.testPhase3();
      await this.testPhase4();
      await this.testPhase5();
    } catch (e) {
      console.error('Test suite error:', e);
    }
    
    const summary = this.printSummary();
    
    // Store results
    window.testResults = this.results;
    window.testSummary = summary;
    
    return summary;
  }
}

// ====== USAGE ======
// In browser console:
// const suite = new WaQtekTestSuite();
// await suite.runAllTests();
// Or run specific phases:
// await suite.testPhase1(); // Auth only
// await suite.testPhase2(); // Establishments only
// etc.

console.log('%c✅ Test Suite Loaded', 'color: green; font-size: 14px');
console.log('%cRun: const suite = new WaQtekTestSuite(); await suite.runAllTests();', 
  'color: blue; font-style: italic');
