import fs from 'fs';
import path from 'path';

const cssPath = 'c:/Users/Ally/Documents/FJOSTE Tracker/fjoste-app/src/index.css';
let css = fs.readFileSync(cssPath, 'utf8');

// Replace :root.light
css = css.replace(/:root\.light/g, ':root.light:not(.is-overlay)');

// Replace .light in other selectors, ensuring it does not follow :root
css = css.replace(/(?<!:root)\.light\b/g, '.light:not(.is-overlay)');

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Successfully updated index.css');
