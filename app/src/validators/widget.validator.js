const logger = require('logger');
const WidgetNotValid = require('errors/widgetNotValid.error');

class WidgetValidator {

    static isString(val) {
        return typeof val === 'string' ? true : false;
    }
    static isBoolean(val) {
        return typeof val === 'boolean' ? true : false;
    }
    static isArray(val) {
        return val instanceof Array;
    }
    static isObject(val) {
        return (val instanceof Object && !(val instanceof Array));
    }

    static async validateWidgetCreation(koaObj) {
        logger.info('[WidgetValidator] Validating widget creation');
        koaObj.checkBody('name')
            .notEmpty()
            .notBlank()
            .check(v => WidgetValidator.isString(v), 'must be a string');
        koaObj.checkBody('dataset')
            .notEmpty()
            .notBlank()
            .check(v => WidgetValidator.isString(v), 'must be a string');
        koaObj.checkBody('description')
            .optional()
            .check(v => WidgetValidator.isString(v), 'must be a string');
        koaObj.checkBody('source')
            .optional()
            .check(v => WidgetValidator.isString(v), 'must be a string');
        koaObj.checkBody('sourceUrl')
            .optional()
            .isUrl();
        koaObj.checkBody('authors')
            .optional()
            .check(v => WidgetValidator.isString(v), 'must be a string');
        koaObj.checkBody('application')
            .notEmpty()
            .check(v => WidgetValidator.isArray(v), 'must be an array')
            .check(v => v.length !== 0, `can't be an empty array`);
        koaObj.checkBody('verified')
            .optional()
            .check(v => WidgetValidator.isBoolean(v), 'must be a boolean value');
        koaObj.checkBody('default')
            .optional()
            .check(v => WidgetValidator.isBoolean(v), 'must be a boolean value');
        koaObj.checkBody('defaultEditableWidget')
            .optional()
            .check(v => WidgetValidator.isBoolean(v), 'must be a boolean value');
        koaObj.checkBody('published')
            .optional()
            .check(v => WidgetValidator.isBoolean(v), 'must be a boolean value');
        koaObj.checkBody('queryUrl')
            .optional()
            .check(v => WidgetValidator.isString(v), 'must be a string');
        koaObj.checkBody('widgetConfig');
        koaObj.checkBody('template')
            .optional()
            .check(v => WidgetValidator.isBoolean(v), 'must be a boolean value');
        koaObj.checkBody('layerId')
            .optional()
            .isUUID();
        logger.debug(koaObj.errors);
        if (koaObj.errors) {
            logger.error('Error validating widget creation');
            throw new WidgetNotValid(koaObj.errors);
        }
        return true;
    }

    static async validateWidgetUpdate(koaObj) {
        logger.info('[WidgetValidator] Validating widget update');
        koaObj.checkBody('name')
            .optional()
            .check(v => WidgetValidator.isString(v), 'must be a string');
        koaObj.checkBody('dataset')
            .optional()
            .check(v => WidgetValidator.isString(v), 'must be a string');
        koaObj.checkBody('description')
            .optional()
            .check(v => WidgetValidator.isString(v), 'must be a string');
        koaObj.checkBody('source')
            .optional()
            .check(v => WidgetValidator.isString(v), 'must be a string');
        koaObj.checkBody('sourceUrl')
            .optional()
            .isUrl();
        koaObj.checkBody('authors')
            .optional()
            .check(v => WidgetValidator.isString(v), 'must be a string');
        koaObj.checkBody('application')
            .optional()
            .check(v => WidgetValidator.isArray(v), 'must be an array')
            .check(v => v.length != 0, `can't be an empty array`);
        koaObj.checkBody('verified')
            .optional()
            .check(v => WidgetValidator.isBoolean(v), 'must be a boolean value');
        koaObj.checkBody('default')
            .optional()
            .check(v => WidgetValidator.isBoolean(v), 'must be a boolean value');
        koaObj.checkBody('defaultEditableWidget')
            .optional()
            .check(v => WidgetValidator.isBoolean(v), 'must be a boolean value');
        koaObj.checkBody('published')
            .optional()
            .check(v => WidgetValidator.isBoolean(v), 'must be a boolean value');
        koaObj.checkBody('queryUrl')
            .optional()
            .check(v => WidgetValidator.isString(v), 'must be a string');
        koaObj.checkBody('widgetConfig');
        koaObj.checkBody('template')
            .optional()
            .check(v => WidgetValidator.isBoolean(v), 'must be a boolean value');
        koaObj.checkBody('layerId')
            .optional()
            .isUUID();
        logger.debug(koaObj.errors);
        if (koaObj.errors) {
            logger.error('Error validating widget creation');
            throw new WidgetNotValid(koaObj.errors);
        }
        return true;
    }

}

module.exports = WidgetValidator;
