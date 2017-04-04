const Router = require('koa-router');
const logger = require('logger');
const Widget = require('models/widget.model');
const WidgetService = require('services/widget.service');
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
	const id = ctx.params.widget;
	const dataset = ctx.params.dataset;
	logger.info(`[WidgetRouter] Getting widget with id: ${id}`);
	try {
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
	    const widget = await WidgetService.delete(id);
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

    // static async update(ctx) {
    //     const id = ctx.params.dataset;
    //     logger.info(`[DatasetRouter] Updating dataset with id: ${id}`);
    //     try {
    //         const user = DatasetRouter.getUser(ctx);
    //         const dataset = await DatasetService.update(id, ctx.request.body, user);
    //         ctx.set('cache-control', 'flush');
    //         ctx.body = DatasetSerializer.serialize(dataset);
    //     } catch (err) {
    //         if (err instanceof DatasetNotFound) {
    //             ctx.throw(404, err.message);
    //             return;
    //         } else if (err instanceof DatasetDuplicated) {
    //             ctx.throw(400, err.message);
    //             return;
    //         }
    //         throw err;
    //     }
    // }

    static async update(ctx) {
	const id = ctx.params.widget;
	logger.info(`[WidgetRouter] Updating widget with id: ${id}`);
	try {
	    const user = WidgetRouter.getUser(ctx);
	    logger.info(`[WidgetRouter] User: ${user}`);
	    const widget = await WidgetService.update(id, ctx.request.body, user);
	    logger.info(`[WidgetRouter] Widget: ${widget}`);	    
	} catch (err) {};
    }

}


// Declaring the routes
// Index
router.get('/widget', WidgetRouter.getAll);
router.get('/dataset/:dataset/widget', WidgetRouter.getAll);
// Create
router.post('/widget', WidgetRouter.create);
router.post('/dataset/:dataset/widget/', WidgetRouter.create);
// Read
router.get('/widget/:widget', WidgetRouter.get);
router.get('/dataset/:dataset/widget/:widget', WidgetRouter.get);
// Update
// Delete
router.delete('/widget/:widget', WidgetRouter.delete);
router.patch('/widget/:widget', WidgetRouter.update);
// Get by IDs

module.exports = router;
