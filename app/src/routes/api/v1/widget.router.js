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
	let widget = await Widget.findById(id).exec();
	logger.info(`widget is ${widget}`);
	ctx.body = WidgetSerializer.serialize(widget)
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
  
}

router.post('/', WidgetRouter.create);
router.get('/:widget', WidgetRouter.get);

module.exports = router;
