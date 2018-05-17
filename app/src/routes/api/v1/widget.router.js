const Router = require('koa-router');
const logger = require('logger');
const WidgetService = require('services/widget.service');
const DatasetService = require('services/dataset.service');
const RelationshipsService = require('services/relationships.service');
const WidgetSerializer = require('serializers/widget.serializer');
const WidgetValidator = require('validators/widget.validator');
const WidgetNotValid = require('errors/widgetNotValid.error');
const WidgetNotFound = require('errors/widgetNotFound.error');
const WidgetProtected = require('errors/widgetProtected.error');
const FastlyPurge = require('fastly-purge');
const validator = require('validator');
const router = new Router();
const USER_ROLES = require('app.constants').USER_ROLES;
const ctRegisterMicroservice = require('ct-register-microservice-node');

const serializeObjToQuery = (obj) => Object.keys(obj).reduce((a, k) => {
    a.push(`${k}=${encodeURIComponent(obj[k])}`);
    return a;
}, []).join('&');

class WidgetRouter {

    static getUser(ctx) {
        return Object.assign({}, ctx.request.query.loggedUser ? JSON.parse(ctx.request.query.loggedUser) : {}, ctx.request.body.loggedUser);
    }

    static async get(ctx) {
        try {
            const id = ctx.params.widget;
            const dataset = ctx.params.dataset;
            logger.info(`[WidgetRouter] Getting widget with id: ${id}`);
            const includes = ctx.query.includes ? ctx.query.includes.split(',').map(elem => elem.trim()) : [];
            const widget = await WidgetService.get(id, dataset, includes);
            const queryParams = Object.keys(ctx.query);
            if (queryParams.indexOf('loggedUser') !== -1) {
                queryParams.splice(queryParams.indexOf('loggedUser'), 1);
            }
            if (queryParams.indexOf('includes') !== -1) {
                queryParams.splice(queryParams.indexOf('includes'), 1);
            }
            if (queryParams.length > 0 && queryParams.indexOf('queryUrl') >= 0) {
                widget.queryUrl = ctx.query.queryUrl;
                if (widget.widgetConfig && widget.widgetConfig.data) {
                    if (Array.isArray() && widget.widgetConfig.data.length > 0 && widget.widgetConfig.data[0].url) {
                        widget.widgetConfig.data[0].url = ctx.query.queryUrl;
                    } else if (widget.widgetConfig.data.url) {
                        widget.widgetConfig.data.url = ctx.query.queryUrl;
                    }
                }
                if (widget.widgetConfig && widget.widgetConfig.data && widget.widgetConfig.data.length > 0 && widget.widgetConfig.data[0].url) {
                    widget.widgetConfig.data[0].url = ctx.query.queryUrl;
                }
                queryParams.splice(queryParams.indexOf('queryUrl'), 1);

            }
            if (queryParams.length > 0) {
                logger.debug(queryParams);
                let params = '';
                for (let i = 0; i < queryParams.length; i++) {
                    if (params !== '') {
                        params += '&';
                    }
                    params += `${queryParams[i]}=${ctx.query[queryParams[i]]}`;
                }
                if (widget.queryUrl) {
                    if (widget.queryUrl.indexOf('?') >= 0) {
                        widget.queryUrl += `&${params}`;
                    } else {
                        widget.queryUrl += `?${params}`;
                    }
                }

                if (widget.widgetConfig && widget.widgetConfig.data) {
                    if (Array.isArray(widget.widgetConfig.data) && widget.widgetConfig.data.length > 0 && widget.widgetConfig.data[0].url) {
                        if (widget.widgetConfig.data[0].url.indexOf('?') >= 0) {
                            widget.widgetConfig.data[0].url += `&${params}`;
                        } else {
                            widget.widgetConfig.data[0].url += `?${params}`;
                        }
                    } else if (widget.widgetConfig.data.url) {
                        if (widget.widgetConfig.data.url.indexOf('?') >= 0) {
                            widget.widgetConfig.data.url += `&${params}`;
                        } else {
                            widget.widgetConfig.data.url += `?${params}`;
                        }
                    }
                }
            }
            ctx.body = WidgetSerializer.serialize(widget);
        } catch (err) {
            throw err;
        }
    }

    static async create(ctx) {
        logger.info(`[WidgetRouter] Creating widget with name: ${ctx.request.body.name}`);
        try {
            const dataset = ctx.params.dataset;
            const user = WidgetRouter.getUser(ctx);
            const widget = await WidgetService.create(ctx.request.body, dataset, ctx.state.dataset, user);
	    const widgetId = widget.dataset;
	    var uncache = ['widget', 'dataset-widget'];
	    if (widget.dataset) {
		uncache.push(`${widget.dataset}-widget-all`);
	    }
	    ctx.set('uncache', uncache.join(" "));
            ctx.body = WidgetSerializer.serialize(widget);
        } catch (err) {
            throw err;
        }
    }

    static async delete(ctx) {
        const id = ctx.params.widget;
        logger.info(`[WidgetRouter] Deleting widget with id: ${id}`);
        try {
            const dataset = ctx.params.dataset;
            const widget = await WidgetService.delete(id, dataset);
            ctx.body = WidgetSerializer.serialize(widget);
        } catch (err) {
            if (err instanceof WidgetProtected) {
                ctx.throw(400, err.message);
                return;
            }
            if (err instanceof WidgetNotFound) {
                ctx.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

    static async deleteByDataset(ctx) {
        const id = ctx.params.dataset;
        logger.info(`[WidgetRouter] Deleting widgets of dataset with id: ${id}`);
        try {
            const widget = await WidgetService.deleteByDataset(id);
            ctx.body = WidgetSerializer.serialize(widget);
        } catch (err) {
            throw err;
        }
    }

    static async getAll(ctx) {
        const query = ctx.query;
        const dataset = ctx.params.dataset || null;
        const userId = ctx.query.loggedUser && ctx.query.loggedUser !== 'null' ? JSON.parse(ctx.query.loggedUser).id : null;
        delete query.loggedUser;
        if (Object.keys(query).find(el => el.indexOf('collection') >= 0)) {
            if (!userId) {
                ctx.throw(403, 'Collection filter not authorized');
                return;
            }
            logger.debug('Obtaining collections', userId);
            ctx.query.ids = await RelationshipsService.getCollections(ctx.query.collection, userId);
            ctx.query.ids = ctx.query.ids.length > 0 ? ctx.query.ids.join(',') : '';
            logger.debug('Ids from collections', ctx.query.ids);
        }
        if (Object.keys(query).find(el => el.indexOf('favourite') >= 0)) {
            if (!userId) {
                ctx.throw(403, 'Fav filter not authorized');
                return;
            }
            const app = ctx.query.app || ctx.query.application || 'rw';
            ctx.query.ids = await RelationshipsService.getFavorites(app, userId);
            ctx.query.ids = ctx.query.ids.length > 0 ? ctx.query.ids.join(',') : '';
            logger.debug('Ids from collections', ctx.query.ids);
        }
        const widgets = await WidgetService.getAll(query, dataset);
        const clonedQuery = Object.assign({}, query);
        delete clonedQuery['page[size]'];
        delete clonedQuery['page[number]'];
        delete clonedQuery.ids;
        delete clonedQuery.dataset;
        const serializedQuery = serializeObjToQuery(clonedQuery) ? `?${serializeObjToQuery(clonedQuery)}&` : '?';
        const apiVersion = ctx.mountPath.split('/')[ctx.mountPath.split('/').length - 1];
        const link = `${ctx.request.protocol}://${ctx.request.host}/${apiVersion}${ctx.request.path}${serializedQuery}`;
        logger.debug(`[WidgetRouter] widgets: ${JSON.stringify(widgets)}`);
        ctx.body = WidgetSerializer.serialize(widgets, link);

	var caches = ['widget'];
	if (dataset) {
	    caches.push(`${dataset}-widget-all`);
	}
	
	ctx.set('cache', caches.join(" "));
    }

    static async update(ctx) {
        const id = ctx.params.widget;
        logger.info(`[WidgetRouter] Updating widget with id: ${id}`);
        const dataset = ctx.params.dataset || null;
        try {
            const user = WidgetRouter.getUser(ctx);
            const widget = await WidgetService.update(id, ctx.request.body, user, dataset);
            try {
                if (process.env.FASTLY_APIKEY) {
                    const fastlyPurge = new FastlyPurge(process.env.FASTLY_APIKEY);
                    const SERVICE_ID = process.env.FASTLY_SERVICEID;
                    await new Promise((resolve, reject) => {
                        fastlyPurge.key(SERVICE_ID, `widget-${id}`, (err) => {
                            if (err) {
                                logger.error('Error purging', err);
                                reject();
                            }
                            resolve();
                        });
                    });
                }
            } catch (e) {
                logger.error(e);
            }
            ctx.body = WidgetSerializer.serialize(widget);
        } catch (err) {
            throw err;
        }
    }

    static async getByIds(ctx) {
        if (ctx.request.body.widget) {
            ctx.request.body.ids = ctx.request.body.widget.ids;
        }
        if (!ctx.request.body.ids) {
            ctx.throw(400, 'Bad request');
            return;
        }
        logger.info(`[WidgetRouter] Getting widgets for datasets with id: ${ctx.request.body.ids}`);
        const resource = {
            ids: ctx.request.body.ids,
            app: ctx.request.body.app
        };
        if (typeof resource.ids === 'string') {
            resource.ids = resource.ids.split(',').map((elem) => elem.trim());
        }
        const result = await WidgetService.getByDataset(resource);
        ctx.body = WidgetSerializer.serialize(result);
    }

    static async updateEnvironment(ctx) {
        logger.info('Updating enviroment of all widgets with dataset ', ctx.params.dataset, ' to environment', ctx.params.env);
        await WidgetService.updateEnvironment(ctx.params.dataset, ctx.params.env);
        ctx.body = '';
    }
};

const validationMiddleware = async(ctx, next) => {
    logger.info(`[WidgetRouter] Validating the widget`);
    if (ctx.request.body.widget) {
        ctx.request.body = Object.assign(ctx.request.body, ctx.request.body.widget);
        delete ctx.request.body.widget;
    }

    if (ctx.params.dataset) {
        ctx.request.body.dataset = ctx.params.dataset;
    }

    // Removing null values for proper validation
    const widgetKeys = Object.keys(ctx.request.body);
    widgetKeys.forEach((key) => {
        if (ctx.request.body[key] == null) {
            delete ctx.request.body[key];
        }
    });

    try {

        const newWidget = ctx.request.method === 'POST';
        if (newWidget) {
            await WidgetValidator.validateWidgetCreation(ctx);
        } else {
            await WidgetValidator.validateWidgetUpdate(ctx);
        }
    } catch (err) {
        if (err instanceof WidgetNotValid) {
            ctx.throw(400, err.getMessages());
            return;
        }
        throw err;
    }


    await next();
};

const datasetValidationMiddleware = async(ctx, next) => {
    logger.info(`[WidgetRouter] Validating dataset presence`);
    //
    try {
        ctx.state.dataset = await DatasetService.checkDataset(ctx);
    } catch (err) {
        ctx.throw(err.statusCode, 'Dataset not found');
    }
    await next();
};

const isMicroserviceMiddleware = async(ctx, next) => {
    logger.debug('Checking if is a microservice');
    const user = WidgetRouter.getUser(ctx);
    if (!user || user.id !== 'microservice') {
        ctx.throw(401, 'Not authorized');
        return;
    }
    await next();
};

const authorizationMiddleware = async(ctx, next) => {
    logger.info(`[WidgetRouter] Checking authorization`);
    // Get user from query (delete) or body (post-patch)
    const newWidgetCreation = ctx.request.path.includes('widget') && ctx.request.method === 'POST' && !(ctx.request.path.includes('find-by-ids'));
    const newWidgetUpdate = ctx.request.path.includes('widget') && ctx.request.method === 'PATCH';
    const user = WidgetRouter.getUser(ctx);
    if (user.id === 'microservice') {
        await next();
        return;
    }
    if (!user || USER_ROLES.indexOf(user.role) === -1) {
        ctx.throw(401, 'Unauthorized'); // if not logged or invalid ROLE -> out
        return;
    }
    if (user.role === 'USER') {
        if (!newWidgetCreation && !newWidgetUpdate) {
            ctx.throw(403, 'Forbidden'); // if user is USER -> out
            return;
        }
        if (newWidgetUpdate) {
            try {
                const permission = await WidgetService.hasPermission(ctx.params.widget, user);
                if (!permission) {
                    ctx.throw(403, 'Forbidden');
                    return;
                }
            } catch (err) {
                throw err;
            }
        }
    }
    const application = ctx.request.query.application ? ctx.request.query.application : ctx.request.body.application;
    if (application) {
        const appPermission = application.find(app =>
            user.extraUserData.apps.find(userApp => userApp === app)
        );
        if (!appPermission) {
            ctx.throw(403, 'Forbidden'); // if manager or admin but no application -> out
            return;
        }
    }
    const allowedOperations = newWidgetCreation;
    if ((user.role === 'MANAGER' || user.role === 'ADMIN') && !allowedOperations) {
        try {
            const permission = await WidgetService.hasPermission(ctx.params.widget, user);
            if (!permission) {
                ctx.throw(403, 'Forbidden');
                return;
            }
        } catch (err) {
            throw err;
        }
    }
    await next(); // SUPERADMIN is included here
};


const isMicroservice = async function (ctx, next) {
    logger.debug('Checking if the call is from a microservice');
    if (ctx.request.body && ctx.request.body.loggedUser && ctx.request.body.loggedUser.id === 'microservice') {
        await next();
    } else {
        ctx.throw(403, 'Not authorized');
    }
};

const cacheMiddleware = async function (ctx, next) {
    logger.info('[WidgetRouter] Uncaching endpoints');
    const widgetId = ctx.params.widget;
    const widget = await WidgetService.get(widgetId);
    const widgetSlug = widget.slug;
    const datasetId = widget.dataset;
    const dataset = await ctRegisterMicroservice.requestToMicroservice({
        uri: `/dataset/${datasetId}`,
        method: 'GET',
        json: true
    });

    const datasetSlug = dataset.data.attributes.slug;
    const includes = ctx.query.includes ? ctx.query.includes.split(',').map(elem => elem.trim()) : [];
    const includesFragment = includes.length > 0 ? 
	  includes.map(include => `${widgetId}-${include}-all`).join(" ")
	  : "";

    const method = ctx.request.method;
    switch(method) {
    case 'GET':
	ctx.set('cache', [widgetId, widgetSlug, includesFragment].join(" "));
	break;
    // case 'POST':
    // 	ctx.set('uncache', `widget dataset-widget`);
    // 	break;
    case 'PATCH':
 	ctx.set('uncache', ['widget', widgetId, widgetSlug, 'dataset-widget', `${datasetId}-widget-all`, `${datasetSlug}-widget-all`].join(" "));
	break;
    case 'DELETE':
	ctx.set('uncache', ['widget', widgetId, widgetSlug, 'dataset-widget', `${datasetId}-widget-all`, `${datasetSlug}-widget-all`].join(" "));
	break;
    }
    
    await next();
};

// Declaring the routes
// Index
router.get('/widget', WidgetRouter.getAll);
router.get('/dataset/:dataset/widget', datasetValidationMiddleware, WidgetRouter.getAll);
// Create
router.post('/widget', datasetValidationMiddleware, validationMiddleware, authorizationMiddleware, WidgetRouter.create);
router.post('/dataset/:dataset/widget/', datasetValidationMiddleware, validationMiddleware, authorizationMiddleware,  WidgetRouter.create);
// Read
router.get('/widget/:widget', datasetValidationMiddleware, cacheMiddleware, WidgetRouter.get);
router.get('/dataset/:dataset/widget/:widget', datasetValidationMiddleware, cacheMiddleware, WidgetRouter.get);
// Update
router.patch('/widget/:widget', datasetValidationMiddleware, validationMiddleware, authorizationMiddleware, cacheMiddleware, WidgetRouter.update);
router.patch('/dataset/:dataset/widget/:widget', datasetValidationMiddleware, validationMiddleware, authorizationMiddleware, cacheMiddleware, WidgetRouter.update);
// Delete
router.delete('/widget/:widget', authorizationMiddleware, cacheMiddleware, WidgetRouter.delete);
router.delete('/dataset/:dataset/widget/:widget', datasetValidationMiddleware, authorizationMiddleware, cacheMiddleware, WidgetRouter.delete);
router.delete('/dataset/:dataset/widget', isMicroserviceMiddleware, WidgetRouter.deleteByDataset);
// Get by IDs
router.post('/widget/find-by-ids', WidgetRouter.getByIds);
router.patch('/widget/change-environment/:dataset/:env', isMicroservice, WidgetRouter.updateEnvironment);
module.exports = router;
