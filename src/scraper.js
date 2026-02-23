const axios = require('axios');
const fs = require('fs');

class YCombinatorScraper {
  constructor(options = {}) {
    this.baseUrl = 'https://www.ycombinator.com';
    this.outputDir = options.outputDir || './output';
    this.ensureOutputDir();
    
    this.algoliaConfig = {
      indexName: 'YCCompany_production',
      appId: '45BWZJ1SGC',
      apiKey: 'MjBjYjRiMzY0NzdhZWY0NjExY2NhZjYxMGIxYjc2MTAwNWFkNTkwNTc4NjgxYjU0YzFhYTY2ZGQ5OGY5NDMxZnJlc3RyaWN0SW5kaWNlcz0lNUIlMjJZQ0NvbXBhbnlfcHJvZHVjdGlvbiUyMiUyQyUyMllDQ29tcGFueV9CeV9MYXVuY2hfRGF0ZV9wcm9kdWN0aW9uJTIyJTVEJnRhZ0ZpbHRlcnM9JTVCJTIyeWNkY19wdWJsaWMlMjIlNUQmYW5hbHl0aWNzVGFncz0lNUIlMjJ5Y2RjJTIyJTVE'
    };
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  formatBatchName(input) {
    if (!input) return null;
    
    const upper = input.toUpperCase().trim();
    
    const patterns = [
      { regex: /^(WINTER)\s*(\d{4})$/i, format: 'Winter $2' },
      { regex: /^(SUMMER)\s*(\d{4})$/i, format: 'Summer $2' },
      { regex: /^W(\d{2})$/i, format: 'Winter 20$1' },
      { regex: /^S(\d{2})$/i, format: 'Summer 20$1' },
    ];

    for (const { regex, format } of patterns) {
      if (regex.test(input)) {
        return input.replace(regex, format);
      }
    }
    
    return input;
  }

  async scrapeWithAlgolia(filters = {}) {
    const { indexName, appId, apiKey } = this.algoliaConfig;
    const url = `https://45bwzj1sgc-dsn.algolia.net/1/indexes/${indexName}/query`;
    
    const body = {
      hitsPerPage: 100,
      page: 0,
      attributesToRetrieve: ['name', 'slug', 'description', 'batch', 'industry', 'founders', 'website', 'launch_date'],
      attributesToHighlight: []
    };
    
    if (filters.query) {
      body.query = filters.query;
    }
    
    const filterParts = [];
    
    if (filters.batch) {
      const formattedBatch = this.formatBatchName(filters.batch);
      if (formattedBatch) {
        filterParts.push(`batch:"${formattedBatch}"`);
      }
    }
    
    if (filters.industry) {
      filterParts.push(`industry:"${filters.industry}"`);
    }
    
    if (filters.year) {
      filterParts.push(`launch_date_year:${filters.year}`);
    }
    
    if (filterParts.length > 0) {
      body.filters = filterParts.join(' AND ');
    }

    try {
      const response = await axios.post(url, body, {
        headers: {
          'X-Algolia-Application-Id': appId,
          'X-Algolia-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
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

      return companies;
      
    } catch (error) {
      console.error('Algolia error:', error.message);
      return [];
    }
  }

  async search(query) {
    return this.scrapeWithAlgolia({ query });
  }

  async scrapeBatchWithPages(batchName, maxPages = 1) {
    let allCompanies = [];
    let page = 0;
    const formattedBatch = this.formatBatchName(batchName);
    
    console.log(`Fetching ${formattedBatch} (up to ${maxPages} pages)`);
    
    while (page < maxPages) {
      const companies = await this.scrapePage(batchName, page);
      if (companies.length === 0) break;
      
      allCompanies = allCompanies.concat(companies);
      console.log(`  Page ${page + 1}: +${companies.length} companies (total: ${allCompanies.length})`);
      page++;
    }
    
    return allCompanies;
  }

  async scrapePage(batchName, pageNum = 0) {
    const { indexName, appId, apiKey } = this.algoliaConfig;
    const url = `https://45bwzj1sgc-dsn.algolia.net/1/indexes/${indexName}/query`;
    
    const formattedBatch = this.formatBatchName(batchName);
    
    const body = {
      hitsPerPage: 100,
      page: pageNum,
      attributesToRetrieve: ['name', 'slug', 'description', 'batch', 'industry', 'founders', 'website', 'launch_date'],
      attributesToHighlight: []
    };
    
    if (formattedBatch) {
      body.filters = `batch:"${formattedBatch}"`;
    }

    try {
      const response = await axios.post(url, body, {
        headers: {
          'X-Algolia-Application-Id': appId,
          'X-Algolia-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data.hits.map(hit => ({
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
      
    } catch (error) {
      console.error(`Page ${pageNum} error:`, error.message);
      return [];
    }
  }

  async scrapeAllPages(maxPages = 10) {
    let allCompanies = [];
    let page = 0;
    
    console.log('Fetching all companies...');
    
    while (page < maxPages) {
      const companies = await this.scrapeAnyPage(page);
      if (companies.length === 0) break;
      
      allCompanies = allCompanies.concat(companies);
      console.log(`  Page ${page + 1}: +${companies.length} companies (total: ${allCompanies.length})`);
      page++;
    }
    
    return allCompanies;
  }

  async scrapeAnyPage(pageNum = 0) {
    const { indexName, appId, apiKey } = this.algoliaConfig;
    const url = `https://45bwzj1sgc-dsn.algolia.net/1/indexes/${indexName}/query`;
    
    const body = {
      hitsPerPage: 100,
      page: pageNum,
      attributesToRetrieve: ['name', 'slug', 'description', 'batch', 'industry', 'founders', 'website', 'launch_date']
    };

    try {
      const response = await axios.post(url, body, {
        headers: {
          'X-Algolia-Application-Id': appId,
          'X-Algolia-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data.hits.map(hit => ({
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
      
    } catch (error) {
      console.error(`Page ${pageNum} error:`, error.message);
      return [];
    }
  }

  async scrapeAllBatches() {
    let allCompanies = [];
    let page = 0;
    let hasMore = true;
    
    const url = `https://45bwzj1sgc-dsn.algolia.net/1/indexes/${this.algoliaConfig.indexName}/query`;
    
    while (hasMore) {
      const body = {
        hitsPerPage: 100,
        page: page,
        attributesToRetrieve: ['name', 'slug', 'description', 'batch', 'industry', 'founders', 'website', 'launch_date']
      };

      try {
        const response = await axios.post(url, body, {
          headers: {
            'X-Algolia-Application-Id': this.algoliaConfig.appId,
            'X-Algolia-API-Key': this.algoliaConfig.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });

        const hits = response.data.hits;
        if (hits.length === 0) {
          hasMore = false;
        } else {
          allCompanies = allCompanies.concat(hits.map(hit => ({
            name: hit.name || '',
            slug: hit.slug || '',
            description: hit.description || '',
            batch: hit.batch || '',
            industry: hit.industry || '',
            founders: Array.isArray(hit.founders) ? hit.founders.join(', ') : (hit.founders || ''),
            website: hit.website || '',
            launchDate: hit.launch_date || '',
            scrapedAt: new Date().toISOString()
          })));
          page++;
          console.log(`Fetched page ${page}, total: ${allCompanies.length}`);
        }
      } catch (error) {
        console.error('Pagination error:', error.message);
        hasMore = false;
      }
    }
    
    return allCompanies;
  }

  async scrapeWithFilters(filters = {}) {
    return this.scrapeWithAlgolia(filters);
  }

  async scrapeBatch(batchName) {
    return this.scrapeWithAlgolia({ batch: batchName });
  }
}

module.exports = YCombinatorScraper;
