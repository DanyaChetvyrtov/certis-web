import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import ts from 'typescript'
import {legacyImports} from './fsd-legacy-imports.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const layers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared']
const migratedSlices = new Set(['pages/transactions', 'features/transaction-navigation'])

const slash = (value) => value.replaceAll('\\', '/')
const withoutExtension = (value) => value.replace(/\.(?:tsx?|jsx?|mjs|css)$/, '')

export function getImports(source, fileName) {
  const ast = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const imports = []
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push(node.moduleSpecifier.text)
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length === 1) {
      imports.push(ts.isStringLiteral(node.arguments[0])
        ? node.arguments[0].text : '<dynamic expression>')
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return imports
}

const sliceOf = (parts) => parts.length >= 3 && layers.includes(parts[1])
  && parts[1] !== 'shared' ? `${parts[1]}/${parts[2]}` : null

export function checkImport(sourceFile, specifier, exceptions = legacyImports) {
  if (specifier === '<dynamic expression>') return 'nonliteral dynamic import cannot be checked'
  if (!specifier.startsWith('.')) return null
  const source = slash(sourceFile)
  const target = slash(path.posix.normalize(path.posix.join(path.posix.dirname(source), specifier)))
  if (!target.startsWith('src/')) return `import escapes src: ${specifier}`
  const normalized = withoutExtension(target)
  const sourceParts = source.split('/')
  const targetParts = normalized.split('/')
  const sourceSlice = sliceOf(sourceParts)
  if (!sourceSlice || !migratedSlices.has(sourceSlice)) return null
  if (target.endsWith('.css')) return null
  const targetSlice = sliceOf(targetParts)
  if (targetSlice === sourceSlice) return null
  if (exceptions.some(({source: allowedSource, target: allowedTarget}) =>
    allowedSource === `src/${sourceSlice}` && allowedTarget === normalized)) return null
  if (targetParts[1] === 'features' && !migratedSlices.has(targetSlice)) {
    return `unlisted legacy import: ${specifier}`
  }
  if (!targetSlice && targetParts[1] !== 'shared') {
    return `unlisted legacy import: ${specifier}`
  }
  const sourceRank = layers.indexOf(sourceParts[1])
  const targetRank = layers.indexOf(targetParts[1])
  if (targetRank <= sourceRank) return `upward or peer import: ${specifier}`
  if (targetParts[1] !== 'shared'
    && ![undefined, 'index'].includes(targetParts.slice(3).join('/') || undefined)) {
    return `cross-slice import must use public index: ${specifier}`
  }
  return null
}

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const name = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(name) : [name]
  })
}

export function checkProject(projectRoot = root) {
  const errors = []
  for (const slice of migratedSlices) {
    const directory = path.join(projectRoot, 'src', slice)
    for (const file of walk(directory)) {
      if (!/\.tsx?$/.test(file) || /\.test\.tsx?$/.test(file)) continue
      const source = slash(path.relative(projectRoot, file))
      for (const specifier of getImports(fs.readFileSync(file, 'utf8'), file)) {
        const message = checkImport(source, specifier)
        if (message) errors.push(`${source}: ${message}`)
      }
    }
  }
  return errors
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkProject(process.argv[2] ? path.resolve(process.argv[2]) : root)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else {
    console.log('FSD import boundaries: OK')
  }
}
