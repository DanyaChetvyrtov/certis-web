import {fireEvent, screen, waitFor} from '@testing-library/react'

export async function selectOption(trigger: HTMLElement, name: string | RegExp) {
    fireEvent.keyDown(trigger, {key: 'ArrowDown'})
    fireEvent.click(await screen.findByRole('option', {name}))
    await waitFor(() => {
        if (trigger.getAttribute('aria-expanded') !== 'false') {
            throw new Error('The select should close after choosing an option')
        }
    })
}
