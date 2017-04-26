class WidgetValidator {
    static notEmptyString(property) {
        if (typeof property === 'string' && property.length > 0) {
            return true;
        }
        return false;
    }
    
    static async validateCreation(koaObj) {
        logger.info('Validating Widget Creation');
        koaObj.checkBody('name').notEmpty().check(name => WidgetValidator.notEmptyString(name), 'can not be empty');
        logger.debug(koaObj.errors);
        if (koaObj.errors) {
            logger.error('Error validating dataset creation');
            throw new DatasetNotValid(koaObj.errors);
        }
        return true;
    }
}

module.exports = WidgetValidator;
