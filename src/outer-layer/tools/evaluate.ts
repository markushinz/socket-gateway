import Config from '../config'

import { Policy, Target } from '../../models'

export function evaluatePolicy(policy: Policy, path: string, method: string): boolean {
    const methods: string[] = policy[path] || policy['*']
    if (methods) {
        return methods.includes(method) || methods.includes('*')
    }
    return false
}

export function getTarget(host: string): Target | undefined {
    try {
        return Config.targets[host]
    } catch (error) {
        return undefined
    }
}
