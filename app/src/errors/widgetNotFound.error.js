class WidgetNotFound extends Error {

    constructor(message) {
        super(message);
        this.name = 'WidgetNotFound';
        this.message = message;
    }

}

module.exports = WidgetNotFound;
