// src/services/appsScriptService.js
const axios = require('axios');

/**
 * Apps Script Service
 * Handles all communication with your Google Apps Script backend
 * This replaces direct Google Sheets access - Apps Script is your database layer
 */
class AppsScriptService {
  constructor() {
    this.baseUrl = process.env.APPS_SCRIPT_URL;
    this.token = process.env.APPS_SCRIPT_TOKEN;
    this.timeout = parseInt(process.env.APPS_SCRIPT_TIMEOUT_MS || '10000');
    this.retries = parseInt(process.env.APPS_SCRIPT_RETRIES || '2');
  }

  /**
   * Make GET request to Apps Script
   */
  async get(action, params = {}) {
    try {
      const url = new URL(this.baseUrl);
      url.searchParams.append('action', action);
      url.searchParams.append('token', this.token);
      
      // Add any additional params
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      });

      console.log(`📡 Apps Script GET: ${action}`, params);

      const response = await axios.get(url.toString(), {
        timeout: this.timeout,
      });

      console.log(`✅ Apps Script Response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Apps Script GET Error (${action}):`, error.message);
      throw this._handleError(error, action);
    }
  }

  /**
   * Make POST request to Apps Script
   */
  async post(action, data = {}) {
    try {
      console.log(`📡 Apps Script POST: ${action}`, data);

      const response = await axios.post(
        this.baseUrl,
        {
          token: this.token,
          action: action,
          data: data,
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ Apps Script Response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Apps Script POST Error (${action}):`, error.message);
      throw this._handleError(error, action);
    }
  }

  /**
   * Handle and format errors
   */
  _handleError(error, action) {
    if (error.response) {
      // Apps Script returned an error
      return new Error(
        `Apps Script Error (${action}): ${error.response.data?.error || error.response.statusText}`
      );
    } else if (error.request) {
      // No response received
      return new Error(`Apps Script Timeout (${action}): No response received`);
    } else {
      // Request setup error
      return new Error(`Apps Script Request Error (${action}): ${error.message}`);
    }
  }

  /* ============================================================
   *                    AUTHENTICATION APIs
   * ==========================================================*/

  /**
   * Store OTP in Apps Script (Node generates OTP and emails it)
   * @param {Object} data - { email, otp, otp_type, expires_at }
   */
  async storeOTP(data) {
    return await this.post('storeOTP', data);
  }

  /**
   * Verify OTP stored in Apps Script
   * @param {Object} data - { email, otp }
   */
  async verifyOTP(data) {
    return await this.post('verifyOTP', data);
  }

  /**
   * Get consultant by email
   * @param {string} email
   */
  async getConsultantByEmail(email) {
    return await this.post('getConsultantByEmail', { email });
  }

  /**
   * Create or update consultant
   * @param {Object} data - { email, name, phone }
   */
  async createConsultant(data) {
    return await this.post('createConsultant', data);
  }

  /**
   * Update consultant last login timestamp
   * @param {string} email
   */
  async updateConsultantLastLogin(email) {
    return await this.post('updateConsultantLastLogin', { email });
  }

  /**
   * Update consultant profile (name, phone)
   * @param {Object} data - { email, name, phone }
   */
  async updateConsultantProfile(data) {
    return await this.post('updateConsultantProfile', data);
  }

  /* ============================================================
   *                    PROJECT & CLIENT APIs
   * ==========================================================*/

  /**
   * Get all projects
   */
  async getAllProjects() {
    return await this.get('getAllProjects');
  }

  /**
   * Get project by code
   * @param {string} code - Project code
   */
  async getProject(code) {
    return await this.get('getProject', { code });
  }

  /**
   * Get client by code
   * @param {string} code - Client code
   */
  async getClient(code) {
    return await this.get('getClient', { code });
  }

  /**
   * Get team members
   */
  async getTeam() {
    return await this.get('getTeam');
  }

  /**
   * Get consultation modes
   */
  async getModes() {
    return await this.get('getModes');
  }

  /* ============================================================
   *                    INVOICE APIs
   * ==========================================================*/

  /**
   * Save invoice (create or update, draft or final)
   * @param {Object} invoiceData - Complete invoice object
   */
  async saveInvoice(invoiceData) {
    return await this.post('saveInvoice', invoiceData);
  }

  /**
   * Get invoice by ID
   * @param {string} invoiceId
   */
  async getInvoice(invoiceId) {
    return await this.get('getInvoice', { invoiceId });
  }

  /**
   * List invoices with optional limit
   * @param {number} limit - Optional limit
   */
  async listInvoices(limit) {
    return await this.get('listInvoices', { limit });
  }

  /**
   * Send invoice email
   * @param {Object} data - { invoiceId, toEmail, subject, message }
   */
  async sendInvoiceEmail(data) {
    return await this.post('sendInvoiceEmail', data);
  }

  /* ============================================================
   *                    HELPER METHODS
   * ==========================================================*/

  /**
   * Test connection to Apps Script
   */
  async testConnection() {
    try {
      console.log('🔌 Testing Apps Script connection...');
      console.log('   URL:', this.baseUrl);
      console.log('   Token:', this.token ? '✓ Set' : '✗ Missing');
      
      const result = await this.getTeam();
      console.log('✅ Apps Script connection successful!');
      return { ok: true, result };
    } catch (error) {
      console.error('❌ Apps Script connection failed:', error.message);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get consultant dashboard data
   * @param {string} email - Consultant email
   */
  async getConsultantDashboard(email) {
    try {
      // Get consultant info
      const consultantRes = await this.getConsultantByEmail(email);
      if (!consultantRes.ok) {
        throw new Error('Consultant not found');
      }

      const consultant = consultantRes.consultant;

      // Get all invoices
      const invoices = await this.listInvoices();
      
      // Filter invoices for this consultant
      const consultantInvoices = invoices.filter(
        inv => inv.consultantId === consultant.consultant_id
      );

      // Calculate stats
      const totalInvoices = consultantInvoices.length;
      const finalInvoices = consultantInvoices.filter(inv => inv.status === 'FINAL');
      const draftInvoices = consultantInvoices.filter(inv => inv.status === 'DRAFT');
      
      const totalRevenue = finalInvoices.reduce(
        (sum, inv) => sum + (parseFloat(inv.netEarnings) || 0),
        0
      );

      return {
        consultant,
        stats: {
          totalInvoices,
          finalInvoices: finalInvoices.length,
          draftInvoices: draftInvoices.length,
          totalRevenue,
        },
        recentInvoices: consultantInvoices.slice(0, 5),
      };
    } catch (error) {
      console.error('Error getting consultant dashboard:', error);
      throw error;
    }
  }
}

// Export singleton instance
const appsScriptService = new AppsScriptService();
module.exports = appsScriptService;