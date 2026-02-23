const YCombinatorScraper = require('./scraper');
const PDFGenerator = require('./pdfGenerator');
const fs = require('fs');
const readline = require('readline');

class YCombinatorScraperTool {
  constructor() {
    this.scraper = new YCombinatorScraper();
    this.pdfGenerator = new PDFGenerator();
    this.data = [];
  }

  async start() {
    console.log('=== Y Combinator Scraper Tool ===\n');
    
    const choice = await this.showMainMenu();
    
    switch (choice) {
      case '1':
        await this.scrapeByURL();
        break;
      case '2':
        await this.scrapeByFilters();
        break;
      case '3':
        await this.showSavedData();
        break;
      case '4':
        console.log('Goodbye!');
        process.exit(0);
      default:
        console.log('Invalid choice');
        process.exit(1);
    }
  }

  async showMainMenu() {
    console.log('Options:');
    console.log('1. Scrape by batch URL');
    console.log('2. Scrape with filters');
    console.log('3. View previously scraped data');
    console.log('4. Exit');
    
    return this.getUserInput('Choose an option (1-4): ');
  }

  async scrapeByURL() {
    const url = await this.getUserInput('Enter Y Combinator batch URL: ');
    
    if (!url.includes('ycombinator.com')) {
      console.log('Error: Please enter a valid Y Combinator URL');
      return;
    }
    
    console.log('\nScraping data...');
    this.data = await this.scraper.scrapeBatch(url);
    
    console.log(`Found ${this.data.length} startups\n`);
    
    if (this.data.length > 0) {
      await this.exportOptions();
    }
  }

  async scrapeByFilters() {
    console.log('\nFilter Options:');
    console.log('1. By Batch (e.g., W24, S23)');
    console.log('2. By Industry');
    console.log('3. By Year');
    console.log('4. Combine filters');
    
    const filterType = await this.getUserInput('Choose filter type (1-4): ');
    
    const filters = {};
    
    if (['1', '4'].includes(filterType)) {
      filters.batch = await this.getUserInput('Enter batch (e.g., W24, S23): ');
    }
    
    if (['2', '4'].includes(filterType)) {
      filters.industry = await this.getUserInput('Enter industry: ');
    }
    
    if (['3', '4'].includes(filterType)) {
      filters.year = await this.getUserInput('Enter year: ');
    }
    
    console.log('\nScraping data with filters...');
    this.data = await this.scraper.scrapeWithFilters(filters);
    
    console.log(`Found ${this.data.length} startups\n`);
    
    if (this.data.length > 0) {
      await this.exportOptions();
    }
  }

  async exportOptions() {
    console.log('Export Options:');
    console.log('1. Export to PDF');
    console.log('2. Export to JSON');
    console.log('3. Export to CSV');
    console.log('4. View data in console');
    
    const choice = await this.getUserInput('Choose export option (1-4): ');
    
    switch (choice) {
      case '1':
        await this.exportToPDF();
        break;
      case '2':
        await this.exportToJSON();
        break;
      case '3':
        await this.exportToCSV();
        break;
      case '4':
        this.viewInConsole();
        break;
    }
  }

  async exportToPDF() {
    const filename = await this.getUserInput('Enter filename (default: startups.pdf): ');
    const pdfFilename = filename || 'startups.pdf';
    
    console.log('Generating PDF...');
    const outputPath = await this.pdfGenerator.generatePDF(this.data, pdfFilename);
    console.log(`PDF saved to: ${outputPath}`);
  }

  async exportToJSON() {
    const filename = await this.getUserInput('Enter filename (default: startups.json): ');
    const jsonFilename = filename || 'startups.json';
    
    const outputPath = `./output/${jsonFilename}`;
    fs.writeFileSync(outputPath, JSON.stringify(this.data, null, 2));
    console.log(`JSON saved to: ${outputPath}`);
  }

  async exportToCSV() {
    const filename = await this.getUserInput('Enter filename (default: startups.csv): ');
    const csvFilename = filename || 'startups.csv';
    
    const headers = ['name', 'description', 'batch', 'industry', 'founders', 'website', 'scrapedAt'];
    const csvContent = [
      headers.join(','),
      ...this.data.map(row => headers.map(h => `"${(row[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const outputPath = `./output/${csvFilename}`;
    fs.writeFileSync(outputPath, csvContent);
    console.log(`CSV saved to: ${outputPath}`);
  }

  viewInConsole() {
    this.data.forEach((startup, index) => {
      console.log(`\n${index + 1}. ${startup.name}`);
      console.log(`   Batch: ${startup.batch}`);
      console.log(`   Industry: ${startup.industry}`);
      console.log(`   Description: ${startup.description?.substring(0, 100)}...`);
    });
  }

  async showSavedData() {
    const files = fs.readdirSync('./output').filter(f => f.endsWith('.json'));
    
    if (files.length === 0) {
      console.log('No saved data found');
      return;
    }
    
    console.log('Saved files:');
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
    
    const choice = await this.getUserInput('Choose a file to load (or press Enter to go back): ');
    
    if (choice && files[parseInt(choice) - 1]) {
      const data = fs.readFileSync(`./output/${files[parseInt(choice) - 1]}`, 'utf8');
      this.data = JSON.parse(data);
      console.log(`Loaded ${this.data.length} startups`);
      await this.exportOptions();
    }
  }

  async getUserInput(prompt) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise(resolve => {
      rl.question(prompt, answer => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  async quickScrape(url, outputFormat = 'pdf', filename = 'startups') {
    this.data = await this.scraper.scrapeBatch(url);
    
    switch (outputFormat) {
      case 'pdf':
        return await this.pdfGenerator.generatePDF(this.data, `${filename}.pdf`);
      case 'json':
        const jsonPath = `./output/${filename}.json`;
        fs.writeFileSync(jsonPath, JSON.stringify(this.data, null, 2));
        return jsonPath;
      case 'csv':
        return await this.exportToCSV();
      default:
        return this.data;
    }
  }
}

module.exports = YCombinatorScraperTool;
