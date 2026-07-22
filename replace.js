const fs = require('fs');
const files = [
  '/Users/davideoliveirabarbosa/Downloads/Relatorio-Sao-Luiz-main/src/components/report/PresentationReport.jsx',
  '/Users/davideoliveirabarbosa/Downloads/Relatorio-Sao-Luiz-main/src/components/MonthlyReportTab.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.0[23]\s*\)/g, 'var(--theme-card-bg)');
  content = content.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.05\s*\)/g, 'var(--theme-grid-line)');
  content = content.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.[12]\s*\)/g, 'var(--theme-border)');
  content = content.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.[45]\s*\)/g, 'var(--theme-axis-text)');
  content = content.replace(/color:\s*['"]#aaaaaa['"]/g, "color: 'var(--theme-text-muted)'");
  content = content.replace(/color:\s*['"]#888['"]/g, "color: 'var(--theme-text-muted)'");
  fs.writeFileSync(file, content);
});
console.log('Replaced successfully');
