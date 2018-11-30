const logger = require('logger');
const ctRegisterMicroservice = require('ct-register-microservice-node');

class ScreenshotService {

    static async takeWidgetScreenshot(widgetId) {
        logger.debug('[ScreenshotService]: Taking screenshot');
        try {
            return await ctRegisterMicroservice.requestToMicroservice({
                uri: `/webshot/widget/${widgetId}/thumbnail`,
                method: 'POST',
                json: true
            });
        } catch (e) {
            logger.error(`[ScreenshotService]: Error taking screenshot: ${e}`);
            throw new Error(e);
        }
    }

}

module.exports = ScreenshotService;
