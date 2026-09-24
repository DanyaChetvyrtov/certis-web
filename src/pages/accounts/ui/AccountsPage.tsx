import {useEffect, useMemo, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {WorkspaceSidebar} from '../../../widgets/workspace-shell'
import type {Account, Currency} from '../../../features/accounts/api/accountsApi'
import {AccountFormModal} from '../../../features/accounts/components/AccountFormModal'
import {CloseAccountDialog} from '../../../features/accounts/components/CloseAccountDialog'
import './AccountsPage.css'
import './AccountsDarkTheme.css'
import {useAccountsData} from '../model/useAccountsData'
import {selectAccountSummary} from '../model/accountSelectors'
import {AccountsSummary} from './AccountsSummary'
import {AccountsList} from './AccountsList'

export function AccountsPage() {
    const {t} = useTranslation()
    const {accounts, loadState, loadError, reloadAccounts, upsertAccount} = useAccountsData(t)
    const [currency, setCurrency] = useState<Currency>('RUB')
    const [notice, setNotice] = useState('')

    const searchInputRef = useRef<HTMLInputElement>(null)
    const accountsHeadingRef = useRef<HTMLHeadingElement>(null)

    type AccountModalState = {
        account: Account | 'new'
        restoreFocus?: () => void
    }

    type CloseAccountState = {
        account: Account
        restoreFocus: () => void
    }

    const [formModal, setFormModal,] =
        useState<AccountModalState | null>(
            null,
        )

    const [closeDialog, setCloseDialog] = useState<CloseAccountState | null>(
        null,
    )

    const openNewAccount = (): void => {
        setFormModal({
            account: 'new',
        })
    }

    const editAccount = (
        account: Account,
        restoreFocus: () => void,
    ): void => {
        setFormModal({
            account,
            restoreFocus,
        })
    }

    const requestAccountClose = (
        account: Account,
        restoreFocus: () => void,
    ): void => {
        setCloseDialog({
            account,
            restoreFocus,
        })
    }

    useEffect(() => {
        if (!notice) return
        const timeoutId = window.setTimeout(() => setNotice(''), 3200)
        return () => window.clearTimeout(timeoutId)
    }, [notice])

    const {activeAccounts, closedAccounts, totalBalance, balanceByType} = useMemo(
        () => selectAccountSummary(accounts, currency),
        [accounts, currency],
    )

    const saveAccount = (
        savedAccount: Account,
    ) => {
        const isNewAccount =
            formModal?.account === 'new'

        upsertAccount(savedAccount)

        setFormModal(null)
        setNotice(isNewAccount ? t('accounts.createdNotice') : t('accounts.updatedNotice'))
    }

    const finishClosing = async () => {
        const closedName =
            closeDialog?.account.name

        await reloadAccounts()

        setCloseDialog(null)

        setNotice(
            closedName
                ? t('accounts.namedClosedNotice', {name: closedName})
                : t('accounts.closedNotice'),
        )
    }

    return (
        <div className="accounts-workspace">
            <WorkspaceSidebar
                activePage="accounts"
                activeAccounts={activeAccounts.length}
            />

            <main className="accounts-main">
                <header className="accounts-page-header">
                    <div>
                        <p>{t('accounts.eyebrow')}</p>
                        <h1>{t('accounts.title')}</h1>
                        <span>{t('accounts.subtitle')}</span>
                    </div>
                    <div className="accounts-header-actions">
                        <button
                            className="accounts-icon-button"
                            type="button"
                            aria-label={t('accounts.focusSearch')}
                            onClick={() => searchInputRef.current?.focus()}
                        >
                            <Icon name="search"/>
                        </button>
                        <button
                            className="accounts-icon-button notification-button"
                            type="button"
                            aria-label={t('accounts.notificationsUnavailable')}
                            disabled
                        >
                            <Icon name="bell"/>
                        </button>
                        <button
                            className="new-account-button"
                            type="button"
                            onClick={openNewAccount}
                        >
                            <Icon name="plus"/>
                            {t('accounts.newAccount')}
                        </button>
                    </div>
                </header>

                {notice && <div className="accounts-notice" role="status">{notice}</div>}

                <AccountsSummary
                    currency={currency}
                    onCurrencyChange={setCurrency}
                    activeCount={activeAccounts.length}
                    closedCount={closedAccounts.length}
                    totalBalance={totalBalance}
                    balanceByType={balanceByType}
                />
                <AccountsList
                    accounts={accounts}
                    activeCount={activeAccounts.length}
                    closedCount={closedAccounts.length}
                    loadState={loadState}
                    loadError={loadError}
                    searchInputRef={searchInputRef}
                    headingRef={accountsHeadingRef}
                    onRetry={reloadAccounts}
                    onNewAccount={openNewAccount}
                    onEdit={editAccount}
                    onCloseAccount={requestAccountClose}
                />
            </main>

            {formModal && (
                <AccountFormModal
                    account={
                        formModal.account === 'new'
                            ? undefined
                            : formModal.account
                    }
                    onClose={() =>
                        setFormModal(null)
                    }
                    onSaved={saveAccount}
                    restoreFocus={
                        formModal.restoreFocus
                    }
                />
            )}
            {closeDialog && (
                <CloseAccountDialog
                    account={closeDialog.account}
                    onCancel={() =>
                        setCloseDialog(null)
                    }
                    onClosed={finishClosing}
                    restoreFocus={
                        closeDialog.restoreFocus
                    }
                />
            )}
        </div>
    )
}
