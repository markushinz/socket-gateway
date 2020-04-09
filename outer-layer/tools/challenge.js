const crypto = require('crypto');

const config = require('../config');

const pendingChallenges = new Map();

const createChallenge = function () {
    return new Promise(function (resolve, reject) {
        crypto.randomBytes(256, (error, buffer) => {
            if (error) {
                reject(error);
            } else {
                const challenge = buffer.toString('hex');
                pendingChallenges.set(challenge, Date.now());
                setTimeout(() => {
                    if (pendingChallenges.has(challenge)) {
                        pendingChallenges.delete(challenge);
                    }
                }, 5000);
                resolve(challenge);
            }
        })
    });
}

const verifyChallengeResponse = function (challenge, challengeResponse) {
    if (pendingChallenges.has(challenge)) {
        pendingChallenges.delete(challenge);
        const verify = crypto.createVerify('SHA256');
        verify.update(challenge);
        verify.end();
        return verify.verify(config.innerLayerPublicKey, Buffer.from(challengeResponse, 'hex'));
    }
    return false;
}

module.exports = {
    createChallenge,
    verifyChallengeResponse
}
