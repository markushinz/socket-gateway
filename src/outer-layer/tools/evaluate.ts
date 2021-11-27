import { Policy, Target } from '../../models'
import { load } from 'js-yaml'
import { readFileSync } from 'fs'

type Cache = {
    timestamp?: number;
    targets: Record<string, Target>;
}

function pathToRegex(path: string): RegExp{
    if (path === '*') {
        return /.*/
    }
    if (path.startsWith('^')) {
        return new RegExp(path)
    }
    return new RegExp(`^${path}$`)
}

export class EvaluateTool {
    cache: Cache
    constructor(public targets: string) {
        this.cache = {
            targets: {}
        }
    }

    get targetsParsed(): Record<string, Target> {
        try {
            const now = Date.now()
            if (!this.cache.timestamp || now - this.cache.timestamp > 60000) {
                const config = load(readFileSync(this.targets, 'utf8')) as {
                    targets: Record<string, Target>;
                }
                this.cache.targets = config.targets
                this.cache.timestamp = now
            }
            return this.cache.targets
        } catch (error) {
            console.error(error)
            return {}
        }
    }

    getTarget(host: string): Target | undefined {
        const casedHost = Object.keys(this.targetsParsed).find(key => key.toLowerCase() === host)
        return casedHost ? this.targetsParsed[casedHost] : undefined
    }

    evaluatePolicy(policy: Policy, testPath: string, method: string): boolean {
        if (policy === '*') {
            return true
        }
        for (const [policyPath, methods] of Object.entries(policy)) {
            if (pathToRegex(policyPath).test(testPath)) {
                return methods === '*' || methods.includes(method) || methods.includes('*')
            }
        }
        return false
    }
}
