import { CommonOptions, Side } from './common.types'

export function isSide(side: string | CommonOptions | Partial<CommonOptions> | undefined): side is Side {
    return Boolean(side) && typeof side === 'string' && ['all', 'top', 'right', 'bottom', 'left'].includes(side)
}

export function isSides(
    sides: string | string[] | CommonOptions | Partial<CommonOptions> | undefined,
): sides is Side[] {
    if (Array.isArray(sides)) {
        return sides.every((side) => ['all', 'top', 'right', 'bottom', 'left'].includes(side))
    }

    if (typeof sides !== 'string') {
        return false
    }

    return sides.split(' ').every((side) => ['all', 'top', 'right', 'bottom', 'left'].includes(side))
}
