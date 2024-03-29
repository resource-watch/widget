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
const WidgetModel = require('models/widget.model');
const { USER_ROLES } = require('app.constants');
const GetCollectionInvalidRequest = require('errors/getCollectionInvalidRequest.error');
const UserService = require('../../../services/user.service');

const router = new Router();

const serializeObjToQuery = (obj) => Object.keys(obj).reduce((a, k) => {
    a.push(`${k}=${encodeURIComponent(obj[k])}`);
    return a;
}, []).join('&');

const getHostForPaginationLink = (ctx) => {
    if ('x-rw-domain' in ctx.request.header) {
        return ctx.request.header['x-rw-domain'];
    }
    if ('referer' in ctx.request.header) {
        const url = new URL(ctx.request.header.referer);
        return url.host;
    }
    return ctx.request.host;
};

class WidgetRouter {

    static getUser(ctx) {
        return { ...(ctx.request.query.loggedUser ? JSON.parse(ctx.request.query.loggedUser) : {}), ...ctx.request.body.loggedUser };
    }

    static async get(ctx) {
        const id = ctx.params.widget;
        const { query } = ctx;
        const { dataset } = ctx.params;
        const user = query.loggedUser && query.loggedUser !== 'null' ? JSON.parse(query.loggedUser) : null;
        logger.info(`[WidgetRouter] Getting widget with id: ${id}`);
        const includes = query.includes ? query.includes.split(',').map((elem) => elem.trim()) : [];
        const widget = await WidgetService.get(id, dataset, ctx.request.headers['x-api-key'], includes, user);
        const queryParams = Object.keys(query);
        if (queryParams.indexOf('loggedUser') !== -1) {
            queryParams.splice(queryParams.indexOf('loggedUser'), 1);
        }
        if (queryParams.indexOf('includes') !== -1) {
            queryParams.splice(queryParams.indexOf('includes'), 1);
        }
        if (queryParams.length > 0 && queryParams.indexOf('queryUrl') >= 0) {
            widget.queryUrl = query.queryUrl;
            if (widget.widgetConfig && widget.widgetConfig.data) {
                if (Array.isArray(widget.widgetConfig.data) && widget.widgetConfig.data.length > 0 && widget.widgetConfig.data[0].url) {
                    widget.widgetConfig.data[0].url = query.queryUrl;
                } else if (widget.widgetConfig.data.url) {
                    widget.widgetConfig.data.url = query.queryUrl;
                }
            }
            if (widget.widgetConfig && widget.widgetConfig.data && widget.widgetConfig.data.length > 0 && widget.widgetConfig.data[0].url) {
                widget.widgetConfig.data[0].url = query.queryUrl;
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
                params += `${queryParams[i]}=${query[queryParams[i]]}`;
            }
            if (widget.queryUrl) {
                if (widget.queryUrl.indexOf('?') >= 0) {
                    widget.queryUrl += `&${params}`;
                } else {
                    widget.queryUrl += `?${params}`;
                }
            }

            if (widget.widgetConfig && widget.widgetConfig.data) {
                if (Array.isArray(widget.widgetConfig.data) && widget.widgetConfig.data.length > 0 && widget.widgetConfig.data[0].url) {
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
        const cache = [id, widget.slug];
        if (includes) {
            includes.forEach((inc) => {
                cache.push(`${id}-${inc}`);
                cache.push(`${widget.slug}-${inc}`);
            });
        }
        ctx.set('cache', cache.join(' '));
    }

    static async create(ctx) {
        logger.info(`[WidgetRouter] Creating widget with name: ${ctx.request.body.name}`);
        const { dataset } = ctx.params;
        const user = WidgetRouter.getUser(ctx);
        const widget = await WidgetService.create(ctx.request.body, dataset, ctx.state.dataset, user.id, ctx.request.headers['x-api-key']);
        ctx.set('uncache', ['widget', `${ctx.state.dataset.id}-widget`, `${ctx.state.dataset.slug}-widget`, `${ctx.state.dataset.id}-widget-all`]);
        ctx.body = WidgetSerializer.serialize(widget);
    }

    static async clone(ctx) {
        logger.info(`[WidgetRouter] Cloning widget with id: ${ctx.request.body.name}`);
        logger.debug(`[WidgetRouter] Params in body: ${JSON.stringify(ctx.request.body, null, 4)}`);
        const id = ctx.params.widget;
        const user = WidgetRouter.getUser(ctx);
        let clonedWidgetUserId;
        if (user && user.id === 'microservice' && ctx.request.body.userId) {
            clonedWidgetUserId = ctx.request.body.userId;
        } else {
            clonedWidgetUserId = user.id;
        }
        const widget = await WidgetService.clone(id, ctx.request.body, clonedWidgetUserId, ctx.request.headers['x-api-key']);
        ctx.body = WidgetSerializer.serialize(widget);
    }

    static async delete(ctx) {
        const id = ctx.params.widget;
        logger.info(`[WidgetRouter] Deleting widget with id: ${id}`);
        try {
            let { dataset } = ctx.params;
            const widget = await WidgetService.delete(id, dataset, ctx.request.headers['x-api-key']);
            if (!ctx.state.dataset) {
                dataset = await DatasetService.getDataset(widget.dataset, ctx.request.headers['x-api-key']);
                ctx.state.dataset = dataset;
            }
            ctx.body = WidgetSerializer.serialize(widget);
            ctx.set('uncache', ['widget', id, widget.slug, `${widget.dataset}-widget`, `${ctx.state.dataset.slug}-widget`, `${ctx.state.dataset.id}-widget-all`]);
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
        const widgets = await WidgetService.deleteByDataset(id, ctx.request.headers['x-api-key']);
        ctx.body = WidgetSerializer.serialize(widgets);
        const uncache = ['widget', `${ctx.params.dataset}-widget`, `${ctx.state.dataset.slug}-widget`, `${ctx.state.dataset.id}-widget-all`];
        if (widgets) {
            widgets.forEach((widget) => {
                uncache.push(widget._id);
                uncache.push(widget.slug);
            });
        }
        ctx.set('uncache', uncache.join(' '));
    }

    static async deleteByUserId(ctx) {
        const userIdToDelete = ctx.params.userId;

        try {
            await UserService.getUserById(userIdToDelete, ctx.request.headers['x-api-key']);
        } catch (error) {
            ctx.throw(404, `User ${userIdToDelete} does not exist`);
        }

        logger.info(`[WidgetRouter] Deleting all widget for user with id: ${userIdToDelete}`);
        try {
            const widgets = await WidgetService.deleteByUserId(userIdToDelete, ctx.request.headers['x-api-key']);
            ctx.body = {
                deletedWidgets: WidgetSerializer.serialize(widgets.deletedWidgets).data
            };

            if (widgets.protectedWidgets) {
                ctx.body.protectedWidgets = WidgetSerializer.serialize(widgets.protectedWidgets).data;
            }
        } catch (err) {
            logger.error(`Error deleting widgets from user ${userIdToDelete}`, err);
            ctx.throw(500, `Error deleting widgets from user ${userIdToDelete}`);
        }
    }

    static async getAll(ctx) {
        const { query } = ctx;
        const dataset = ctx.params.dataset || null;
        const user = query.loggedUser && query.loggedUser !== 'null' ? JSON.parse(query.loggedUser) : null;
        const userId = user ? user.id : null;
        const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(user && user.role);
        delete query.loggedUser;

        if (query.sort && (query.sort.includes('user.role') || query.sort.includes('user.name'))) {
            logger.debug('Detected sorting by user role or name');
            if (!user || !isAdmin) {
                ctx.throw(403, 'Sorting by user name or role not authorized.');
                return;
            }

            // Reset all datasets' sorting columns
            await WidgetModel.updateMany({}, { userRole: '', userName: '' });

            // Fetch info to sort again
            const ids = await WidgetService.getAllWidgetsUserIds();
            const users = await RelationshipsService.getUsersInfoByIds(ids, ctx.request.headers['x-api-key']);
            await Promise.all(users.map((u) => WidgetModel.updateMany(
                { userId: u._id },
                {
                    userRole: u.role ? u.role.toLowerCase() : '',
                    userName: u.name ? u.name.toLowerCase() : '',
                },
            )));
        }

        /**
         * We'll want to limit the maximum page size in the future
         * However, as this will cause a production BC break, we can't enforce it just now
         */
        // if (query['page[size]'] && query['page[size]'] > 100) {
        //     ctx.throw(400, 'Invalid page size');
        // }

        if (Object.keys(query).find((el) => el.indexOf('collection') >= 0)) {
            if (!userId) {
                ctx.throw(403, 'Collection filter not authorized');
                return;
            }
            logger.debug('Obtaining collections', userId);
            try {
                query.ids = await RelationshipsService.getCollections(query.collection, userId, ctx.request.headers['x-api-key']);
            } catch (e) {
                if (e instanceof GetCollectionInvalidRequest) {
                    ctx.throw(e.statusCode, `Error loading associated collection: ${e.message}`);
                } else {
                    ctx.throw(500, 'Error loading collection');
                }
                return;
            }

            query.ids = query.ids.length > 0 ? query.ids.join(',') : '';
            logger.debug('Ids from collections', query.ids);
        }
        if (Object.keys(query).find((el) => el.indexOf('user.role') >= 0) && isAdmin) {
            logger.debug('Obtaining users with role');
            query.usersRole = await RelationshipsService.getUsersWithRole(query['user.role'], ctx.request.headers['x-api-key']);
            logger.debug('Ids from users with role', query.usersRole);
        }
        if (Object.keys(query).find((el) => el.indexOf('favourite') >= 0)) {
            if (!userId) {
                ctx.throw(403, 'Fav filter not authorized');
                return;
            }
            const app = query.app || query.application || 'rw';
            query.ids = await RelationshipsService.getFavorites(app, userId, ctx.request.headers['x-api-key']);
            query.ids = query.ids.length > 0 ? query.ids.join(',') : '';
            logger.debug('Ids from collections', query.ids);
        }
        const widgets = await WidgetService.getAll(user, ctx.request.headers['x-api-key'], query, dataset);
        const clonedQuery = { ...query };
        delete clonedQuery['page[size]'];
        delete clonedQuery['page[number]'];
        delete clonedQuery.ids;
        delete clonedQuery.dataset;
        delete clonedQuery.usersRole;
        const serializedQuery = serializeObjToQuery(clonedQuery) ? `?${serializeObjToQuery(clonedQuery)}&` : '?';
        const apiVersion = ctx.mountPath.split('/')[ctx.mountPath.split('/').length - 1];
        const link = `${ctx.request.protocol}://${getHostForPaginationLink(ctx)}/${apiVersion}${ctx.request.path}${serializedQuery}`;
        logger.debug(`[WidgetRouter] widgets: ${JSON.stringify(widgets)}`);
        ctx.body = WidgetSerializer.serialize(widgets, link);

        const includes = query.includes ? query.includes.split(',').map((elem) => elem.trim()) : [];
        const cache = ['widget'];
        if (ctx.params.dataset) {
            cache.push(`${ctx.params.dataset}-widget-all`);
        }
        if (includes) {
            includes.forEach((inc) => {
                cache.push(`widget-${inc}`);
                if (ctx.params.dataset) {
                    cache.push(`${ctx.params.dataset}-widget-all-${inc}`);
                }
            });
        }
        ctx.set('cache', cache.join(' '));
    }

    static async update(ctx) {
        const id = ctx.params.widget;
        logger.info(`[WidgetRouter] Updating widget with id: ${id}`);
        const widget = await WidgetService.update(id, ctx.request.body, ctx.request.headers['x-api-key']);
        ctx.body = WidgetSerializer.serialize(widget);
        ctx.set('uncache', ['widget', id, widget.slug, `${widget.dataset}-widget`, `${ctx.state.dataset.slug}-widget`, `${ctx.state.dataset.id}-widget-all`]);
    }

    static async findByIds(ctx) {
        const { request } = ctx;
        const { body } = request;
        if (body.widget) {
            body.ids = body.widget.ids;
        }
        logger.info(`[WidgetRouter] Getting widgets for datasets with id: ${body.ids}`);
        const resource = {
            ids: body.ids,
            app: body.app,
            env: body.env
        };
        if (typeof resource.ids === 'string') {
            resource.ids = resource.ids.split(',').map((elem) => elem.trim());
        }
        if (typeof resource.env === 'string') {
            resource.env = resource.env.split(',').map((elem) => elem.trim());
        }
        const result = await WidgetService.getByDataset(resource);
        ctx.body = WidgetSerializer.serialize(result);
    }

    static async updateEnvironment(ctx) {
        logger.info('Updating environment of all widgets with dataset ', ctx.params.dataset, ' to environment', ctx.params.env);
        const widgets = await WidgetService.updateEnvironment(ctx.params.dataset, ctx.params.env);
        const uncache = ['widget', `${ctx.params.dataset}-widget`, `${ctx.state.dataset.slug}-widget`, 'dataset-widget'];
        if (widgets) {
            widgets.forEach((widget) => {
                uncache.push(widget._id);
                uncache.push(widget.slug);
            });
        }
        ctx.set('uncache', uncache.join(' '));
        ctx.body = '';
    }

}

const validationMiddleware = async (ctx, next) => {
    logger.debug(`[WidgetRouter] Validating the widget`);
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

const findByIdValidationMiddleware = async (ctx, next) => {
    logger.debug(`[WidgetRouter] Validating find by id`);
    try {
        await WidgetValidator.validateFindById(ctx);
    } catch (err) {
        if (err instanceof WidgetNotValid) {
            ctx.throw(400, err.getMessages());
            return;
        }
        throw err;
    }

    await next();
};

const datasetValidationMiddleware = async (ctx, next) => {
    logger.debug(`[WidgetRouter] Validating dataset presence`);
    //
    try {
        ctx.state.dataset = await DatasetService.checkDataset(ctx);
    } catch (err) {
        ctx.throw(err.statusCode || 404, 'Dataset not found');
    }
    await next();
};

const getDatasetForWidgetMiddleware = async (ctx, next) => {
    logger.debug(`[WidgetRouter] Get dataset for the widget`);

    if (ctx.request.body.dataset) {
        await next();
        return;
    }

    const widgetId = ctx.params.widget;
    try {
        const widget = await WidgetService.get(widgetId, null, ctx.request.headers['x-api-key']);
        if (widget && widget.dataset) {
            ctx.request.body.dataset = widget.dataset;
        }
    } catch (err) {
        logger.warn('Tried to load a dataset from a widgetId but failed', err);
    }
    await next();
};

const isMicroserviceMiddleware = async (ctx, next) => {
    logger.debug('Checking if is a microservice');
    const user = WidgetRouter.getUser(ctx);
    if (!user || user.id !== 'microservice') {
        ctx.throw(401, 'Not authorized');
        return;
    }
    await next();
};

const authorizationMiddleware = async (ctx, next) => {
    logger.debug(`[WidgetRouter] Checking authorization`);
    // Get user from query (delete) or body (post-patch)
    const newWidgetCreation = ctx.request.path.includes('widget') && ctx.request.method === 'POST' && !(ctx.request.path.includes('find-by-ids'));
    const newWidgetUpdate = ctx.request.path.includes('widget') && ctx.request.method === 'PATCH';
    const newWidgetClone = ctx.request.path.match(/clone$/) && ctx.request.method === 'POST';
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
        if (newWidgetUpdate || newWidgetClone) {
            const permission = await WidgetService.hasPermission(ctx.params.widget, user, ctx.request.headers['x-api-key']);
            if (!permission) {
                ctx.throw(403, 'Forbidden');
                return;
            }
        }
    }
    const application = ctx.request.query.application ? ctx.request.query.application : ctx.request.body.application;
    if (application) {
        const appPermission = application.find((app) => user.extraUserData.apps.find((userApp) => userApp === app));
        if (!appPermission) {
            ctx.throw(403, 'Forbidden'); // if manager or admin but no application -> out
            return;
        }
    }
    if ((user.role === 'MANAGER' || user.role === 'ADMIN') && !newWidgetCreation) {
        const permission = await WidgetService.hasPermission(ctx.params.widget, user, ctx.request.headers['x-api-key']);
        if (!permission) {
            ctx.throw(403, 'Forbidden');
            return;
        }
    }
    await next(); // SUPERADMIN is included here
};

const isMicroservice = async (ctx, next) => {
    logger.debug('Checking if the call is from a microservice');
    if (ctx.request.body && ctx.request.body.loggedUser && ctx.request.body.loggedUser.id === 'microservice') {
        await next();
    } else {
        ctx.throw(403, 'Not authorized');
    }
};

const isAuthenticatedMiddleware = async (ctx, next) => {
    logger.debug(`Verifying if user is authenticated`);

    const user = WidgetRouter.getUser(ctx);

    if (!user || !user.id) {
        ctx.throw(401, 'Unauthorized');
        return;
    }
    await next();
};

const deleteResourceAuthorizationMiddleware = async (ctx, next) => {
    logger.debug(`[WidgetRouter] Checking authorization`);
    const user = WidgetRouter.getUser(ctx);
    const userFromParam = ctx.params.userId;

    if (user.id === 'microservice' || user.role === 'ADMIN') {
        await next();
        return;
    }

    if (userFromParam === user.id) {
        await next();
        return;
    }

    ctx.throw(403, 'Forbidden');
};

// Declaring the routes
// Index
router.get('/widget', WidgetRouter.getAll);
router.get('/dataset/:dataset/widget', datasetValidationMiddleware, WidgetRouter.getAll);
// Create
router.post('/widget', datasetValidationMiddleware, validationMiddleware, authorizationMiddleware, WidgetRouter.create);
router.post('/dataset/:dataset/widget/', datasetValidationMiddleware, validationMiddleware, authorizationMiddleware, WidgetRouter.create);
// Read
router.get('/widget/:widget', datasetValidationMiddleware, WidgetRouter.get);
router.get('/dataset/:dataset/widget/:widget', datasetValidationMiddleware, WidgetRouter.get);
// Update
router.patch('/widget/:widget', getDatasetForWidgetMiddleware, datasetValidationMiddleware, validationMiddleware, authorizationMiddleware, WidgetRouter.update);
router.patch('/dataset/:dataset/widget/:widget', datasetValidationMiddleware, validationMiddleware, authorizationMiddleware, WidgetRouter.update);
// Delete
router.delete('/widget/by-user/:userId', isAuthenticatedMiddleware, deleteResourceAuthorizationMiddleware, WidgetRouter.deleteByUserId);
router.delete('/widget/:widget', authorizationMiddleware, WidgetRouter.delete);
router.delete('/dataset/:dataset/widget/:widget', datasetValidationMiddleware, authorizationMiddleware, WidgetRouter.delete);
router.delete('/dataset/:dataset/widget', datasetValidationMiddleware, isMicroserviceMiddleware, WidgetRouter.deleteByDataset);
// Get by IDs
router.post('/widget/find-by-ids', findByIdValidationMiddleware, WidgetRouter.findByIds);
router.patch('/widget/change-environment/:dataset/:env', datasetValidationMiddleware, isMicroservice, WidgetRouter.updateEnvironment);
// Clone
router.post('/widget/:widget/clone', authorizationMiddleware, WidgetRouter.clone);

module.exports = router;
