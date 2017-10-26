const logger = require('logger');
const ctRegisterMicroservice = require('ct-register-microservice-node');


class RelationshipsService {

    static async getRelationships(widgets, includes) {
        logger.info(`Getting relationships of widgets: ${widgets}`);
        for (let i = 0; i < widgets.length; i++) {
            try {
                if (includes.indexOf('vocabulary')) {
                    const vocabularies = await ctRegisterMicroservice.requestToMicroservice({
                        uri: `/dataset/${widgets[i].dataset}/widget/${widgets[i]._id}/vocabulary`,
                        method: 'GET',
                        json: true
                    });
                    widgets[i].vocabulary = vocabularies.data;
                }
                if (includes.indexOf('user')) {
                    const user = await ctRegisterMicroservice.requestToMicroservice({
                        uri: `/auth/user/find-by-ids`,
                        method: 'POST',
                        json: true,
                        body: {
                            ids: [widgets[i].userId]
                        },
                        version: false
                    });
                    widgets[i].user = {
                        name: user.data[widgets[i].userId].name,
                        email: user.data[widgets[i].userId].email
                    };
                    logger.info('Widgets', widgets);
                }
            } catch (err) {
                logger.err(err);
            }
        }
        return widgets;
    }

}

module.exports = RelationshipsService;
