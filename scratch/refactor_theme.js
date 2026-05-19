const fs = require('fs');
const path = require('path');

const directories = [
  'c:/Users/MRUNAL/OneDrive/Desktop/certificate verfication system/frontend/src/pages',
  'c:/Users/MRUNAL/OneDrive/Desktop/certificate verfication system/frontend/src/components'
];

const replacements = {
  // Text colors
  'text-white': 'text-slate-900 dark:text-white',
  'text-slate-100': 'text-slate-900 dark:text-slate-100',
  'text-slate-200': 'text-slate-800 dark:text-slate-200',
  'text-slate-300': 'text-slate-700 dark:text-slate-300',
  'text-slate-400': 'text-slate-600 dark:text-slate-400',
  'text-slate-500': 'text-slate-500 dark:text-slate-500',
  
  // Backgrounds
  'bg-slate-900/50': 'bg-white/80 dark:bg-slate-900/50',
  'bg-slate-900/10': 'bg-black/5 dark:bg-slate-900/10',
  'bg-slate-800': 'bg-slate-100 dark:bg-slate-800',
  'bg-white/[0.01]': 'bg-black/[0.02] dark:bg-white/[0.01]',
  'bg-white/[0.02]': 'bg-black/[0.03] dark:bg-white/[0.02]',
  'bg-black/[0.03]': 'bg-black/5 dark:bg-black/[0.03]', // For navbar wallet button
  
  // Borders
  'border-slate-700/60': 'border-slate-200 dark:border-slate-700/60',
  'border-slate-700': 'border-slate-300 dark:border-slate-700',
  'border-slate-500/50': 'border-slate-300 dark:border-slate-500/50',
  'border-white/[0.06]': 'border-black/5 dark:border-white/[0.06]',
  'border-white/[0.05]': 'border-black/5 dark:border-white/[0.05]',
  'border-white/[0.04]': 'border-black/5 dark:border-white/[0.04]',
  'border-white/[0.08]': 'border-black/10 dark:border-white/[0.08]',
  'border-white/5': 'border-black/5 dark:border-white/5',
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      // We must avoid double replacing. 
      // If a class already has 'dark:', we skip it for that specific string.
      // But standard replace loop is tricky. We can use a regex that negative lookbehinds for "dark:" or " " + the string.
      
      for (const [search, replace] of Object.entries(replacements)) {
        // Regex: match the `search` string, only if it's NOT preceded by "dark:"
        // and it's surrounded by word boundaries or quotes/spaces.
        // Actually, negative lookbehind for 'dark:' is: (?<!dark:)
        const regexStr = `(?<!dark:)${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`;
        const regex = new RegExp(regexStr, 'g');
        
        if (regex.test(content)) {
          content = content.replace(regex, replace);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${file}`);
      }
    }
  }
}

directories.forEach(processDirectory);
console.log('Done component replacements!');
