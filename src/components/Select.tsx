import * as SelectPrimitive from '@radix-ui/react-select'
import type {ComponentProps, ReactNode} from 'react'
import {Icon} from './Icons'
import './Select.css'

type SelectProps = Omit<
    ComponentProps<typeof SelectPrimitive.Trigger>,
    'value' | 'onChange' | 'children'
> & {
    value: string
    onValueChange: (value: string) => void
    children: ReactNode
}

// Encode every value so an empty option remains selectable, without reserving
// a domain value. Radix uses the empty string exclusively for its placeholder.
const encodeValue = (value: string) => `option:${value}`

export function Select({
    value,
    onValueChange,
    children,
    disabled,
    name,
    form,
    className = '',
    ...triggerProps
}: SelectProps) {
    return (
        <SelectPrimitive.Root
            value={encodeValue(value)}
            onValueChange={(next) => onValueChange(next.slice('option:'.length))}
            disabled={disabled}
        >
            <SelectPrimitive.Trigger
                {...triggerProps}
                form={form}
                className={`certis-select ${className}`.trim()}
            >
                <span className="certis-select-value"><SelectPrimitive.Value /></span>
                <SelectPrimitive.Icon className="certis-select-chevron">
                    <Icon name="chevron-down" />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>
            {name && <input type="hidden" name={name} form={form} value={value} disabled={disabled} />}
            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    className="certis-select-content"
                    position="popper"
                    sideOffset={6}
                    collisionPadding={12}
                    onClick={(event) => event.stopPropagation()}
                >
                    <SelectPrimitive.ScrollUpButton className="certis-select-scroll-button">
                        <Icon name="chevron-down" />
                    </SelectPrimitive.ScrollUpButton>
                    <SelectPrimitive.Viewport className="certis-select-viewport">
                        {children}
                    </SelectPrimitive.Viewport>
                    <SelectPrimitive.ScrollDownButton className="certis-select-scroll-button">
                        <Icon name="chevron-down" />
                    </SelectPrimitive.ScrollDownButton>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    )
}

export function SelectOption({
    value,
    children,
    disabled,
}: {
    value: string
    children: ReactNode
    disabled?: boolean
}) {
    return (
        <SelectPrimitive.Item className="certis-select-option" value={encodeValue(value)} disabled={disabled}>
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
            <SelectPrimitive.ItemIndicator className="certis-select-check">
                <Icon name="check-circle" />
            </SelectPrimitive.ItemIndicator>
        </SelectPrimitive.Item>
    )
}
