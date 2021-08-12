const logger = require('logger');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

class ScreenshotService {

    static async takeWidgetScreenshot(id) {
        logger.debug('[ScreenshotService]: Taking screenshot');
        try {
            return await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/webshot/widget/${id}/thumbnail`,
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
