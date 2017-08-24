const logger = require('logger');
const ctRegisterMicroservice = require('ct-register-microservice-node');


class RelationshipsService {

    static async getRelationships(widgets) {
        logger.info(`Getting relationships of widgets: ${widgets}`);        
        for (let i = 0; i < widgets.length; i++) {
            try {
                const vocabularies = await ctRegisterMicroservice.requestToMicroservice({
                    uri: `/dataset/${widgets[i].dataset}/widget/${widgets[i]._id}/vocabulary`,
                    method: 'GET',
                    json: true
                });
                logger.debug('vocabularies', vocabularies);
                widgets[i].vocabulary = vocabularies.data;
            } catch (err) {
            }

        }

        return widgets;
    }

}

module.exports = RelationshipsService;
