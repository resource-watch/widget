class GetCollectionInvalidRequest extends Error {

    constructor(message, statusCode) {
        super(message);
        this.name = 'GetCollectionInvalidRequest';
        this.message = message;
        this.statusCode = statusCode;
    }

}

module.exports = GetCollectionInvalidRequest;
