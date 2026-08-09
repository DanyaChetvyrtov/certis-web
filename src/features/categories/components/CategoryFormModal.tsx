import {
    useRef,
    useState,
} from 'react'
import type {
    CSSProperties,
    FormEvent,
} from 'react'
import {Icon} from '../../../components/Icons'
import {ApiError} from '../../../shared/api/ApiError'
import {
    useModalAccessibility,
} from '../../../shared/hooks/useModalAccessibility'
import {
    categoryIcons,
    createCategory,
    isCategoryIcon,
    updateCategory,
} from '../api/categoriesApi'
import type {
    Category,
    CategoryIcon,
    CategoryType,
} from '../api/categoriesApi'
import './CategoryFormModal.css'

type CategoryFormModalProps = {
    category?: Category
    onClose: () => void
    onSaved: (category: Category) => void
    restoreFocus?: () => void
}

type CategoryAccentStyle = CSSProperties & {
    '--category-accent': string
}

const CATEGORY_NAME_ID = 'category-name'
const CATEGORY_NAME_ERROR_ID = `${CATEGORY_NAME_ID}-error`

const categoryColors = [
    {name: 'Coral', value: '#E6655A'},
    {name: 'Orange', value: '#E58E4E'},
    {name: 'Gold', value: '#BC9555'},
    {name: 'Emerald', value: '#10B981'},
    {name: 'Teal', value: '#429792'},
    {name: 'Blue', value: '#5982B3'},
    {name: 'Purple', value: '#8969AD'},
    {name: 'Navy', value: '#0A2343'},
    {name: 'Slate', value: '#8C9AB8'},
] as const

const iconLabels: Record<CategoryIcon, string> = {
    gift: 'Gift',
    utensils: 'Dining',
    transport: 'Transport',
    heart: 'Health',
    home: 'Housing',
    'shopping-cart': 'Shopping',
    repeat: 'Subscriptions',
    briefcase: 'Work',
}

const accentStyle = (
    color: string,
): CategoryAccentStyle => ({
    '--category-accent': color,
})

export function CategoryFormModal({
    category,
    onClose,
    onSaved,
    restoreFocus,
}: CategoryFormModalProps) {
    const isEditing = Boolean(category)
    const [name, setName] = useState(
        category?.name ?? '',
    )
    const [type, setType] =
        useState<CategoryType>(category?.type ?? 'EXPENSE')
    const [icon, setIcon] = useState(
        category?.icon ?? 'gift',
    )
    const [color, setColor] =
        useState(category?.color ?? '#E6655A')
    const [nameError, setNameError] = useState('')
    const [formError, setFormError] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const nameInputRef = useRef<HTMLInputElement>(null)

    const dialogRef =
        useModalAccessibility<HTMLDivElement>({
            canClose: !isSaving,
            initialFocusRef: nameInputRef,
            onClose,
            restoreFocus,
        })

    const submit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault()
        setFormError('')

        const normalizedName = name.trim()

        if (!normalizedName) {
            setNameError('Enter a category name.')
            nameInputRef.current?.focus()
            return
        }

        if (normalizedName.length > 150) {
            setNameError('Use no more than 150 characters.')
            nameInputRef.current?.focus()
            return
        }

        setIsSaving(true)

        try {
            const savedCategory = category
                ? await updateCategory(category.id, {
                    name: normalizedName,
                    icon,
                    color,
                })
                : await createCategory({
                    name: normalizedName,
                    type,
                    icon: isCategoryIcon(icon)
                        ? icon
                        : 'gift',
                    color,
                })

            onSaved(savedCategory)
        } catch (error) {
            if (error instanceof ApiError) {
                const backendNameError =
                    error.fieldErrors?.name

                setNameError(
                    backendNameError ?? '',
                )
                setFormError(error.message)

                if (backendNameError) {
                    nameInputRef.current?.focus()
                }
            } else {
                setFormError(
                    isEditing
                        ? 'We could not update this category. Please try again.'
                        : 'We could not create this category. Please try again.',
                )
            }
        } finally {
            setIsSaving(false)
        }
    }

    const previewName =
        name.trim() || 'Entertainment'

    return (
        <div
            className="category-modal-layer"
            role="presentation"
        >
            <div
                ref={dialogRef}
                className="category-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="category-modal-title"
                tabIndex={-1}
            >
                <header className="category-modal-heading">
                    <div>
                        <h2 id="category-modal-title">
                            {isEditing
                                ? 'Edit category'
                                : 'New category'}
                        </h2>
                        <p>
                            {isEditing
                                ? 'Update how this category appears across Certis.'
                                : 'Create a reusable label for transactions and budgets.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        aria-label="Close category form"
                        disabled={isSaving}
                        onClick={onClose}
                    >
                        <Icon name="close"/>
                    </button>
                </header>

                <form onSubmit={submit} noValidate>
                    <div className="category-name-field">
                        <label htmlFor={CATEGORY_NAME_ID}>
                            Name
                        </label>
                        <input
                            ref={nameInputRef}
                            id={CATEGORY_NAME_ID}
                            name="name"
                            value={name}
                            maxLength={150}
                            placeholder="e.g. Entertainment"
                            aria-invalid={Boolean(nameError)}
                            aria-describedby={
                                nameError
                                    ? CATEGORY_NAME_ERROR_ID
                                    : undefined
                            }
                            onChange={(event) => {
                                setName(event.target.value)
                                setNameError('')
                            }}
                        />

                        {nameError && (
                            <small
                                id={CATEGORY_NAME_ERROR_ID}
                                className="category-field-error"
                            >
                                {nameError}
                            </small>
                        )}
                    </div>

                    <fieldset
                        className="category-type-fieldset"
                        disabled={isEditing}
                    >
                        <legend>Type</legend>
                        <div className="category-type-options">
                            <label
                                className={
                                    type === 'EXPENSE'
                                        ? 'selected expense'
                                        : undefined
                                }
                            >
                                <input
                                    type="radio"
                                    name="type"
                                    value="EXPENSE"
                                    checked={type === 'EXPENSE'}
                                    onChange={() => setType('EXPENSE')}
                                />
                                Expense
                            </label>

                            <label
                                className={
                                    type === 'INCOME'
                                        ? 'selected income'
                                        : undefined
                                }
                            >
                                <input
                                    type="radio"
                                    name="type"
                                    value="INCOME"
                                    checked={type === 'INCOME'}
                                    onChange={() => setType('INCOME')}
                                />
                                Income
                            </label>
                        </div>
                        {isEditing && (
                            <p className="category-type-help">
                                Category type cannot be changed after creation.
                            </p>
                        )}
                    </fieldset>

                    <fieldset className="category-option-fieldset">
                        <legend>
                            Icon <span>Choose one</span>
                        </legend>
                        <div className="category-icon-options">
                            {categoryIcons.map((categoryIcon) => (
                                <label
                                    className={
                                        icon === categoryIcon
                                            ? 'selected'
                                            : undefined
                                    }
                                    key={categoryIcon}
                                    title={iconLabels[categoryIcon]}
                                >
                                    <input
                                        type="radio"
                                        name="icon"
                                        value={categoryIcon}
                                        checked={icon === categoryIcon}
                                        aria-label={iconLabels[categoryIcon]}
                                        onChange={() => setIcon(categoryIcon)}
                                    />
                                    <Icon name={categoryIcon}/>
                                </label>
                            ))}
                        </div>
                        {isEditing && !isCategoryIcon(icon) && (
                            <p className="category-icon-help">
                                This icon is not available in the current set.
                                It will stay unchanged unless you select a new one.
                            </p>
                        )}
                    </fieldset>

                    <fieldset className="category-option-fieldset">
                        <legend>
                            Color <span>Choose one</span>
                        </legend>
                        <div className="category-color-options">
                            {categoryColors.map((categoryColor) => (
                                <label
                                    className={
                                        color === categoryColor.value
                                            ? 'selected'
                                            : undefined
                                    }
                                    key={categoryColor.value}
                                    title={categoryColor.name}
                                    style={accentStyle(categoryColor.value)}
                                >
                                    <input
                                        type="radio"
                                        name="color"
                                        value={categoryColor.value}
                                        checked={color === categoryColor.value}
                                        aria-label={categoryColor.name}
                                        onChange={() => setColor(categoryColor.value)}
                                    />
                                    <span/>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <section
                        className="category-preview-section"
                        aria-label="Category preview"
                    >
                        <p>Preview</p>
                        <div
                            className="category-preview"
                            style={accentStyle(color)}
                        >
                            <span>
                                <Icon
                                    name={
                                        isCategoryIcon(icon)
                                            ? icon
                                            : 'tag'
                                    }
                                />
                            </span>
                            <div>
                                <strong>{previewName}</strong>
                                <small>{type}</small>
                            </div>
                            <Icon name="tag"/>
                        </div>
                    </section>

                    {formError && (
                        <p
                            className="category-form-error"
                            role="alert"
                        >
                            <Icon name="alert"/>
                            {formError}
                        </p>
                    )}

                    <footer className="category-modal-actions">
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            className="primary"
                            type="submit"
                            disabled={isSaving}
                        >
                            {isSaving
                                ? isEditing
                                    ? 'Saving…'
                                    : 'Creating…'
                                : isEditing
                                    ? 'Save changes'
                                    : 'Create category'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    )
}
