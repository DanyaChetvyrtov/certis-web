import {describe, expect, it} from 'vitest'
import {resources} from './resources'

const pluralSuffix = /_(one|few|many|other)$/

function collectLeafPaths(
    value: object,
    prefix = '',
): string[] {
    return Object.entries(value).flatMap(([key, child]) => {
        const path = prefix ? `${prefix}.${key}` : key

        return typeof child === 'object' && child !== null
            ? collectLeafPaths(child, path)
            : path.replace(pluralSuffix, '')
    })
}

describe('translation resources', () => {
    it('keeps English and Russian translation keys in sync', () => {
        const englishKeys = [
            ...new Set(collectLeafPaths(resources.en.translation)),
        ].sort()
        const russianKeys = [
            ...new Set(collectLeafPaths(resources.ru.translation)),
        ].sort()

        expect(russianKeys).toEqual(englishKeys)
    })
})
