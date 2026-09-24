import {describe, expect, it} from 'vitest'
import {spawnSync} from 'node:child_process'
import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {checkImport, getImports} from './check-fsd-boundaries.mjs'

const page = 'src/pages/transactions/ui/TransactionsPage.tsx'
const accountsPage = 'src/pages/accounts/ui/AccountsPage.tsx'
const widget = 'src/widgets/workspace-shell/ui/WorkspaceSidebar.tsx'

describe('FSD import boundaries', () => {
    it('accepts internal and downward public imports', () => {
        expect(checkImport(page, '../model/selectors')).toBeNull()
        expect(checkImport(page, '../../../features/transaction-navigation')).toBeNull()
        expect(checkImport(page, '../../../shared/api/client')).toBeNull()
        expect(checkImport(page, '../../../widgets/workspace-shell')).toBeNull()
        expect(checkImport(widget, '../model/navigation')).toBeNull()
        expect(checkImport(widget, '../../../features/transaction-navigation')).toBeNull()
        expect(checkImport(widget, '../../../components/Icons')).toBeNull()
    })

    it('rejects upward, peer and deep cross-slice imports', () => {
        expect(checkImport('src/features/transaction-navigation/index.ts',
            '../../pages/transactions')).toContain('upward')
        expect(checkImport(page, '../../accounts')).toContain('peer')
        expect(checkImport(page, '../../../features/transaction-navigation/internal')).toContain('public index')
        expect(checkImport(widget, '../../../pages/transactions')).toContain('upward')
        expect(checkImport(widget, '../../other-widget')).toContain('peer')
        expect(checkImport(widget, '../../../features/transaction-navigation/internal')).toContain('public index')
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
        expect(checkImport(page, '../../../layouts/WorkspaceSidebar')).toContain('unlisted legacy')
        expect(checkImport(widget, '../../../features/profile/Unknown')).toContain('unlisted legacy')
    })

    it('checks Accounts public APIs and exact legacy imports', () => {
        expect(checkImport(accountsPage, '../model/accountSelectors')).toBeNull()
        expect(checkImport(accountsPage, '../../../widgets/workspace-shell')).toBeNull()
        for (const target of [
            'features/accounts/api/accountsApi',
            'features/accounts/components/AccountFormModal',
            'features/accounts/components/CloseAccountDialog',
            'features/accounts/components/AccountActionMenu',
            'components/Select',
            'components/Icons',
            'i18n/useLanguage',
        ]) {
            expect(checkImport(accountsPage, `../../../${target}`)).toBeNull()
        }
        expect(checkImport(accountsPage, '../../../app/AppRouter')).toContain('upward')
        expect(checkImport(accountsPage, '../../transactions')).toContain('peer')
        expect(checkImport(accountsPage, '../../../widgets/workspace-shell/ui/WorkspaceSidebar'))
            .toContain('public index')
        expect(checkImport(accountsPage, '../../../features/transaction-navigation/internal'))
            .toContain('public index')
        expect(checkImport(accountsPage, '../../../features/accounts/components/Unknown'))
            .toContain('unlisted legacy')
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

    it('checks new widget files as migrated code', () => {
        const project = mkdtempSync(path.join(tmpdir(), 'certis-fsd-widget-'))
        try {
            const directory = path.join(project, 'src/widgets/workspace-shell/ui')
            mkdirSync(directory, {recursive: true})
            writeFileSync(path.join(directory, 'Bad.tsx'),
                "import '../../../features/profile/Unknown'\n")
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

    it('checks new Accounts files as migrated code', () => {
        const project = mkdtempSync(path.join(tmpdir(), 'certis-fsd-accounts-'))
        try {
            const directory = path.join(project, 'src/pages/accounts/ui')
            mkdirSync(directory, {recursive: true})
            writeFileSync(path.join(directory, 'Bad.tsx'),
                "import '../../../features/accounts/components/Unknown'\n")
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
