class DuplicatedWidget extends Error {

    constructor(message) {
        super(message);
        this.name = 'DuplicatedWidget';
        this.message = message;
    }

}

module.exports = DuplicatedWidget;
