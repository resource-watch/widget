const URL = require('url').URL;
const logger = require('logger');
const Widget = require('models/widget.model');
const WidgetNotFound = require('errors/widgetNotFound.error');

class WidgetService {
    static async create(widget) {
        logger.debug(`[WidgetService]: Creating widget with name:  ${widget.name}`);
        logger.info(`[DBACCES-FIND]: widget.name: ${widget.name}`);
        logger.info(`[DBACCESS-SAVE]: widget.name: ${widget.name}`);
        let newWidget = await new Widget({
            name: widget.name
        }).save();
        return newWidget;
    }

    static async get(id) {
	logger.debug(`[WidgetService]: Getting widget with id: ${id}`);
	let widget = await Widget.findById(id).exec();
	if (!widget) {
	    logger.error(`[WidgetService]: Widget not found with the id ${id}`);
	    throw new WidgetNotFound(`Widget not found with the id ${id}`);
	}
	return widget;
    }
}

module.exports = WidgetService;
