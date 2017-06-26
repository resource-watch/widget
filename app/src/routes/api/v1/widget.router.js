const Router = require('koa-router');
const logger = require('logger');
const Widget = require('models/widget.model');
const WidgetService = require('services/widget.service');
const DatasetService = require('services/dataset.service');
const WidgetSerializer = require('serializers/widget.serializer');
const WidgetValidator = require('validators/widget.validator');
const WidgetNotValid = require('errors/widgetNotValid.error');
const DatasetNotFound = require('errors/datasetNotFound.error');
const router = new Router();
const USER_ROLES = require('app.constants').USER_ROLES;

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
    	    const widget = await WidgetService.get(id, dataset);
    	    ctx.set('cache-control', 'flush');
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
    	    const widget = await WidgetService.create(ctx.request.body, dataset, user);
    	    ctx.set('cache-control', 'flush');
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
    	    ctx.set('cache-control', 'flush');
    	    ctx.body = WidgetSerializer.serialize(widget);
    	} catch (err) {
    	    throw err;
    	}
    }

    static async getAll(ctx) {
    	const query = ctx.query;
    	const dataset = ctx.params.dataset || null;
    	logger.debug("dataset: %j", dataset);
    	logger.debug("query: %j", query);
    	delete query.loggedUser;
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
    }

    static async update(ctx) {
    	const id = ctx.params.widget;
    	logger.info(`[WidgetRouter] Updating widget with id: ${id}`);
    	const dataset = ctx.params.dataset || null;
    	try {
    	    const user = WidgetRouter.getUser(ctx);
    	    const widget = await WidgetService.update(id, ctx.request.body, user, dataset);
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
    	    ids: ctx.request.body.ids
    	};
    	if (typeof resource.ids === 'string') {
    	    resource.ids = resource.ids.split(',').map((elem) => elem.trim());
    	}
    	const result = await WidgetService.getByDataset(resource);
    	ctx.body = WidgetSerializer.serialize(result);
    }
};

const validationMiddleware = async (ctx, next) => {
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
    	if (ctx.request.body[key] == null ) {
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

const datasetValidationMiddleware = async (ctx, next) => {
    logger.info(`[WidgetRouter] Validating dataset presence`);
    //
    try {
	await DatasetService.checkDataset(ctx);
    } catch(err) {
	ctx.throw(err.statusCode, "Dataset not found");
    };
    await next();
};

const authorizationMiddleware = async (ctx, next) => {
    logger.info(`[WidgetRouter] Checking authorization`);
    // Get user from query (delete) or body (post-patch)
    const newWidgetCreation = ctx.request.path.includes('widget') && ctx.request.method === 'POST' && !(ctx.request.path.includes('find-by-ids'));
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
        if (!newWidgetCreation) {
            ctx.throw(403, 'Forbidden'); // if user is USER -> out
            return;
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
router.patch('/widget/:widget', datasetValidationMiddleware, validationMiddleware, authorizationMiddleware, WidgetRouter.update);
router.patch('/dataset/:dataset/widget/:widget', datasetValidationMiddleware, validationMiddleware, authorizationMiddleware, WidgetRouter.update);
// Delete
router.delete('/widget/:widget', authorizationMiddleware, WidgetRouter.delete);
router.delete('/dataset/:dataset/widget/:widget', datasetValidationMiddleware, authorizationMiddleware, WidgetRouter.delete);
// Get by IDs
router.post('/widget/find-by-ids', WidgetRouter.getByIds);

module.exports = router;
