const crypto = require('crypto');

const config = require('../config');

const pendingChallenges = new Set();

const createChallenge = function () {
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
                }, config.challengeValidity);
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
        if (verify.verify(config.innerLayerPublicKey, Buffer.from(challengeResponse, 'hex'))) {
            console.log(`Challege "${challenge}" and challenge response "${challengeResponse}" sucessfully verified.`);
            return true;
        }
    } else {
        console.error(`Challege "${challenge}" is no pending challenge.`);
    }
    return false;
}

module.exports = {
    createChallenge,
    verifyChallengeResponse
}
