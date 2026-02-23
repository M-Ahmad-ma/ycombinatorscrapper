const YCombinatorScraper = require('./src/scraper');
const PuppeteerScraper = require('./src/puppeteerScraper');
const PDFGenerator = require('./src/pdfGenerator');
const fs = require('fs');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║          Y Combinator Scraper - Help                           ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Usage: node cli.js <command> [format] [options]            ║
║                                                              ║
║  COMMANDS:                                                    ║
║    batch <batch>         Scrape a specific YC batch         ║
║    search <query>        Search companies by keyword         ║
║    company <name>        Get detailed info on a company      ║
║    all                   Scrape all companies                 ║
║                                                              ║
║  FORMATS: pdf (default), json, csv                           ║
║                                                              ║
║  OPTIONS:                                                      ║
║    --output=<name>        Output filename                     ║
║    --limit=<n>            Number of companies to get         ║
║    --pages=<n>            Pages from Algolia (default: 1)    ║
║    --detail                Get full details (Puppeteer)       ║
║    --batch=<name>         Filter by batch                    ║
║    --industry=<name>      Filter by industry                  ║
║                                                              ║
║  EXAMPLES:                                                    ║
║    # Batch scraping with limited detailed results             ║
║    node cli.js batch W26 pdf --limit=30 --detail             ║
║    node cli.js batch W24 json --limit=50 --output=w24-detailed║
║                                                              ║
║    # Search with details                                      ║
║    node cli.js search AI json --limit=20 --detail             ║
║                                                              ║
║    # Single company full details                              ║
║    node cli.js company Stripe pdf --detail                     ║
║                                                              ║
║    # Multiple pages                                           ║
║    node cli.js batch W26 pdf --pages=3 --limit=100           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);
    return;
  }

  const command = args[0].toLowerCase();
  
  let format = 'pdf';
  let filename = 'startups';
  let filters = {};
  let pagesToScrape = 1;
  let detailLimit = 0;
  let getDetails = false;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === 'pdf' || arg === 'json' || arg === 'csv') {
      format = arg.toLowerCase();
    } else if (arg.startsWith('--output=')) {
      filename = arg.split('=')[1];
    } else if (arg.startsWith('--limit=')) {
      detailLimit = parseInt(arg.split('=')[1]) || 0;
    } else if (arg.startsWith('--pages=')) {
      pagesToScrape = parseInt(arg.split('=')[1]) || 1;
    } else if (arg.startsWith('--batch=')) {
      filters.batch = arg.split('=')[1];
    } else if (arg.startsWith('--industry=')) {
      filters.industry = arg.split('=')[1];
    } else if (arg.startsWith('--query=')) {
      filters.query = arg.split('=')[1];
    } else if (arg === '--detail') {
      getDetails = true;
    } else if (!arg.startsWith('--') && command === 'batch') {
      filters.batch = arg;
    } else if (!arg.startsWith('--') && command === 'search') {
      filters.query = arg;
    } else if (!arg.startsWith('--') && command === 'company') {
      filters.query = arg;
    }
  }

  const scraper = new YCombinatorScraper({ outputDir: './output' });
  const puppeteerScraper = new PuppeteerScraper();
  const pdfGenerator = new PDFGenerator('./output');

  console.log('\n🚀 Y Combinator Scraper\n');

  try {
    let defaultFilename = 'startups';
    let algoliaCompanies = [];
    
    switch (command) {
      case 'batch':
        console.log(`📦 Fetching batch: ${filters.batch || args[1]}`);
        if (!filters.batch) filters.batch = args[1];
        algoliaCompanies = await scraper.scrapeBatchWithPages(filters.batch, pagesToScrape);
        defaultFilename = (filters.batch || 'batch').toLowerCase();
        break;

      case 'search':
        console.log(`🔍 Searching: ${filters.query || args[1]}`);
        if (!filters.query) filters.query = args[1];
        algoliaCompanies = await scraper.search(filters.query);
        defaultFilename = (filters.query || 'search').toLowerCase().replace(/\s+/g, '-');
        break;

      case 'company':
        console.log(`🏢 Getting company: ${args[1]}`);
        const companyData = await scraper.search(args[1]);
        if (companyData.length > 0) {
          algoliaCompanies = [companyData[0]];
        }
        defaultFilename = (args[1] || 'company').toLowerCase().replace(/\s+/g, '-');
        break;

      case 'url':
        console.log(`🌐 Scraping from Algolia...`);
        algoliaCompanies = await scraper.scrapeWithFilters({});
        defaultFilename = 'url-scrape';
        break;

      case 'all':
        console.log(`📚 Fetching all companies (${pagesToScrape} pages)...`);
        algoliaCompanies = await scraper.scrapeAllPages(pagesToScrape);
        defaultFilename = 'all-companies';
        break;

      default:
        console.log(`Unknown command: ${command}`);
        console.log('Use --help for usage information');
        return;
    }

    if (filename === 'startups') {
      filename = defaultFilename;
    }

    console.log(`\n✅ Found ${algoliaCompanies.length} companies from Algolia\n`);

    if (algoliaCompanies.length === 0) {
      console.log('No companies found.');
      return;
    }

    // Show summary
    console.log('First 5 companies:');
    algoliaCompanies.slice(0, 5).forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} (${c.batch}) - ${c.industry}`);
    });

    let companies = algoliaCompanies;

    // Get detailed info for limited companies
    if (getDetails && detailLimit > 0) {
      console.log(`\n🔍 Getting FULL details for ${detailLimit} companies using Puppeteer...`);
      companies = await puppeteerScraper.scrapeMultipleCompanies(algoliaCompanies, {
        limit: detailLimit,
        concurrent: 3,
        delay: 1500
      });
      
      console.log(`\n✅ Got detailed info for ${companies.filter(c => c.details).length} companies`);
    } else if (getDetails && command === 'company') {
      console.log(`\n🔍 Getting FULL details using Puppeteer...`);
      const details = await puppeteerScraper.scrapeCompanyFullDetails(algoliaCompanies[0]?.slug);
      if (details) {
        algoliaCompanies[0].details = details;
        companies = algoliaCompanies;
      }
    }

    console.log(`\n💾 Saving ${companies.length} companies as ${format.toUpperCase()}...`);

    switch (format) {
      case 'pdf':
        const pdfPath = await pdfGenerator.generatePDF(companies, `${filename}.pdf`);
        console.log(`📄 PDF saved: ${pdfPath}`);
        break;
        
      case 'json':
        const jsonPath = `./output/${filename}.json`;
        fs.writeFileSync(jsonPath, JSON.stringify(companies, null, 2));
        console.log(`📋 JSON saved: ${jsonPath}`);
        break;
        
      case 'csv':
        const headers = ['name', 'description', 'batch', 'industry', 'founders', 'website', 'launchDate'];
        const csvContent = [
          headers.join(','),
          ...companies.map(row => headers.map(h => {
            let val = '';
            if (h === 'founders') {
              val = Array.isArray(row.details?.founders) 
                ? row.details.founders.map(f => f.name).join('; ')
                : (row[h] || '');
            } else {
              val = row[h] || '';
            }
            return `"${val.replace(/"/g, '""')}"`;
          }).join(','))
        ].join('\n');
        const csvPath = `./output/${filename}.csv`;
        fs.writeFileSync(csvPath, csvContent);
        console.log(`📊 CSV saved: ${csvPath}`);
        break;
    }

    // Always save detailed JSON when --detail is used
    if (getDetails || detailLimit > 0) {
      const detailedCompanies = companies.filter(c => c.details);
      if (detailedCompanies.length > 0) {
        const detailPath = `./output/${filename}-detailed.json`;
        fs.writeFileSync(detailPath, JSON.stringify(detailedCompanies, null, 2));
        console.log(`🔍 Detailed info saved: ${detailPath}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log('\n✨ Done!\n');
}

main().catch(console.error);
