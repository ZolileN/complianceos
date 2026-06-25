const fs = require('fs');
const path = require('path');

const srcAppDir = path.join(__dirname, '../src/app');
const libDir = path.join(__dirname, '../src/lib');

function findFiles(dir, ext) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(file, ext));
    } else if (file.endsWith(ext)) {
      results.push(file);
    }
  });
  return results;
}

let files = [];
if (fs.existsSync(srcAppDir)) files = files.concat(findFiles(srcAppDir, '.ts')).concat(findFiles(srcAppDir, '.tsx'));
if (fs.existsSync(libDir)) files = files.concat(findFiles(libDir, '.ts'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. user?.tenantSlug !== 'praxisone'
  content = content.replace(/user\?\.tenantSlug !== 'praxisone'/g, "!['praxisone', 'mlk-computer-consulting'].includes(user?.tenantSlug as string)");
  
  // 2. user.tenantSlug !== 'praxisone'
  content = content.replace(/user\.tenantSlug !== 'praxisone'/g, "!['praxisone', 'mlk-computer-consulting'].includes(user.tenantSlug as string)");

  // 3. tenantSlug !== 'praxisone' (specific to admin/tenants/[id]/route.ts)
  if (file.includes('admin/tenants/[id]/route.ts')) {
     content = content.replace(/tenantSlug !== 'praxisone'/g, "!['praxisone', 'mlk-computer-consulting'].includes(tenantSlug as string)");
  }

  // 4. adminUser?.tenantSlug !== 'praxisone'
  content = content.replace(/adminUser\?\.tenantSlug !== 'praxisone'/g, "!['praxisone', 'mlk-computer-consulting'].includes(adminUser?.tenantSlug as string)");

  // 5. user?.tenantSlug === 'praxisone' || user?.email?.endsWith('@praxisone.com')
  content = content.replace(/user\?\.tenantSlug === 'praxisone' \|\| user\?\.email\?\.endsWith\('@praxisone\.com'\)/g, 
    "(['praxisone', 'mlk-computer-consulting'].includes(user?.tenantSlug as string) || ['@praxisone.com', '@mlkcomputer.com'].some(d => user?.email?.endsWith(d)))");

  // 6. user.tenantSlug === 'praxisone' || user.email?.endsWith('@praxisone.com')
  content = content.replace(/user\.tenantSlug === 'praxisone' \|\| user\.email\?\.endsWith\('@praxisone\.com'\)/g, 
    "(['praxisone', 'mlk-computer-consulting'].includes(user.tenantSlug as string) || ['@praxisone.com', '@mlkcomputer.com'].some(d => user.email?.endsWith(d)))");

  // 7. email.toLowerCase().endsWith('@praxisone.com') in register route
  content = content.replace(/email\.toLowerCase\(\)\.endsWith\('@praxisone\.com'\)/g, 
    "['@praxisone.com', '@mlkcomputer.com'].some(d => email.toLowerCase().endsWith(d))");

  // 8. userToReset.tenant?.slug === 'praxisone'
  content = content.replace(/userToReset\.tenant\?\.slug === 'praxisone'/g, 
    "['praxisone', 'mlk-computer-consulting'].includes(userToReset.tenant?.slug as string)");

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
  }
});
