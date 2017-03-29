const Router = require('koa-router');
const logger = require('logger');
const Widget = require('models/widget.model');
const WidgetService = require('services/widget.service');
const WidgetSerializer = require('serializers/widget.serializer');

const router = new Router({
    prefix: '/widget'
});

class WidgetRouter {

    static async get(ctx) {
	const id = ctx.params.widget;
	logger.info(`[WidgetRouter] Getting widget with id: ${id}`);
	try {
	    const widget = await WidgetService.get(id);
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
            const widget = await WidgetService.create(ctx.request.body);
            ctx.set('cache-control', 'flush');
            ctx.body = WidgetSerializer.serialize(widget);
        } catch (err) {
	    throw err;
	}
    }

    static async delete(ctx) {
	const id = ctx.params.widget;
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
	logger.debug("query: %j", query)
	delete query.loggedUser;
	const widgets = await WidgetService.getAll(query);
	ctx.body = WidgetSerializer.serialize(widgets);
    }
  
}

router.post('/', WidgetRouter.create);
router.get('/', WidgetRouter.getAll);
router.get('/:widget', WidgetRouter.get);
router.delete('/:widget', WidgetRouter.delete);

module.exports = router;
