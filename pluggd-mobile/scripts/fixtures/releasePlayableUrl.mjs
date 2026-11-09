import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), ts = require('typescript');
const path = new URL('../../src/lib/mobileContent.ts', import.meta.url);
const ast = ts.createSourceFile(path.pathname, readFileSync(path, 'utf8'), ts.ScriptTarget.ES2022, true);
const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'releasePlayableUrl');
if (!declaration) throw new Error('Actual releasePlayableUrl declaration missing');
const compiled = ts.transpileModule(declaration.getText(ast).replace(/^export\s+/, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
export const releasePlayableUrl = new Function(compiled + '\nreturn releasePlayableUrl;')();
