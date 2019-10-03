const logger = require('logger');
const ctRegisterMicroservice = require('ct-register-microservice-node');


class RelationshipsService {

    static async getRelationships(widgets, includes, user) {
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
                    const userData = await ctRegisterMicroservice.requestToMicroservice({
                        uri: `/auth/user/find-by-ids`,
                        method: 'POST',
                        json: true,
                        body: {
                            ids: [widgets[i].userId]
                        },
                        version: false
                    });

                    if (!userData.data[0] || !userData.data[0].name || !userData.data[0].email) {
                        logger.warn(`Tried to use find-by-ids to load info for user with id ${widgets[i].userId} but the following was returned: ${JSON.stringify(user)}`);
                    } else {
                        widgets[i].user = {
                            name: userData.data[0].name,
                            email: userData.data[0].email
                        };
                        if (user && user.role === 'ADMIN') {
                            widgets[i].user.role = userData.data[0].role;
                        }

                        logger.info('Widgets including user data', widgets.map((el) => el.toObject()));
                    }
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
                    widgets[i].metadata = metadata.data;
                }
            } catch (err) {
                logger.error(err);
            }
        }
        return widgets;
    }

    static async getCollections(ids, userId) {
        try {
            const result = await ctRegisterMicroservice.requestToMicroservice({
                uri: `/collection/find-by-ids`,
                method: 'POST',
                json: true,
                body: {
                    ids,
                    userId
                }
            });
            logger.debug(result);
            return result.data.map((col) => col.attributes.resources.filter((res) => res.type === 'widget')).reduce((pre, cur) => pre.concat(cur)).map((el) => el.id);
        } catch (e) {
            throw new Error(e);
        }
    }

    static async getUsersWithRole(role) {
        const body = await ctRegisterMicroservice.requestToMicroservice({
            uri: `/auth/user/ids/${role}`,
            method: 'GET',
            json: true,
            version: false
        });
        logger.debug('User ids', body.data);
        return body.data;
    }

    static async getFavorites(app, userId) {
        try {
            const result = await ctRegisterMicroservice.requestToMicroservice({
                uri: `/favourite/find-by-user`,
                method: 'POST',
                json: true,
                body: {
                    app,
                    userId
                }
            });
            logger.debug(result);
            return result.data.filter((fav) => fav.attributes.resourceType === 'widget').map((el) => el.attributes.resourceId);
        } catch (e) {
            throw new Error(e);
        }
    }

}

module.exports = RelationshipsService;
