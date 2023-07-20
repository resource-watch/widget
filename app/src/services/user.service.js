const { RWAPIMicroservice } = require('rw-api-microservice-node');

class UserService {

    static async getUserById(userId, apiKey) {
        const body = await RWAPIMicroservice.requestToMicroservice({
            uri: `/auth/user/${userId}`,
            method: 'GET',
            json: true,
            version: false,
            headers: {
                'x-api-key': apiKey,
            }
        });
        return body.data;
    }

}

module.exports = UserService;
