import {
    useEffect,
    useRef,
    useState,
} from 'react'
import type {
    KeyboardEvent as ReactKeyboardEvent,
} from 'react'

import {
    Icon,
} from '../../../components/Icons'
import type {
    Account,
} from '../api/accountsApi'

type RestoreFocus = () => void

type AccountActionMenuProps = {
    account: Account
    fallbackRestoreFocus: RestoreFocus
    onCloseAccount: (
        account: Account,
        restoreFocus: RestoreFocus,
    ) => void
    onEdit: (
        account: Account,
        restoreFocus: RestoreFocus,
    ) => void
}

export function AccountActionMenu({
                                      account,
                                      fallbackRestoreFocus,
                                      onCloseAccount,
                                      onEdit,
                                  }: AccountActionMenuProps) {
    const [isOpen, setOpen] =
        useState(false)

    const triggerRef =
        useRef<HTMLButtonElement>(null)

    const menuRef =
        useRef<HTMLDivElement>(null)

    const menuId =
        `account-actions-${account.id}`

    const restoreFocus = (): void => {
        const trigger =
            triggerRef.current

        if (trigger?.isConnected) {
            trigger.focus()
            return
        }

        fallbackRestoreFocus()
    }

    useEffect(() => {
        if (!isOpen) {
            return
        }

        menuRef.current
            ?.querySelector<HTMLButtonElement>(
                '[role="menuitem"]',
            )
            ?.focus()

        const closeOnOutsideClick = (
            event: PointerEvent,
        ) => {
            const target = event.target

            if (!(target instanceof Node)) {
                return
            }

            const clickedMenu =
                menuRef.current
                    ?.contains(target)
                ?? false

            const clickedTrigger =
                triggerRef.current
                    ?.contains(target)
                ?? false

            if (
                !clickedMenu
                && !clickedTrigger
            ) {
                setOpen(false)
            }
        }

        document.addEventListener(
            'pointerdown',
            closeOnOutsideClick,
        )

        return () => {
            document.removeEventListener(
                'pointerdown',
                closeOnOutsideClick,
            )
        }
    }, [isOpen])

    const handleKeyDown = (
        event:
        ReactKeyboardEvent<HTMLDivElement>,
    ): void => {
        if (!isOpen) {
            return
        }

        if (event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)

            triggerRef.current
                ?.focus()

            return
        }

        if (event.key === 'Tab') {
            setOpen(false)
            return
        }

        if (
            ![
                'ArrowDown',
                'ArrowUp',
                'Home',
                'End',
            ].includes(event.key)
        ) {
            return
        }

        const items = Array.from(
            menuRef.current
                ?.querySelectorAll<HTMLButtonElement>(
                    '[role="menuitem"]',
                )
            ?? [],
        )

        if (items.length === 0) {
            return
        }

        event.preventDefault()

        const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)

        if (event.key === 'Home') {
            items[0].focus()
            return
        }

        if (event.key === 'End') {
            items[
            items.length - 1
                ].focus()

            return
        }

        const direction =
            event.key === 'ArrowDown'
                ? 1
                : -1

        const nextIndex =
            (
                currentIndex
                + direction
                + items.length
            ) % items.length

        items[nextIndex].focus()
    }

    return (
        <div
            className="account-row-actions"
            onKeyDown={handleKeyDown}
        >
            <button
                ref={triggerRef}
                type="button"
                aria-label={
                    `Actions for ${account.name}`
                }
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={menuId}
                onClick={() =>
                    setOpen(
                        (current) =>
                            !current,
                    )
                }
            >
                <Icon name="more"/>
            </button>

            {isOpen && (
                <div
                    ref={menuRef}
                    id={menuId}
                    className="account-action-menu"
                    role="menu"
                    aria-label={
                        `Actions for ${account.name}`
                    }
                >
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false)

                            onEdit(
                                account,
                                restoreFocus,
                            )
                        }}
                    >
                        <Icon name="edit"/>
                        Edit account
                    </button>

                    <button
                        className="close-action"
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false)

                            onCloseAccount(
                                account,
                                restoreFocus,
                            )
                        }}
                    >
                        <Icon name="trash"/>
                        Close account
                    </button>
                </div>
            )}
        </div>
    )
}