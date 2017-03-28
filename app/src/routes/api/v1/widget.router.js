const Router = require('koa-router');
const logger = require('logger');
const WidgetService = require('services/widget.service');
const WidgetSerializer = require('serializers/widget.serializer');

const router = new Router({
    prefix: '/widget'
});

class WidgetRouter {

    static async get(ctx) {
	const id = ctx.params.widget;
	logger.info(`[WidgetRouter] Getting widget with id: ${id}`);
	
    }
    
    static async create(ctx) {
        logger.info(`[WidgetRouter] Creating widget with name: ${ctx.request.body.name}`);
        try {
            const widget = await WidgetService.create(ctx.request.body);
            ctx.set('cache-control', 'flush');
            ctx.body = WidgetSerializer.serialize(widget);
        } catch (err) {
	    if (err instanceof WidgetNotFound) {
		ctx.throw(404, err.message);
		return;
	    }
            throw err;
	}
    }
  
}

router.post('/', WidgetRouter.create);
router.get('/:id', WidgetRouter.create);

module.exports = router;
