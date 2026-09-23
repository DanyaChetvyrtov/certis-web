import {describe, expect, it} from 'vitest'
import {spawnSync} from 'node:child_process'
import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {checkImport, getImports} from './check-fsd-boundaries.mjs'

const page = 'src/pages/transactions/ui/TransactionsPage.tsx'

describe('FSD import boundaries', () => {
    it('accepts internal and downward public imports', () => {
        expect(checkImport(page, '../model/selectors')).toBeNull()
        expect(checkImport(page, '../../../features/transaction-navigation')).toBeNull()
        expect(checkImport(page, '../../../shared/api/client')).toBeNull()
    })

    it('rejects upward, peer and deep cross-slice imports', () => {
        expect(checkImport('src/features/transaction-navigation/index.ts',
            '../../pages/transactions')).toContain('upward')
        expect(checkImport(page, '../../accounts')).toContain('peer')
        expect(checkImport(page, '../../../features/transaction-navigation/internal')).toContain('public index')
    })

    it('checks dynamic imports and re-exports', () => {
        expect(getImports("import('./other'); export {x} from '../model/x'; import(variable)", page))
            .toEqual(['./other', '../model/x', '<dynamic expression>'])
        expect(checkImport(page, '../../../features/transaction-navigation/internal')).toContain('public index')
        expect(checkImport(page, '<dynamic expression>')).toContain('nonliteral dynamic')
    })

    it('allows only listed legacy integrations', () => {
        expect(checkImport(page, '../../../features/accounts/api/accountsApi')).toBeNull()
        expect(checkImport(page, '../../../features/accounts/api/other')).toContain('unlisted legacy')
        expect(checkImport(page, '../../../layouts/Unknown')).toContain('unlisted legacy')
    })

    it('exits nonzero for an unlisted project import', () => {
        const project = mkdtempSync(path.join(tmpdir(), 'certis-fsd-'))
        try {
            const directory = path.join(project, 'src/pages/transactions/ui')
            mkdirSync(directory, {recursive: true})
            writeFileSync(path.join(directory, 'Bad.tsx'),
                "import '../../../layouts/Unknown'\n")
            const result = spawnSync(process.execPath, [
                'scripts/check-fsd-boundaries.mjs', project,
            ], {encoding: 'utf8'})
            expect(result.status).toBe(1)
            expect(result.stderr).toContain('unlisted legacy import')
        } finally {
            if (path.resolve(project).startsWith(path.resolve(tmpdir()) + path.sep)) {
                rmSync(project, {recursive: true, force: true})
            }
        }
    })
})
