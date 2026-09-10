import {
    useRef,
    useState,
} from 'react'
import type {
    CSSProperties,
    FormEvent,
} from 'react'
import {useTranslation} from 'react-i18next'
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

const iconKeys: Record<CategoryIcon, string> = {
    gift: 'gift',
    utensils: 'utensils',
    transport: 'transport',
    heart: 'heart',
    home: 'home',
    'shopping-cart': 'shoppingCart',
    repeat: 'repeat',
    briefcase: 'briefcase',
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
    const {t} = useTranslation()
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
            setNameError(t('categories.form.nameRequired'))
            nameInputRef.current?.focus()
            return
        }

        if (normalizedName.length > 150) {
            setNameError(t('categories.form.nameTooLong'))
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
                        ? t('categories.form.updateError')
                        : t('categories.form.createError'),
                )
            }
        } finally {
            setIsSaving(false)
        }
    }

    const previewName =
        name.trim() || t('categories.form.previewFallback')

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
                                ? t('categories.form.editTitle')
                                : t('categories.form.newTitle')}
                        </h2>
                        <p>
                            {isEditing
                                ? t('categories.form.editDescription')
                                : t('categories.form.newDescription')}
                        </p>
                    </div>

                    <button
                        type="button"
                        aria-label={t('categories.form.close')}
                        disabled={isSaving}
                        onClick={onClose}
                    >
                        <Icon name="close"/>
                    </button>
                </header>

                <form onSubmit={submit} noValidate>
                    <div className="category-name-field">
                        <label htmlFor={CATEGORY_NAME_ID}>
                            {t('categories.form.name')}
                        </label>
                        <input
                            ref={nameInputRef}
                            id={CATEGORY_NAME_ID}
                            name="name"
                            value={name}
                            maxLength={150}
                            placeholder={t('categories.form.namePlaceholder')}
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
                        <legend>{t('categories.form.type')}</legend>
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
                                {t('categories.form.expense')}
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
                                {t('categories.form.income')}
                            </label>
                        </div>
                        {isEditing && (
                            <p className="category-type-help">
                                {t('categories.form.typeLocked')}
                            </p>
                        )}
                    </fieldset>

                    <fieldset className="category-option-fieldset">
                        <legend>
                            {t('categories.form.icon')} <span>{t('categories.form.chooseOne')}</span>
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
                                    title={t(`categories.form.icons.${iconKeys[categoryIcon]}`)}
                                >
                                    <input
                                        type="radio"
                                        name="icon"
                                        value={categoryIcon}
                                        checked={icon === categoryIcon}
                                        aria-label={t(`categories.form.icons.${iconKeys[categoryIcon]}`)}
                                        onChange={() => setIcon(categoryIcon)}
                                    />
                                    <Icon name={categoryIcon}/>
                                </label>
                            ))}
                        </div>
                        {isEditing && !isCategoryIcon(icon) && (
                            <p className="category-icon-help">
                                {t('categories.form.unavailableIcon')}
                            </p>
                        )}
                    </fieldset>

                    <fieldset className="category-option-fieldset">
                        <legend>
                            {t('categories.form.color')} <span>{t('categories.form.chooseOne')}</span>
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
                                    title={t(`categories.form.colors.${categoryColor.name}`)}
                                    style={accentStyle(categoryColor.value)}
                                >
                                    <input
                                        type="radio"
                                        name="color"
                                        value={categoryColor.value}
                                        checked={color === categoryColor.value}
                                        aria-label={t(`categories.form.colors.${categoryColor.name}`)}
                                        onChange={() => setColor(categoryColor.value)}
                                    />
                                    <span/>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <section
                        className="category-preview-section"
                        aria-label={t('categories.form.previewLabel')}
                    >
                        <p>{t('categories.form.preview')}</p>
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
                                <small>{t(`categories.type.${type}`)}</small>
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
                            {t('categories.form.cancel')}
                        </button>
                        <button
                            className="primary"
                            type="submit"
                            disabled={isSaving}
                        >
                            {isSaving
                                ? isEditing
                                    ? t('categories.form.saving')
                                    : t('categories.form.creating')
                                : isEditing
                                    ? t('categories.form.save')
                                    : t('categories.form.create')}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    )
}
