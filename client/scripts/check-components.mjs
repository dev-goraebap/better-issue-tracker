import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(process.argv[2] ?? 'src');
const files = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(directory, entry.name);
  return entry.isDirectory() ? files(file) : /\.[cm]?tsx?$/.test(file) ? [file] : [];
});
const errors = [];
for (const file of files(root)) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const components = [];
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text)) components.push(node.name.text);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /^[A-Z]/.test(node.name.text) && node.initializer) {
      const value = node.initializer;
      if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) components.push(node.name.text);
      if (ts.isCallExpression(value) && /^(?:React\.)?(?:memo|forwardRef|lazy)$/.test(value.expression.getText(source))) components.push(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const relative = path.relative(root, file);
  if (components.length > 1) errors.push(`${relative}: 컴포넌트가 ${components.length}개입니다 (${components.join(', ')}).`);
  for (const name of components) {
    if (path.basename(file) !== `${name}.tsx`) errors.push(`${relative}: 파일 이름은 ${name}.tsx여야 합니다.`);
  }
  const segments = relative.split(path.sep);
  if (segments[0] === 'pages' && segments.slice(1, -1).some(segment => segment.endsWith('-page'))) errors.push(`${relative}: 페이지 폴더에는 -page를 붙이지 않습니다.`);
  const pageEntry = segments[0] === 'pages' && path.basename(file) === 'index.ts' && fs.existsSync(path.join(path.dirname(file), 'ui'));
  if (pageEntry) {
    const pageExports = source.statements.filter(ts.isExportDeclaration).flatMap(node =>
      node.exportClause && ts.isNamedExports(node.exportClause)
        ? node.exportClause.elements.filter(element => !element.isTypeOnly && !node.isTypeOnly).map(element => element.name.text)
        : []);
    if (pageExports.filter(name => name.endsWith('Page')).length !== 1) errors.push(`${relative}: Page 접미사가 있는 페이지 컴포넌트를 하나 공개해야 합니다.`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('컴포넌트 파일 및 페이지 이름 규칙을 통과했습니다.');
