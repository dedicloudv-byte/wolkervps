const axios = require('axios');
const config = require('../config/config');

class CloudflareAPI {
  constructor(apiToken, accountId) {
    this.apiToken = apiToken;
    this.accountId = accountId;
    this.baseURL = config.cloudflare.apiUrl;
    
    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Validate API token and get account info
  async validateToken() {
    try {
      const response = await this.axios.get('/user/tokens/verify');
      if (response.data.success) {
        // Get account details
        const accountResponse = await this.axios.get('/accounts');
        if (accountResponse.data.success && accountResponse.data.result.length > 0) {
          return {
            success: true,
            account: accountResponse.data.result[0],
            tokenInfo: response.data.result
          };
        }
      }
      return { success: false, error: 'Invalid token or no accounts found' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.errors?.[0]?.message || error.message 
      };
    }
  }

  // Get account details
  async getAccountDetails() {
    try {
      const response = await this.axios.get(`/accounts/${this.accountId}`);
      if (response.data.success) {
        return { success: true, account: response.data.result };
      }
      return { success: false, error: 'Failed to get account details' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.errors?.[0]?.message || error.message 
      };
    }
  }

  // List all workers
  async listWorkers() {
    try {
      const response = await this.axios.get(`/accounts/${this.accountId}/workers/scripts`);
      if (response.data.success) {
        return { success: true, workers: response.data.result };
      }
      return { success: false, error: 'Failed to list workers' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.errors?.[0]?.message || error.message 
      };
    }
  }

  // Get worker details
  async getWorker(scriptName) {
    try {
      const response = await this.axios.get(`/accounts/${this.accountId}/workers/scripts/${scriptName}`);
      if (response.data.success) {
        return { success: true, worker: response.data.result };
      }
      return { success: false, error: 'Worker not found' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.errors?.[0]?.message || error.message 
      };
    }
  }

  // Deploy worker with script
  async deployWorker(scriptName, scriptContent, bindings = []) {
    try {
      const formData = new FormData();
      
      // Create metadata
      const metadata = {
        body_part: 'script',
        bindings: bindings
      };
      
      // Create multipart form data
      const boundary = '----WorkerBoundary' + Date.now();
      const body = this.createMultipartBody(boundary, scriptContent, JSON.stringify(metadata));
      
      const response = await this.axios.put(
        `/accounts/${this.accountId}/workers/scripts/${scriptName}`,
        body,
        {
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`
          }
        }
      );
      
      if (response.data.success) {
        return { 
          success: true, 
          worker: response.data.result,
          url: `https://${scriptName}.${this.accountId}.workers.dev`
        };
      }
      return { success: false, error: 'Failed to deploy worker' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.errors?.[0]?.message || error.message 
      };
    }
  }

  // Delete worker
  async deleteWorker(scriptName) {
    try {
      const response = await this.axios.delete(`/accounts/${this.accountId}/workers/scripts/${scriptName}`);
      if (response.data.success) {
        return { success: true };
      }
      return { success: false, error: 'Failed to delete worker' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.errors?.[0]?.message || error.message 
      };
    }
  }

  // Create multipart body for worker deployment
  createMultipartBody(boundary, scriptContent, metadata) {
    const lines = [];
    lines.push(`--${boundary}`);
    lines.push(`Content-Disposition: form-data; name="metadata"`);
    lines.push(`Content-Type: application/json`);
    lines.push('');
    lines.push(metadata);
    lines.push(`--${boundary}`);
    lines.push(`Content-Disposition: form-data; name="script"`);
    lines.push(`Content-Type: application/javascript`);
    lines.push('');
    lines.push(scriptContent);
    lines.push(`--${boundary}--`);
    return lines.join('\r\n');
  }

  // Deploy worker with wrangler.toml configuration
  async deployWorkerWithConfig(scriptName, scriptContent, config = {}) {
    try {
      const bindings = [];
      
      // Add environment variables if provided
      if (config.vars) {
        Object.entries(config.vars).forEach(([key, value]) => {
          bindings.push({
            name: key,
            type: 'plain_text',
            text: value
          });
        });
      }
      
      // Add KV namespaces if provided
      if (config.kv_namespaces) {
        config.kv_namespaces.forEach(kv => {
          bindings.push({
            name: kv.binding,
            type: 'kv_namespace',
            namespace_id: kv.id
          });
        });
      }
      
      return await this.deployWorker(scriptName, scriptContent, bindings);
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}

module.exports = CloudflareAPI;