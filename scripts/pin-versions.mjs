import { readFileSync } from 'node:fs';

const root = process.argv[2];
const pkg = JSON.parse(readFileSync(`${root}/package.json`, 'utf8'));
for (const section of ['dependencies', 'devDependencies']) {
  for (const name of Object.keys(pkg[section] ?? {})) {
    if (name === 'expo' || name === 'react' || name === 'react-native') continue; // SDK-pinned ranges stay
    try {
      const installed = JSON.parse(readFileSync(`${root}/node_modules/${name}/package.json`, 'utf8')).version;
      if (pkg[section][name] !== installed) {
        console.log(`${section} ${name}: ${pkg[section][name]} -> ${installed}`);
        pkg[section][name] = installed;
      }
    } catch {
      console.log(`SKIP ${name} (not installed)`);
    }
  }
}
const { writeFileSync } = await import('node:fs');
writeFileSync(`${root}/package.json`, `${JSON.stringify(pkg, null, 2)}\n`);
console.log('pinned.');
