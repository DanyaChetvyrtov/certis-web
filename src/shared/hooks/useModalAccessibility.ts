import {
    useEffect,
    useRef,
} from 'react'
import type {
    RefObject,
} from 'react'

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"]):not([hidden])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',')

type ModalAccessibilityOptions = {
    canClose?: boolean
    initialFocusRef?: RefObject<HTMLElement | null>
    onClose?: () => void
    restoreFocus?: () => void
}

const getFocusableElements = (
    container: HTMLElement,
): HTMLElement[] =>
    Array.from(
        container.querySelectorAll<HTMLElement>(
            FOCUSABLE_SELECTOR,
        ),
    ).filter(
        (element) =>
            element.getAttribute('aria-hidden')
            !== 'true',
    )

export function useModalAccessibility<
    T extends HTMLElement = HTMLElement
>({
      canClose = true,
      initialFocusRef,
      onClose,
      restoreFocus,
  }: ModalAccessibilityOptions) {
    const dialogRef = useRef<T>(null)
    const restoreFocusRef = useRef(restoreFocus)

    useEffect(() => {
        restoreFocusRef.current =
            restoreFocus
    }, [restoreFocus])

    useEffect(() => {
        const dialog =
            dialogRef.current

        if (!dialog) {
            return
        }

        const previouslyFocused =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null

        const previousOverflow =
            document.body.style.overflow

        document.body.style.overflow =
            'hidden'

        const initialElement =
            initialFocusRef?.current
            ?? getFocusableElements(dialog)[0]
            ?? dialog

        initialElement.focus()

        return () => {
            document.body.style.overflow =
                previousOverflow

            if (restoreFocusRef.current) {
                restoreFocusRef.current()
            } else {
                previouslyFocused?.focus()
            }
        }
    }, [initialFocusRef])

    useEffect(() => {
        const handleKeyDown = (
            event: KeyboardEvent,
        ) => {
            const dialog =
                dialogRef.current

            if (!dialog) {
                return
            }

            if (
                event.key === 'Escape'
                && onClose
                && canClose
            ) {
                event.preventDefault()
                onClose()
                return
            }

            if (event.key !== 'Tab') {
                return
            }

            const focusable =
                getFocusableElements(dialog)

            if (focusable.length === 0) {
                event.preventDefault()
                dialog.focus()
                return
            }

            const first =
                focusable[0]

            const last =
                focusable[
                focusable.length - 1
                    ]

            const active =
                document.activeElement

            if (
                event.shiftKey
                && (
                    active === first
                    || (
                        active
                        && !dialog.contains(
                            active,
                        )
                    )
                )
            ) {
                event.preventDefault()
                last.focus()
                return
            }

            if (
                !event.shiftKey
                && (
                    active === last
                    || (
                        active
                        && !dialog.contains(
                            active,
                        )
                    )
                )
            ) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener(
            'keydown',
            handleKeyDown,
        )

        return () => {
            document.removeEventListener(
                'keydown',
                handleKeyDown,
            )
        }
    }, [canClose, onClose])

    return dialogRef
}