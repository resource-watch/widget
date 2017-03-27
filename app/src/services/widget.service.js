const URL = require('url').URL;
const logger = require('logger');
const Widget = require('models/widget.model');

class WidgetService {
    static async create(dataset, user) {
        logger.debug(`[WidgetService]: Getting widget with name:  ${widget.name}`);
        logger.info(`[DBACCES-FIND]: widget.name: ${widget.name}`);
        logger.info(`[DBACCESS-SAVE]: widget.name: ${widget.name}`);
        let newWidget = await new Widget({
            name: widget.name,
        }).save();
        return newWidget;
    }
}
