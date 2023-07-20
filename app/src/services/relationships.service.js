const logger = require('logger');
const { RWAPIMicroservice } = require('rw-api-microservice-node');
const GetCollectionInvalidRequest = require('errors/getCollectionInvalidRequest.error');

const serializeObjToQuery = (obj) => Object.keys(obj).reduce((a, k) => {
    a.push(`${k}=${encodeURIComponent(obj[k])}`);
    return a;
}, []).join('&');

class RelationshipsService {

    /**
     * - Clones the query object
     * - Strips a few things that should not be passed over to other MSs
     * - Encodes query into a URL param format
     *
     * @param rawQuery
     * @returns {string}
     */
    static prepareAndFormatQuery(rawQuery) {
        const query = { ...rawQuery };

        const filterIncludesByEnv = query.filterIncludesByEnv ? query.filterIncludesByEnv : false;
        if (!filterIncludesByEnv) {
            delete query.env;
        }

        delete query.filterIncludesByEnv;
        delete query.includes;
        return serializeObjToQuery(query);
    }

    static appendUserFieldIfExists(userData, userObject, field) {
        if (userData[field]) userObject[field] = userData[field];
    }

    static formatWidgetOwner(userData, user) {
        const userObject = {};
        RelationshipsService.appendUserFieldIfExists(userData, userObject, 'name');
        RelationshipsService.appendUserFieldIfExists(userData, userObject, 'email');
        if (user && user.role === 'ADMIN') userObject.role = userData.role;
        return userObject;
    }

    static async getRelationships(widgets, includes, user, apiKey, query = {}) {
        logger.info(`Getting relationships of widgets: ${widgets}`);
        for (let i = 0; i < widgets.length; i++) {
            try {
                if (includes.indexOf('vocabulary') > -1) {
                    let uriQuery = RelationshipsService.prepareAndFormatQuery(query);
                    if (uriQuery.length > 0) {
                        uriQuery = `?${uriQuery}`;
                    }
                    const vocabularies = await RWAPIMicroservice.requestToMicroservice({
                        uri: `/v1/dataset/${widgets[i].dataset}/widget/${widgets[i]._id}/vocabulary${uriQuery}`,
                        method: 'GET',
                        json: true,
                        headers: {
                            'x-api-key': apiKey,
                        }
                    });
                    widgets[i].vocabulary = vocabularies.data;
                }
                if (includes.indexOf('user') > -1) {
                    const userData = await RWAPIMicroservice.requestToMicroservice({
                        uri: `/auth/user/find-by-ids`,
                        method: 'POST',
                        json: true,
                        body: {
                            ids: [widgets[i].userId]
                        },
                        version: false,
                        headers: {
                            'x-api-key': apiKey,
                        }
                    });

                    if (!userData.data[0]) {
                        logger.warn(`Tried to use find-by-ids to load info for user with id ${widgets[i].userId} but the following was returned: ${JSON.stringify(userData)}`);
                    } else {
                        widgets[i].user = RelationshipsService.formatWidgetOwner(userData.data[0], user);
                        logger.info('Widgets including user data', widgets.map((el) => el.toObject()));
                    }
                }
                if (includes.indexOf('metadata') > -1) {
                    const body = {
                        ids: [widgets[i].id],
                    };

                    if (query.env) {
                        body.env = query.env.split(',').map((elem) => elem.trim());
                    }
                    const metadata = await RWAPIMicroservice.requestToMicroservice({
                        uri: `/v1/dataset/${widgets[i].dataset}/widget/metadata/find-by-ids`,
                        method: 'POST',
                        json: true,
                        body,
                        headers: {
                            'x-api-key': apiKey,
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

    static async getCollections(ids, userId, apiKey) {
        logger.debug(`[RelationshipsService] getCollections for ids ${ids} and userID ${userId}.`);
        try {
            const result = await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/collection/find-by-ids`,
                method: 'POST',
                json: true,
                body: {
                    ids,
                    userId
                },
                headers: {
                    'x-api-key': apiKey,
                }
            });
            logger.debug(`[RelationshipsService] Result of getCollections: `, result);
            const collectionsWithWidgetResources = result.data
                .map((col) => col.attributes.resources.filter((res) => res.type === 'widget'));

            if (collectionsWithWidgetResources.length === 0) {
                return [];
            }

            return collectionsWithWidgetResources
                .reduce((pre, cur) => pre.concat(cur)).map((el) => el.id);
        } catch (e) {
            throw new GetCollectionInvalidRequest(e.message, e.statusCode || 500);
        }
    }

    static async getUsersWithRole(role, apiKey) {
        const body = await RWAPIMicroservice.requestToMicroservice({
            uri: `/auth/user/ids/${role}`,
            method: 'GET',
            json: true,
            version: false,
            headers: {
                'x-api-key': apiKey,
            }
        });
        logger.debug('User ids', body.data);
        return body.data;
    }

    static async getFavorites(app, userId, apiKey) {
        try {
            const result = await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/favourite/find-by-user`,
                method: 'POST',
                json: true,
                body: {
                    app,
                    userId
                },
                headers: {
                    'x-api-key': apiKey,
                }
            });
            logger.debug(result);
            return result.data.filter((fav) => fav.attributes.resourceType === 'widget').map((el) => el.attributes.resourceId);
        } catch (e) {
            throw new Error(e);
        }
    }

    static async getUsersInfoByIds(ids, apiKey) {
        logger.debug('Fetching all users\' information');
        const body = await RWAPIMicroservice.requestToMicroservice({
            uri: `/auth/user/find-by-ids`,
            method: 'POST',
            json: true,
            version: false,
            body: { ids },
            headers: {
                'x-api-key': apiKey,
            }
        });

        return body.data;
    }

}

module.exports = RelationshipsService;
