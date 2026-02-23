const axios = require('axios');

class YCombinatorAlgoliaScraper {
  constructor() {
    this.baseUrl = 'https://45bwzj1sgc-dsn.algolia.net/1/indexes';
    this.apiKey = 'MjBjYjRiMzY0NzdhZWY0NjExY2NhZjYxMGIxYjc2MTAwNWFkNTkwNTc4NjgxYjU0YzFhYTY2ZGQ5OGY5NDMxZnJlc3RyaWN0SW5kaWNlcz0lNUIlMjJZQ0NvbXBhbnlfcHJvZHVjdGlvbiUyMiUyQyUyMllDQ29tcGFueV9CeV9MYXVuY2hfRGF0ZV9wcm9kdWN0aW9uJTIyJTVEJnRhZ0ZpbHRlcnM9JTVCJTIyeWNkY19wdWJsaWMlMjIlNUQmYW5hbHl0aWNzVGFncz0lNUIlMjJ5Y2RjJTIyJTVE';
    this.applicationId = '45BWZJ1SGC';
    
    this.headers = {
      'X-Algolia-API-Key-Expores-After': '2025-02-01',
      'X-Algolia-Application-Id': this.applicationId,
      'X-Algolia-API-Key': 'MjBjYjRiMzY0NzdhZWY0NjExY2NhZjYxMGIxYjc2MTAwNWFkNTkwNTc4NjgxYjU0YzFhYTY2ZGQ5OGY5NDMxZnJlc3RyaWN0SW5kaWNlcz0lNUIlMjJZQ0NvbXBhbnlfcHJvZHVjdGlvbiUyMiUyQyUyMllDQ29tcGFueV9ByV9MYXVuY2hfRGF0ZV9wcm9kdWN0aW9uJTIyJTVEJnRhZ0ZpbHRlcnM9JTVCJTIyeWNkY19wdWJsaWMlMjIlNUQmYW5hbHl0aWNzVGFncz0lNUIlMjJ5Y2RjJTIyJTVE'
    };
  }

  async searchCompanies(query = '', filters = {}) {
    const indexName = 'YCCompany_production';
    const url = `${this.baseUrl}/${indexName}/query`;
    
    const searchParams = {
      hitsPerPage: 100,
      page: 0,
      attributesToRetrieve: [
        'name',
        'slug',
        'description',
        'batch',
        'industry',
        'founders',
        'website',
        'launch_date',
        'YCCompany_By_Launch_Date_production'
      ],
      attributesToHighlight: []
    };
    
    if (query) {
      searchParams.query = query;
    }
    
    if (filters.batch) {
      searchParams.filters = `batch:${filters.batch}`;
    }
    
    if (filters.industry) {
      const filterStr = searchParams.filters ? `${searchParams.filters} AND ` : '';
      searchParams.filters = `${filterStr}industry:${filters.industry}`;
    }
    
    if (filters.year) {
      const filterStr = searchParams.filters ? `${searchParams.filters} AND ` : '';
      searchParams.filters = `${filterStr}launch_date_year:${filters.year}`;
    }

    try {
      console.log('Searching Algolia...');
      const response = await axios.post(url, searchParams, {
        headers: this.headers,
        timeout: 30000
      });

      const companies = response.data.hits.map(hit => ({
        name: hit.name || '',
        slug: hit.slug || '',
        description: hit.description || '',
        batch: hit.batch || '',
        industry: hit.industry || '',
        founders: Array.isArray(hit.founders) ? hit.founders.join(', ') : (hit.founders || ''),
        website: hit.website || '',
        launchDate: hit.launch_date || '',
        scrapedAt: new Date().toISOString()
      }));

      console.log(`Found ${companies.length} companies`);
      return companies;
      
    } catch (error) {
      console.error('Algolia search error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2).substring(0, 500));
      }
      return [];
    }
  }

  async getAllCompanies() {
    let allCompanies = [];
    let page = 0;
    let hasMore = true;
    
    while (hasMore) {
      const companies = await this.searchCompanies('', { page });
      if (companies.length === 0) {
        hasMore = false;
      } else {
        allCompanies = allCompanies.concat(companies);
        page++;
        console.log(`Fetched page ${page}, total: ${allCompanies.length}`);
      }
    }
    
    return allCompanies;
  }

  async getCompaniesByBatch(batch) {
    return this.searchCompanies('', { batch });
  }

  async getCompaniesByIndustry(industry) {
    return this.searchCompanies('', { industry });
  }
}

module.exports = YCombinatorAlgoliaScraper;
