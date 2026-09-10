import {
    fireEvent,
    render,
    screen,
} from '@testing-library/react'
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import {
    SettingsModal,
} from './SettingsModal'
import {
    ThemeProvider,
} from './ThemeProvider'
import {
    THEME_STORAGE_KEY,
} from './theme'
import {
    LANGUAGE_STORAGE_KEY,
} from '../../i18n/language'

const renderModal = (
    onClose = vi.fn(),
) => render(
    <ThemeProvider>
        <SettingsModal onClose={onClose}/>
    </ThemeProvider>,
)

describe('SettingsModal', () => {
    beforeEach(() => {
        window.localStorage.clear()
        delete document.documentElement.dataset.theme
        document.documentElement.style.colorScheme = ''
    })

    afterEach(() => {
        window.localStorage.clear()
        delete document.documentElement.dataset.theme
        document.documentElement.style.colorScheme = ''
    })

    it('switches themes immediately and persists the selection', () => {
        renderModal()

        const lightOption = screen.getByRole(
            'button',
            {name: /Light/},
        )
        const darkOption = screen.getByRole(
            'button',
            {name: /Dark/},
        )

        expect(lightOption).toHaveAttribute(
            'aria-pressed',
            'true',
        )

        fireEvent.click(darkOption)

        expect(darkOption).toHaveAttribute(
            'aria-pressed',
            'true',
        )
        expect(document.documentElement.dataset.theme)
            .toBe('dark')
        expect(window.localStorage.getItem(THEME_STORAGE_KEY))
            .toBe('dark')

        fireEvent.click(lightOption)

        expect(document.documentElement.dataset.theme)
            .toBe('light')
        expect(window.localStorage.getItem(THEME_STORAGE_KEY))
            .toBe('light')
    })

    it('restores a saved theme and closes with Escape', () => {
        const onClose = vi.fn()

        window.localStorage.setItem(
            THEME_STORAGE_KEY,
            'dark',
        )

        renderModal(onClose)

        expect(screen.getByRole('button', {name: /Dark/}))
            .toHaveAttribute('aria-pressed', 'true')
        expect(document.documentElement.dataset.theme)
            .toBe('dark')

        fireEvent.keyDown(document, {key: 'Escape'})

        expect(onClose).toHaveBeenCalledOnce()
    })

    it('switches language immediately and persists the selection', async () => {
        renderModal()

        const russianOption = screen.getByRole(
            'button',
            {name: /Russian/},
        )

        fireEvent.click(russianOption)

        expect(await screen.findByRole('dialog', {name: 'Настройки'}))
            .toBeInTheDocument()
        expect(russianOption).toHaveAttribute('aria-pressed', 'true')
        expect(document.documentElement.lang).toBe('ru')
        expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY))
            .toBe('ru')
    })
})
