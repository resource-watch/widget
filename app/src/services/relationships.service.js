const logger = require('logger');
const ctRegisterMicroservice = require('ct-register-microservice-node');


class RelationshipsService {

    static async getRelationships(widgets, includes) {
        logger.info(`Getting relationships of widgets: ${widgets}`);
        for (let i = 0; i < widgets.length; i++) {
            try {
                if (includes.indexOf('vocabulary') > -1) {
                    const vocabularies = await ctRegisterMicroservice.requestToMicroservice({
                        uri: `/dataset/${widgets[i].dataset}/widget/${widgets[i]._id}/vocabulary`,
                        method: 'GET',
                        json: true
                    });
                    widgets[i].vocabulary = vocabularies.data;
                }
                if (includes.indexOf('user') > -1) {
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
                        name: user.data[0].name,
                        email: user.data[0].email
                    };
                    logger.info('Widgets', widgets);
                }
                if (includes.indexOf('metadata') > -1) {
                    const metadata = await ctRegisterMicroservice.requestToMicroservice({
                        uri: `/dataset/${widgets[i].dataset}/widget/metadata/find-by-ids`,
                        method: 'POST',
                        json: true,
                        body: {
                            ids: [widgets[i].id]
                        }
                    });
                    widgets[i].metadata = metadata;
                }
            } catch (err) {
                logger.error(err);
            }
        }
        return widgets;
    }

}

module.exports = RelationshipsService;
