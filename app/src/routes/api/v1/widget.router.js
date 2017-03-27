const Router = require('koa-router');
const logger = require('logger');

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
            try {
                WidgetRouter.notifyAdapter(ctx, widget);
            } catch (error) {
                // do nothing
            }
            ctx.set('cache-control', 'flush');
            ctx.body = WidgetSerializer.serialize(widget);
        } catch (err) {
            if (err instanceof WidgetDuplicated) {
                ctx.throw(400, err.message);
                return;
            }
            throw err;
        }
    }


}

router.get('/', WidgetRouter.getAll);

module.exports = router;
