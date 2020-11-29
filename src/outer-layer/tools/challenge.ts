import crypto from 'crypto';

import { challengeValidity, innerLayerPublicKey } from '../config';

const pendingChallenges = new Set();

export function createChallenge(): Promise<string> {
    return new Promise(function (resolve, reject) {
        crypto.randomBytes(256, (error, buffer) => {
            if (error) {
                reject(error);
            } else {
                const challenge = buffer.toString('hex');
                pendingChallenges.add(challenge);
                console.log(`Created challege "${challenge}".`);
                setTimeout(() => {
                    if (pendingChallenges.has(challenge)) {
                        pendingChallenges.delete(challenge);
                        console.log(`Deleted challege "${challenge}".`);
                    }
                }, challengeValidity);
                resolve(challenge);
            }
        });
    });
}

export function verifyChallengeResponse(challenge: string, challengeResponse: string): boolean {
    if (pendingChallenges.has(challenge)) {
        pendingChallenges.delete(challenge);
        const verify = crypto.createVerify('SHA256');
        verify.update(challenge);
        verify.end();
        if (verify.verify(innerLayerPublicKey, Buffer.from(challengeResponse, 'hex'))) {
            console.log(`Challege "${challenge}" and challenge response "${challengeResponse}" sucessfully verified.`);
            return true;
        }
    } else {
        console.error(`Challege "${challenge}" is no pending challenge.`);
    }
    return false;
}
