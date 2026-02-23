const axios = require('axios');

class YCombinatorAPIScraper {
  constructor() {
    this.baseUrl = 'https://www.ycombinator.com';
    this.apiUrl = 'https://api.ycombinator.com';
  }

  async fetchFromAPI(endpoint) {
    try {
      const response = await axios.get(`${this.apiUrl}${endpoint}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      console.error(`API error for ${endpoint}:`, error.message);
      return null;
    }
  }

  async getCompanies(page = 1, filters = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: '50'
    });

    if (filters.batch) params.append('batch', filters.batch);
    if (filters.industry) params.append('industry', filters.industry);

    return this.fetchFromAPI(`/companies?${params.toString()}`);
  }

  async getAllBatches() {
    return this.fetchFromAPI('/batches');
  }

  async getAllIndustries() {
    return this.fetchFromAPI('/industries');
  }
}

module.exports = YCombinatorAPIScraper;
