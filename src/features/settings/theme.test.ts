import {
    afterEach,
    describe,
    expect,
    it,
} from 'vitest'
import {
    getStoredTheme,
    initializeTheme,
    THEME_STORAGE_KEY,
} from './theme'

describe('theme preference', () => {
    afterEach(() => {
        window.localStorage.clear()
        delete document.documentElement.dataset.theme
        document.documentElement.style.colorScheme = ''
    })

    it('ignores an invalid stored value', () => {
        window.localStorage.setItem(
            THEME_STORAGE_KEY,
            'sepia',
        )

        expect(getStoredTheme()).toBe('light')
        expect(initializeTheme()).toBe('light')
        expect(document.documentElement.dataset.theme)
            .toBe('light')
    })
})
