import { verify, decode } from 'jsonwebtoken'
import { v1 as uuid } from 'uuid'

import { JWTPayload } from '../../models'

export class ChallengeTool {
    private pendingChallenges: Set<string>

    constructor(public validity: number, public publicKey: string | Buffer) {
        this.pendingChallenges = new Set()
    }

    createChallenge(): string {
        const challenge = uuid()
        this.pendingChallenges.add(challenge)
        console.log(`Created challege "${challenge}".`)
        setTimeout(() => {
            if (this.pendingChallenges.has(challenge)) {
                this.pendingChallenges.delete(challenge)
                console.log(`Deleted challege "${challenge}".`)
            }
        }, this.validity)
        return challenge
    }

    verifyChallengeResponse(token: string): boolean {
        try {
            const payload = verify(token, this.publicKey, { algorithms: ['RS256'] }) as JWTPayload
            if (this.pendingChallenges.has(payload.challenge)) {
                console.log(`Challege "${payload.challenge}" sucessfully verified.`)
                return true
            } else {
                console.error(`Challege "${payload.challenge}" is no pending challenge.`)
                return false
            }
        } catch (err) {
            console.error(err)
            return false
        }
    }

    decodeChallengeResponse(token: string): JWTPayload {
        return decode(token) as JWTPayload
    }
}
