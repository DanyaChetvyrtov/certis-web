import {
    render,
    screen,
} from '@testing-library/react'
import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    LoadingIndicator,
} from './LoadingIndicator'

describe('LoadingIndicator', () => {
    it('announces its loading context and can show the label', () => {
        render(
            <LoadingIndicator
                label="Loading cash flow"
                showLabel
            />,
        )

        const status = screen.getByRole('status')

        expect(status).toHaveTextContent('Loading cash flow')
        expect(status).toHaveClass(
            'loading-indicator-inline',
            'loading-indicator-small',
            'loading-indicator-dark',
        )
    })

    it('supports the large light treatment used by session checking', () => {
        render(
            <LoadingIndicator
                label="Checking your session"
                size="large"
                tone="light"
            />,
        )

        expect(screen.getByRole('status')).toHaveClass(
            'loading-indicator-large',
            'loading-indicator-light',
        )
    })
})
