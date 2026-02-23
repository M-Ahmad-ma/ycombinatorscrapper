# Y Combinator Scraper

A Node.js tool to scrape startup data from Y Combinator with detailed Puppeteer support.

## Features
- ✅ **Batch scraping** - Get all companies from any YC batch (W26, S23, etc.)
- ✅ **Keyword search** - Search companies by name, industry, or description
- ✅ **Limited detailed scraping** - Get full details for a specific number of companies
- ✅ **Puppeteer integration** - Extract detailed info (founders, status, jobs, links)
- ✅ **Multiple formats** - Export to PDF, JSON, CSV
- ✅ **Pagination** - Scrape multiple pages from Algolia

## Installation

```bash
npm install
```

## Usage

### Quick Start
```bash
# Get 30 companies from W26 batch with full details
node cli.js batch W26 pdf --limit=30 --detail

# Search AI companies and get details
node cli.js search AI json --limit=20 --detail
```

### Commands

| Command | Description |
|---------|-------------|
| `batch <name>` | Scrape a specific YC batch |
| `search <query>` | Search companies by keyword |
| `company <name>` | Get detailed info on one company |
| `all` | Scrape all companies |

### Options

| Option | Description |
|--------|-------------|
| `--limit=<n>` | Number of companies to get full details (Puppeteer) |
| `--pages=<n>` | Pages from Algolia (default: 1, max: 100/page) |
| `--output=<name>` | Output filename |
| `--detail` | Get full details using Puppeteer |
| `--batch=<name>` | Filter by batch |
| `--industry=<name>` | Filter by industry |

### Examples

```bash
# Batch scraping with details
node cli.js batch W26 pdf --limit=30 --detail
node cli.js batch W24 json --limit=50 --output=w24-detailed

# Search with details
node cli.js search fintech json --limit=20 --detail
node cli.js search AI pdf --limit=10 --output=ai-companies

# Single company full details
node cli.js company Stripe pdf --detail
node cli.js company Airbnb json --detail

# Multiple pages
node cli.js batch W26 pdf --pages=3 --limit=100

# Quick scrape (no details)
node cli.js batch W26 pdf
node cli.js search fintech json
```

## Output Files

When you run the scraper, you get:

```
output/
├── {filename}.pdf              # PDF report
├── {filename}.json            # Full JSON data
├── {filename}-detailed.json   # Only companies with Puppeteer details
└── {filename}.csv             # CSV spreadsheet
```

## Detailed Data Fields

### Algolia Data (all companies)
- `name` - Company name
- `slug` - URL slug
- `description` - Short description
- `batch` - YC batch (e.g., "Winter 2026")
- `industry` - Industry category
- `founders` - Founder names
- `website` - Company website
- `launchDate` - Launch date

### Puppeteer Details (--limit companies)
- **Description** - Full company description with founder names
- **Status** - Active, Operating, Acquired, etc.
- **Founded** - Founded date
- **Jobs** - Number of open roles / hiring status
- **Founders** - List of founder names
- **Links** - Twitter, LinkedIn, GitHub, Crunchbase
- **Tags** - Industry tags

## Programmatic Usage

```javascript
const YCombinatorScraper = require('./src/scraper');
const PuppeteerScraper = require('./src/puppeteerScraper');
const PDFGenerator = require('./src/pdfGenerator');

async function scrape() {
  const algolia = new YCombinatorScraper();
  const puppeteer = new PuppeteerScraper();
  const pdf = new PDFGenerator();

  // Get companies from batch
  const companies = await algolia.scrapeBatchWithPages('W26', 1);
  
  // Get full details for first 10
  const detailed = await puppeteer.scrapeMultipleCompanies(companies, {
    limit: 10,
    concurrent: 3
  });

  // Generate PDF
  await pdf.generatePDF(detailed, 'w26-detailed.pdf');
}

scrape();
```

## Batch Format
The scraper accepts multiple formats:
- `W26` → Winter 2026
- `S23` → Summer 2023
- `Winter 2024` → Winter 2024
- `2024` → 2024

## Notes
- Algolia returns 100 results per page
- Puppeteer has rate limiting (use --limit for details)
- Use --pages to get more companies from Algolia first
- Detailed scraping is slower but more complete
# ycombinatorscrapper
