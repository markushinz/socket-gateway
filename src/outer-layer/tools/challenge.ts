import { randomBytes, createVerify } from 'crypto';

export class ChallengeTool {
    pendingChallenges: Set<string>;

    constructor(public challengeValidity: number, public innerLayerPublicKey: string | Buffer) {
        this.pendingChallenges = new Set();
    }

    createChallenge(): Promise<string> {
        return new Promise((resolve, reject) => {
            randomBytes(256, (error, buffer) => {
                if (error) {
                    reject(error);
                } else {
                    const challenge = buffer.toString('hex');
                    this.pendingChallenges.add(challenge);
                    console.log(`Created challege "${challenge}".`);
                    setTimeout(() => {
                        if (this.pendingChallenges.has(challenge)) {
                            this.pendingChallenges.delete(challenge);
                            console.log(`Deleted challege "${challenge}".`);
                        }
                    }, this.challengeValidity);
                    resolve(challenge);
                }
            });
        });
    }

    verifyChallengeResponse(challenge: string, challengeResponse: string): boolean {
        if (this.pendingChallenges.has(challenge)) {
            this.pendingChallenges.delete(challenge);
            const verify = createVerify('SHA256');
            verify.update(challenge);
            verify.end();
            if (verify.verify(this.innerLayerPublicKey, Buffer.from(challengeResponse, 'hex'))) {
                console.log(`Challege "${challenge}" and challenge response "${challengeResponse}" sucessfully verified.`);
                return true;
            }
        } else {
            console.error(`Challege "${challenge}" is no pending challenge.`);
        }
        return false;
    }
}
