const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

class PuppeteerScraper {
  constructor() {
    this.baseUrl = 'https://www.ycombinator.com';
    this.browser = null;
  }

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-software-rasterizer',
          '--disable-background-networking',
          '--disable-sync',
          '--disable-translate',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-first-run',
          '--safebrowsing-disable-auto-update'
        ]
      });
    }
    return this.browser;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeCompanyDetails(slug) {
    const browser = await this.init();
    const page = await browser.newPage();
    
    const url = `${this.baseUrl}/companies/${slug}`;
    console.log(`  🌐 Opening: ${url}`);
    
    try {
      await page.setDefaultTimeout(60000);
      await page.setDefaultNavigationTimeout(60000);
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });
      
      await page.waitForSelector('body', { timeout: 30000 });

      const details = await page.evaluate(() => {
        const data = {
          slug: '',
          name: '',
          description: '',
          fullDescription: '',
          batch: '',
          status: '',
          founded: '',
          headquarters: '',
          website: '',
          industry: '',
          founders: [],
          jobs: [],
          links: {},
          tags: [],
          metrics: {},
          scrapedAt: new Date().toISOString()
        };

        data.slug = window.location.pathname.split('/companies/')[1] || '';
        
        const h1 = document.querySelector('h1');
        data.name = h1?.textContent?.trim() || '';
        
        const metaDesc = document.querySelector('meta[name="description"]');
        data.description = metaDesc?.getAttribute('content') || '';
        
        const text = document.body.textContent || '';
        
        const batchMatch = text.match(/(Winter|Summer|Spring|Fall)\s+\d{4}/);
        if (batchMatch) data.batch = batchMatch[0];
        
        const statusPatterns = [
          /(Active|Operating|Shut Down|Acquired|IPO|Inactive)/i,
          /Status[:\s]*([A-Za-z]+)/i
        ];
        for (const pattern of statusPatterns) {
          const match = text.match(pattern);
          if (match) {
            data.status = match[1] || match[0];
            break;
          }
        }
        
        const foundedMatch = text.match(/Founded[:\s]*([A-Za-z0-9,\s]+)/i);
        if (foundedMatch) data.founded = foundedMatch[1].trim();
        
        const hqMatch = text.match(/Headquarters[:\s]*([A-Za-z0-9,\s]+)/i);
        if (hqMatch) data.headquarters = hqMatch[1].trim();
        
        const websiteMatch = text.match(/https?:\/\/[^\s<>"']+/);
        if (websiteMatch) {
          data.website = websiteMatch[0].split(/[\s\n]/)[0];
        }
        
        const industryMatch = text.match(/Industries?[:\s]*([^\n]+)/i);
        if (industryMatch) {
          data.industry = industryMatch[1].trim();
          data.tags = industryMatch[1].split(/,/).map(t => t.trim()).filter(t => t.length > 0).slice(0, 5);
        }
        
        const jobsMatch = text.match(/(\d+)\s*open\s*roles?/i);
        if (jobsMatch) {
          data.jobs = [{ type: 'open_roles', count: parseInt(jobsMatch[1]) }];
        }
        
        document.querySelectorAll('a[href]').forEach(a => {
          const href = a.getAttribute('href') || '';
          
          if (href.includes('twitter.com') || href.includes('x.com')) data.links.twitter = href;
          if (href.includes('linkedin.com')) data.links.linkedin = href;
          if (href.includes('github.com')) data.links.github = href;
          if (href.includes('crunchbase.com')) data.links.crunchbase = href;
        });

        return data;
      });

      await page.close();
      return details;
      
    } catch (error) {
      console.error(`  ❌ Error scraping ${slug}:`, error.message);
      await page.close().catch(() => {});
      return null;
    }
  }

  async scrapeCompanyFullDetails(slug) {
    const browser = await this.init();
    const page = await browser.newPage();
    
    const url = `${this.baseUrl}/companies/${slug}`;
    console.log(`  🌐 Opening: ${url}`);
    
    try {
      await page.setDefaultTimeout(60000);
      await page.setDefaultNavigationTimeout(60000);
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });
      
      await page.waitForSelector('body', { timeout: 30000 });

      const html = await page.content();
      const $ = cheerio.load(html);

      const details = {
        basic: {
          slug: slug,
          name: '',
          description: '',
          batch: '',
          status: '',
          founded: '',
          headquarters: '',
          website: '',
          industry: ''
        },
        fullDescription: '',
        founders: [],
        jobs: [],
        links: {},
        tags: [],
        team: [],
        scrapedAt: new Date().toISOString()
      };

      const h1 = $('h1').first();
      details.basic.name = h1.text().trim() || slug;
      
      let metaDesc = $('meta[name="description"]').attr('content') || '';
      metaDesc = metaDesc.replace(/[…]/g, '...').replace(/\.{3,}/g, '...');
      details.basic.description = metaDesc;
      
      let bodyText = $('body').text();
      bodyText = bodyText.replace(/[…]/g, '...').replace(/\.{3,}/g, '...');
      const text = bodyText.replace(/\s+/g, ' ').trim();
      
      const batchMatch = text.match(/(Winter|Summer|Spring|Fall)\s+\d{4}/);
      if (batchMatch) details.basic.batch = batchMatch[0];
      
      const statusMatch = text.match(/(Active|Operating|Shut Down|Acquired|IPO|Inactive)/i);
      if (statusMatch) details.basic.status = statusMatch[1];
      
      const foundedMatch = text.match(/Founded[:\s]*([A-Za-z0-9,\s]+)/i);
      if (foundedMatch) details.basic.founded = foundedMatch[1].trim();
      
      const hqMatch = text.match(/Headquarters[:\s]*([A-Za-z0-9,\s]+)/i);
      if (hqMatch) details.basic.headquarters = hqMatch[1].trim();
      
      const websiteMatch = metaDesc.match(/https?:\/\/[^\s,]+/);
      if (websiteMatch) {
        details.basic.website = websiteMatch[0].replace(/[.,;]$/, '');
      }
      
      const industryMatch = text.match(/Industries?[:\s]*([^\n]+)/i);
      if (industryMatch) {
        details.basic.industry = industryMatch[1].trim().split(',')[0];
        details.tags = industryMatch[1].split(',').map(t => t.trim()).filter(t => t.length > 0);
      }

      $('a[href]').each((i, el) => {
        const href = $(el).attr('href') || '';
        
        if (href.includes('twitter.com') || href.includes('x.com')) details.links.twitter = href;
        if (href.includes('linkedin.com')) details.links.linkedin = href;
        if (href.includes('github.com')) details.links.github = href;
        if (href.includes('crunchbase.com')) details.links.crunchbase = href;
      });

      const jobsMatch = text.match(/(\d+)\s*open\s*roles?/i);
      if (jobsMatch) {
        details.jobs = [{ type: 'open_roles', count: parseInt(jobsMatch[1]) }];
      }

      const founderDescMatch = metaDesc.match(/Founded\s+(?:in\s+)?\d{4}\s+by\s+([^.]+?)(?:\s+has|\s+headquartered|\s+is\s+based)/i);
      if (founderDescMatch) {
        const founderPart = founderDescMatch[1];
        const cleanPart = founderPart.replace(/,\s*$/, '');
        const companyNameLower = details.basic.name.toLowerCase();
        details.founders = cleanPart.split(/,| and /).map(f => f.trim()).filter(f => {
          const fLower = f.toLowerCase();
          return f.length > 1 && f.length < 50 && !fLower.includes(companyNameLower) && !fLower.includes('employees');
        }).map(f => ({
          name: f,
          position: '',
          linkedin: ''
        }));
      }

      await page.close();
      return details;
      
    } catch (error) {
      console.error(`  ❌ Error scraping ${slug}:`, error.message);
      await page.close().catch(() => {});
      return null;
    }
  }

  async scrapeMultipleCompanies(companies, options = {}) {
    const limit = options.limit || companies.length;
    const maxConcurrent = options.concurrent || 2;
    const delay = options.delay || 2000;
    
    const companiesToScrape = companies.slice(0, limit);
    console.log(`\n🔍 Scraping ${companiesToScrape.length} companies in detail...`);
    
    const results = [];
    const chunks = this.chunkArray(companiesToScrape, maxConcurrent);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`  📦 Batch ${i + 1}/${chunks.length} (${chunk.length} companies)`);
      
      const promises = chunk.map(async (company) => {
        const details = await this.scrapeCompanyFullDetailsWithRetry(company.slug, 3);
        return {
          ...company,
          details: details,
          scrapedAt: new Date().toISOString()
        };
      });
      
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
      
      if (i < chunks.length - 1) {
        console.log(`  ⏳ Waiting ${delay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  }

  async scrapeCompanyFullDetailsWithRetry(slug, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const details = await this.scrapeCompanyFullDetails(slug);
        if (details) {
          return details;
        }
      } catch (error) {
        console.error(`  ⚠️  Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
        if (attempt < maxRetries) {
          const waitTime = attempt * 3000;
          console.log(`  ⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    console.error(`  ❌ Failed after ${maxRetries} attempts`);
    return null;
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = PuppeteerScraper;
