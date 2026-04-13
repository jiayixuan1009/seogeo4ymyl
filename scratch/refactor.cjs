const fs = require('fs');

const classMap = {
  'display:flex;justify-content:center;': 'flex justify-center',
  'display:flex;justify-content:space-between;': 'flex justify-between',
  'display:flex;justify-content:flex-end;': 'flex justify-end',
  'display:flex;align-items:center;': 'flex items-center',
  'display:grid;': 'grid',
  'font-size:var(--font-size-xs);': 'text-xs',
  'font-size:var(--font-size-sm);': 'text-sm',
  'font-size:var(--font-size-base);': 'text-base',
  'font-size:var(--font-size-lg);': 'text-lg',
  'font-size:10px;': 'text-[10px]',
  'font-size:11px;': 'text-[11px]',
  'font-size:12px;': 'text-xs',
  'font-size:13px;': 'text-[13px]',
  'font-weight:400;': 'font-normal',
  'font-weight:500;': 'font-medium',
  'font-weight:600;': 'font-semibold',
  'font-weight:700;': 'font-bold',
  'font-weight:800;': 'font-extrabold',
  'color:var(--text-muted);': 'text-muted',
  'color:var(--text-primary);': 'text-primary',
  'color:var(--text-secondary);': 'text-secondary',
  'color:var(--accent-green);': 'text-accent-green',
  'color:var(--accent-blue);': 'text-accent-blue',
  'color:var(--accent-red);': 'text-accent-red',
  'color:var(--accent-orange);': 'text-accent-orange',
  'margin-bottom:var(--space-1);': 'mb-1',
  'margin-bottom:var(--space-2);': 'mb-2',
  'margin-bottom:var(--space-3);': 'mb-3',
  'margin-bottom:var(--space-4);': 'mb-4',
  'margin-bottom:var(--space-5);': 'mb-5',
  'margin-bottom:var(--space-6);': 'mb-6',
  'margin-top:var(--space-1);': 'mt-1',
  'margin-top:var(--space-2);': 'mt-2',
  'margin-top:var(--space-3);': 'mt-3',
  'margin-top:var(--space-4);': 'mt-4',
  'margin:0;': 'm-0',
  'width:100%;': 'w-full',
  'flex-shrink:0;': 'shrink-0',
  'text-align:center;': 'text-center',
  'text-align:right;': 'text-right',
  'gap:var(--space-1);': 'gap-1',
  'gap:var(--space-2);': 'gap-2',
  'gap:var(--space-3);': 'gap-3',
  'gap:var(--space-4);': 'gap-4',
  'gap:var(--space-5);': 'gap-5',
  'gap:var(--space-6);': 'gap-6',
  'cursor:pointer;': 'cursor-pointer',
};

// Normalize key for whitespace and trailing semi
const normalizedMap = {};
for (const [key, val] of Object.entries(classMap)) {
  normalizedMap[key.replace(/\s+/g, '').replace(/;$/, '')] = val;
}

function refactorFile(path) {
  let content = fs.readFileSync(path, 'utf8');

  let replacements = 0;
  
  // Replace style="..." inside tags
  content = content.replace(/(<[a-zA-Z0-9-]+[^>]+?)style=(["'])(.*?)\2/gi, (match, prefix, quote, stylesText) => {
    let classesToAdd = [];
    let remainingStyles = [];
    
    // Naive split by ';'
    let parts = stylesText.split(';');
    // We have to be careful with things like URL(...) or rgb(...) if they have semicolons? CSS doesn't usually unless encoded
    // Just trim and ignore empties
    parts = parts.map(p => p.trim()).filter(Boolean);
    
    // First, try to match larger composite pairs from our original classMap first?
    // E.g. 'display:flex;align-items:center'
    // To keep it simple, we just check each part, and also check if we can group them
    let i = 0;
    while(i < parts.length) {
      // try to match 2 parts?
      if (i < parts.length - 1) {
        let comb = parts[i].replace(/\s+/g, '') + ';' + parts[i+1].replace(/\s+/g, '');
        if (normalizedMap[comb]) {
          classesToAdd.push(normalizedMap[comb]);
          i += 2;
          continue;
        }
      }
      
      let pNorm = parts[i].replace(/\s+/g, '');
      if (normalizedMap[pNorm]) {
        classesToAdd.push(normalizedMap[pNorm]);
      } else {
        remainingStyles.push(parts[i]);
      }
      i++;
    }
    
    if (classesToAdd.length === 0) {
      return match;
    }
    
    replacements++;
    
    // We need to inject these classes into the class="..." attribute if it exists, otherwise add it.
    let newClassStr = classesToAdd.join(' ');
    let result = prefix;
    
    // simple heuristic to find class= in prefix
    let classRegex = /class=(["'])(.*?)\1/i;
    let clsMatch = prefix.match(classRegex);
    if (clsMatch) {
      let existingClasses = clsMatch[2];
      result = prefix.replace(classRegex, `class="${existingClasses} ${newClassStr}"`);
    } else {
      // Append right before the end of the prefix 
      // check if ends with space, if not add one
      if (!result.endsWith(' ')) result += ' ';
      result += `class="${newClassStr}" `;
    }
    
    if (remainingStyles.length > 0) {
      result += `style="${remainingStyles.join('; ')}"`;
    } else {
      // remove trailing space if we just added one and there's no style
      result = result.trimEnd();
    }
    
    return result;
  });

  fs.writeFileSync(path, content, 'utf8');
  console.log(`Refactored ${replacements} inline styles in ${path}`);
}

['src/pages/site-results.js', 'src/pages/comparison-results.js'].forEach(refactorFile);
