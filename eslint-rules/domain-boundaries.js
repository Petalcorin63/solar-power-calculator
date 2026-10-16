// Local ESLint rule: code outside a domain folder may only import that domain's index.
//
// A "domain" is one folder of related code with an index.ts as its public face:
//   src/lib/<name>/   src/composables/<name>/   src/components/<name>/   server/<name>/
// Inside a domain, files import each other directly (`./types`, `./data/nec`). From
// anywhere else, import the folder itself (`../sizing`, `../ui`, `../db/index.js`) — never a file
// inside it — so a domain can reorganize its files without breaking the rest of the app.
// See CONTRIBUTING.md, "Folders and files".
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

/** Folders whose sub-folders are each a domain. */
const DOMAIN_PARENTS = ['src/lib', 'src/composables', 'src/components', 'server']

/** The domain folder (repo-relative) a path is inside, or null if it isn't in one. */
function domainOf(absolutePath) {
  const rel = path.relative(ROOT, absolutePath).split(path.sep).join('/')
  for (const parent of DOMAIN_PARENTS) {
    if (!rel.startsWith(`${parent}/`)) continue
    const parts = rel.slice(parent.length + 1).split('/')
    // `src/lib/numbers.ts` is a lone file, not inside a domain folder.
    if (parts.length > 1) return `${parent}/${parts[0]}`
  }
  return null
}

function isIndex(absolutePath) {
  return path.basename(absolutePath).replace(/\.(js|ts)$/, '') === 'index'
}

export default {
  rules: {
    'domain-boundaries': {
      meta: {
        type: 'problem',
        docs: { description: "Import other domains through their index, not their internal files." },
        schema: [],
        messages: {
          internal: "'{{source}}' reaches inside {{domain}}/ — import '{{suggestion}}' instead (its index re-exports what's public).",
        },
      },
      create(context) {
        const importerDomain = domainOf(context.filename)

        function check(node) {
          const source = node.source?.value
          if (typeof source !== 'string' || !source.startsWith('.')) return
          const target = path.resolve(path.dirname(context.filename), source)
          const targetDomain = domainOf(target)
          if (!targetDomain || targetDomain === importerDomain || isIndex(target)) return

          const domainDir = path.join(ROOT, targetDomain)
          let suggestion = path.relative(path.dirname(context.filename), domainDir).split(path.sep).join('/')
          if (!suggestion.startsWith('.')) suggestion = `./${suggestion}`
          // Server code runs as Node ESM, which needs the full file path.
          if (targetDomain.startsWith('server/') || source.endsWith('.js')) suggestion += '/index.js'
          context.report({ node: node.source, messageId: 'internal', data: { source, domain: targetDomain, suggestion } })
        }

        return {
          ImportDeclaration: check,
          ImportExpression: check,
          ExportAllDeclaration: check,
          ExportNamedDeclaration: check,
        }
      },
    },
  },
}
