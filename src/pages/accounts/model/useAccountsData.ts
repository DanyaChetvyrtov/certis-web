import {useCallback, useEffect, useRef, useState} from 'react'
import type {TFunction} from 'i18next'
import {getAccounts} from '../../../features/accounts/api/accountsApi'
import type {Account} from '../../../features/accounts/api/accountsApi'
import {ApiError} from '../../../shared/api/ApiError'

export type AccountsLoadState = 'loading' | 'ready' | 'error'

export function useAccountsData(t: TFunction) {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loadState, setLoadState] = useState<AccountsLoadState>('loading')
    const [loadError, setLoadError] = useState('')
    const requestId = useRef(0)

    const reloadAccounts = useCallback(async () => {
        const currentRequest = ++requestId.current
        setLoadState('loading')
        setLoadError('')

        try {
            const loadedAccounts = await getAccounts()
            if (currentRequest !== requestId.current) return
            setAccounts(loadedAccounts)
            setLoadState('ready')
        } catch (error) {
            if (currentRequest !== requestId.current) return
            setLoadError(error instanceof ApiError
                ? error.message
                : t('accounts.loadError'))
            setLoadState('error')
        }
    }, [t])

    useEffect(() => {
        let active = true
        queueMicrotask(() => {
            if (active) void reloadAccounts()
        })
        return () => {
            active = false
            requestId.current += 1
        }
    }, [reloadAccounts])

    const upsertAccount = useCallback((savedAccount: Account) => {
        setAccounts((current) => current.some(
            (account) => account.id === savedAccount.id,
        )
            ? current.map((account) => account.id === savedAccount.id
                ? savedAccount
                : account)
            : [savedAccount, ...current])
    }, [])

    return {accounts, loadState, loadError, reloadAccounts, upsertAccount}
}
