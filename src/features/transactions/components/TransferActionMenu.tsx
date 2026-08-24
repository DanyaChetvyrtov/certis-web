import {
    useEffect,
    useRef,
    useState,
} from 'react'
import {Icon} from '../../../components/Icons'
import type {Transfer} from '../api/transfersApi'

type Props = {
    transfer: Transfer
    label: string
    onReverse: (
        transfer: Transfer,
        restoreFocusTarget: HTMLButtonElement,
    ) => void
}

export function TransferActionMenu({
    transfer,
    label,
    onReverse,
}: Props) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const actionRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (!open) return

        actionRef.current?.focus()
        const close = (event: PointerEvent) => {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
                setOpen(false)
            }
        }
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false)
                triggerRef.current?.focus()
            }
        }

        document.addEventListener('pointerdown', close)
        window.addEventListener('keydown', closeOnEscape)
        return () => {
            document.removeEventListener('pointerdown', close)
            window.removeEventListener('keydown', closeOnEscape)
        }
    }, [open])

    return (
        <div ref={rootRef} className="transaction-action-menu">
            <button
                ref={triggerRef}
                className="transaction-action-trigger"
                type="button"
                aria-label={`Actions for ${label}`}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
            >
                <Icon name="more"/>
            </button>
            {open && (
                <div className="transaction-action-popover" role="menu">
                    <button
                        ref={actionRef}
                        className="danger"
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false)
                            if (triggerRef.current) {
                                onReverse(transfer, triggerRef.current)
                            }
                        }}
                    >
                        <Icon name="repeat"/>
                        Reverse
                    </button>
                </div>
            )}
        </div>
    )
}
