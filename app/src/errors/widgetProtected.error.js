class WidgetProtected extends Error {

    constructor(message) {
        super(message);
        this.name = 'WidgetProtected';
        this.message = message;
    }

}

module.exports = WidgetProtected;
