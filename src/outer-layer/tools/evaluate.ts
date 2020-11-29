import { getTargets, Target, Policy } from '../config';

export function evaluatePolicy(policy: Policy, path: string, method: string): boolean {
    const methods = policy[path] || policy['*'];
    if (methods) {
        return methods.includes(method) || methods.includes('*');
    }
    return false;
}

export function getTarget(host: string): Target | undefined {
    try {
        return getTargets()[host];
    } catch (error) {
        return undefined;
    }
}
