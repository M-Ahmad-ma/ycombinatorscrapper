const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
  constructor(outputPath = './output') {
    this.outputPath = outputPath;
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }
  }

  async generatePDF(startups, filename = 'startups.pdf') {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const outputPath = path.join(this.outputPath, filename);
      
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);
      
      doc.fontSize(24).font('Helvetica-Bold').text('Y Combinator Startups Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()} | Total: ${startups.length} companies`, { align: 'center' });
      doc.moveDown(2);
      
      startups.forEach((startup, index) => {
        if (index > 0) doc.addPage();
        
        // Header
        doc.fontSize(18).font('Helvetica-Bold').text(startup.name || 'Unknown', { align: 'left' });
        doc.moveDown(0.5);
        
        doc.fontSize(10).font('Helvetica');
        
        // Basic info row
        const infoParts = [];
        if (startup.batch) infoParts.push(`Batch: ${startup.batch}`);
        if (startup.industry) infoParts.push(`Industry: ${startup.industry}`);
        if (startup.details?.basic?.status) infoParts.push(`Status: ${startup.details.basic.status}`);
        
        if (infoParts.length > 0) {
          doc.fontSize(10).fillColor('#666').text(infoParts.join('  |  '));
          doc.fillColor('black');
          doc.moveDown(0.5);
        }
        
        // Website
        if (startup.website || startup.details?.basic?.website) {
          const website = startup.website || startup.details.basic.website;
          doc.fontSize(10).fillColor('blue').text(website, { link: website });
          doc.fillColor('black');
          doc.moveDown(0.5);
        }
        
        // Detailed description
        const description = startup.description || startup.details?.basic?.description || startup.details?.description || '';
        if (description) {
          doc.moveDown(0.5);
          doc.fontSize(11).font('Helvetica-Bold').text('Description:');
          doc.fontSize(10).font('Helvetica');
          
          const maxWidth = 500;
          const words = description.split(' ');
          let line = '';
          
          for (const word of words) {
            const testLine = line + (line ? ' ' : '') + word;
            if (doc.widthOfString(testLine) > maxWidth) {
              doc.text(line);
              line = word;
            } else {
              line = testLine;
            }
          }
          if (line) doc.text(line);
          doc.moveDown(0.5);
        }
        
        // Detailed info section
        if (startup.details) {
          doc.moveDown(0.5);
          doc.fontSize(11).font('Helvetica-Bold').text('Details:', { underline: true });
          doc.moveDown(0.3);
          doc.fontSize(10).font('Helvetica');
          
          // Founders
          const founders = startup.details.founders || [];
          if (founders.length > 0) {
            doc.text(`Founders (${founders.length}):`);
            founders.forEach((f, i) => {
              const name = typeof f === 'string' ? f : f.name;
              doc.text(`  ${i + 1}. ${name}`);
            });
            doc.moveDown(0.3);
          }
          
          // Jobs/Hiring
          const jobs = startup.details.jobs || [];
          if (jobs.length > 0) {
            jobs.forEach(job => {
              if (job.openRoles) {
                doc.text(`Hiring: ${job.openRoles} open role(s)`);
              }
              if (job.count) {
                doc.text(`Jobs: ${job.count}`);
              }
            });
            doc.moveDown(0.3);
          }
          
          // Links
          const links = startup.details.links || {};
          const linkKeys = Object.keys(links);
          if (linkKeys.length > 0) {
            doc.text('Links:');
            linkKeys.forEach(key => {
              doc.text(`  ${key}: ${links[key]}`);
            });
            doc.moveDown(0.3);
          }
          
          // Tags
          const tags = startup.details.tags || [];
          if (tags.length > 0) {
            doc.text(`Tags: ${tags.join(', ')}`);
            doc.moveDown(0.3);
          }
        }
        
        // Footer
        doc.moveDown(1);
        doc.fontSize(8).fillColor('gray');
        doc.text(`Scraped: ${new Date(startup.scrapedAt || Date.now()).toLocaleString()}`, { align: 'left' });
        doc.fillColor('black');
      });
      
      doc.end();
      
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    });
  }

  async generateDetailedPDF(startups, filename = 'detailed-report.pdf') {
    return this.generatePDF(startups, filename);
  }

  async generateBatchPDF(companies, filename) {
    return this.generatePDF(companies, filename);
  }
}

module.exports = PDFGenerator;
