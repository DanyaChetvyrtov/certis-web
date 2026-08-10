import {
    useEffect,
    useRef,
    useState,
} from 'react'
import {Icon} from '../../../components/Icons'
import type {
    Transaction,
} from '../api/transactionsApi'

type TransactionActionMenuProps = {
    transaction: Transaction
    onDelete: (
        transaction: Transaction,
        restoreFocusTarget: HTMLButtonElement,
    ) => void
    onEdit: (
        transaction: Transaction,
        restoreFocusTarget: HTMLButtonElement,
    ) => void
}

export function TransactionActionMenu({
    transaction,
    onDelete,
    onEdit,
}: TransactionActionMenuProps) {
    const [isOpen, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (!isOpen) {
            return
        }

        const closeOnOutsideClick = (
            event: PointerEvent,
        ) => {
            if (
                event.target instanceof Node
                && !menuRef.current?.contains(event.target)
            ) {
                setOpen(false)
            }
        }

        const closeOnEscape = (
            event: KeyboardEvent,
        ) => {
            if (event.key === 'Escape') {
                setOpen(false)
                triggerRef.current?.focus()
            }
        }

        document.addEventListener(
            'pointerdown',
            closeOnOutsideClick,
        )
        window.addEventListener(
            'keydown',
            closeOnEscape,
        )

        return () => {
            document.removeEventListener(
                'pointerdown',
                closeOnOutsideClick,
            )
            window.removeEventListener(
                'keydown',
                closeOnEscape,
            )
        }
    }, [isOpen])

    const transactionName =
        transaction.merchant?.trim()
        || transaction.note?.trim()
        || 'transaction'

    return (
        <div
            ref={menuRef}
            className="transaction-action-menu"
        >
            <button
                ref={triggerRef}
                className="transaction-action-trigger"
                type="button"
                aria-label={`Actions for ${transactionName}`}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() => setOpen((current) => !current)}
            >
                <Icon name="more"/>
            </button>

            {isOpen && (
                <div
                    className="transaction-action-popover"
                    role="menu"
                >
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false)
                            if (triggerRef.current) {
                                onEdit(
                                    transaction,
                                    triggerRef.current,
                                )
                            }
                        }}
                    >
                        <Icon name="edit"/>
                        Edit
                    </button>
                    <button
                        className="danger"
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false)
                            if (triggerRef.current) {
                                onDelete(
                                    transaction,
                                    triggerRef.current,
                                )
                            }
                        }}
                    >
                        <Icon name="trash"/>
                        Delete
                    </button>
                </div>
            )}
        </div>
    )
}
