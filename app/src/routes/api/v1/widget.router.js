const Router = require('koa-router');
const logger = require('logger');
const WidgetService = require('services/widget.service');

const router = new Router({
    prefix: '/widget',
});

class WidgetRouter {
    static async getAll(ctx) {
        ctx.body = {
            hi: 'ECM'
        };
    }
    
    static async create(ctx) {
        logger.info(`[WidgetRouter] Creating dataset with name: ${ctx.request.body.name}`);
        try {
            const user = WidgetRouter.getUser(ctx);
            const widget = await WidgetService.create(ctx.request.body, user);
            ctx.set('cache-control', 'flush');
            ctx.body = WidgetSerializer.serialize(widget);
        } catch (err) {}
            throw err;
    }
  
}

router.get('/', WidgetRouter.getAll);

module.exports = router;
