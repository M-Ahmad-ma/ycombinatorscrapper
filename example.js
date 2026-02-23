const YCombinatorScraperTool = require('./index');

async function main() {
  const tool = new YCombinatorScraperTool();
  
  await tool.start();
}

main().catch(console.error);
