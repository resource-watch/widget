const Router = require('koa-router');
const logger = require('logger');
const Widget = require('models/widget.model');
const WidgetService = require('services/widget.service');
const DatasetService = require('services/dataset.service');
const WidgetSerializer = require('serializers/widget.serializer');

const router = new Router();

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
	    logger.info(`widget is ${widget}`);
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
	    logger.info(`[WidgetRouter] User: ${JSON.stringify(user)}`);
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
	const link = `${ctx.request.protocol}://${ctx.request.host}/api/${apiVersion}${ctx.request.path}${serializedQuery}`;
	ctx.body = WidgetSerializer.serialize(widgets, link);
    }

    static async update(ctx) {
	const id = ctx.params.widget;
	logger.info(`[WidgetRouter] Updating widget with id: ${id}`);
	const dataset = ctx.params.dataset || null;
	try {
	    const user = WidgetRouter.getUser(ctx);
	    logger.info(`[WidgetRouter] User: ${user}`);
	    const widget = await WidgetService.update(id, ctx.request.body, user, dataset);
	    logger.info(`[WidgetRouter] Widget: ${widget}`);
	    ctx.body = WidgetSerializer.serialize(widget);
	} catch (err) {
	    throw err;
	}
    }
};

const widgetValidationMiddleware = async (ctx, next) => {
    logger.info(`[WidgetRouter] Validating the widget`);
    if (ctx.request.body.widget) {
        ctx.request.body = Object.assign(ctx.request.body, ctx.request.body.widget);
        delete ctx.request.body.dataset;
    }
    await next();
};

const datasetValidationMiddleware = async (ctx, next) => {
    logger.info(`[WidgetRouter] Validating the dataset exists`);
    if (ctx.params.dataset || ctx.request.body.dataset) {
	const datasetId = ctx.params.dataset || ctx.request.body.dataset;
	logger.info(`[WidgetRouter] Dataset ID: ${datasetId}`);
	const apiVersion = ctx.mountPath.split('/')[ctx.mountPath.split('/').length - 1];
	const datasetUrl = `${ctx.request.protocol}://${ctx.request.host}/api/${apiVersion}/dataset/${datasetId}`;
	const datasetExists = await DatasetService.checkDataset(datasetUrl);
	if (!datasetExists) {throw new DatasetNotFound.error(`No dataset found with ID ${datasetId}`)}
    } else {
	logger.debug(`No dataset found`)
    }
    await next();
};


// Declaring the routes
// Index
router.get('/widget', WidgetRouter.getAll);
router.get('/dataset/:dataset/widget', datasetValidationMiddleware, WidgetRouter.getAll);
// Create
router.post('/widget', widgetValidationMiddleware, WidgetRouter.create);
router.post('/dataset/:dataset/widget/', datasetValidationMiddleware, widgetValidationMiddleware, WidgetRouter.create);
// Read
router.get('/widget/:widget', WidgetRouter.get);
router.get('/dataset/:dataset/widget/:widget', datasetValidationMiddleware, WidgetRouter.get);
// Update
router.patch('/widget/:widget', widgetValidationMiddleware, WidgetRouter.update);
router.patch('/dataset/:dataset/widget/:widget', datasetValidationMiddleware, widgetValidationMiddleware, WidgetRouter.update);
// Delete
router.delete('/widget/:widget', WidgetRouter.delete);
router.delete('/dataset/:dataset/widget/:widget', datasetValidationMiddleware, WidgetRouter.delete);
// Get by IDs

module.exports = router;
