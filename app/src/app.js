const Koa = require('koa');
const logger = require('logger');
const koaLogger = require('koa-logger');
const mongoose = require('mongoose');
const config = require('config');
const loader = require('loader');
const koaSimpleHealthCheck = require('koa-simple-healthcheck');
const ctRegisterMicroservice = require('ct-register-microservice-node');
const koaValidate = require('koa-validate');
const ErrorSerializer = require('serializers/error.serializer');
const sleep = require('sleep');
const koaBody = require('koa-body');
const mongooseOptions = require('../../config/mongoose');

const mongoUri = process.env.MONGO_URI || `mongodb://${config.get('mongodb.host')}:${config.get('mongodb.port')}/${config.get('mongodb.database')}`;

let retries = 10;

async function init() {
    return new Promise((resolve, reject) => {
        async function onDbReady(err) {
            if (err) {
                if (retries >= 0) {
                    retries -= 1;
                    logger.error(`Failed to connect to MongoDB uri ${mongoUri}, retrying...`);
                    sleep.sleep(5);
                    mongoose.connect(mongoUri, mongooseOptions, onDbReady);
                } else {
                    logger.error('MongoURI', mongoUri);
                    logger.error(err);
                    reject(new Error(err));
                }
            }
            // set promises in mongoose with bluebird
            mongoose.Promise = Promise;

            const app = new Koa();

            app.use(koaBody({
                multipart: true,
                jsonLimit: '50mb',
                formLimit: '50mb',
                textLimit: '50mb'
            }));
            app.use(koaSimpleHealthCheck());

            app.use(async (ctx, next) => {
                try {
                    await next();
                } catch (inErr) {
                    let error = inErr;
                    try {
                        error = JSON.parse(inErr);
                    } catch (e) {
                        logger.debug('Could not parse error message - is it JSON?: ', inErr);
                        error = inErr;
                    }
                    ctx.status = error.status || ctx.status || 500;
                    if (ctx.status >= 500) {
                        logger.error(error);
                    } else {
                        logger.info(error);
                    }

                    ctx.body = ErrorSerializer.serializeError(ctx.status, error.message);
                    if (process.env.NODE_ENV === 'prod' && ctx.status === 500) {
                        ctx.body = 'Unexpected error';
                    }
                    ctx.response.type = 'application/vnd.api+json';
                }
            });

            app.use(koaLogger());

            koaValidate(app);

            loader.loadRoutes(app);

            const server = app.listen(process.env.PORT, () => {
                ctRegisterMicroservice.register({
                    info: require('../microservice/register.json'),
                    swagger: require('../microservice/public-swagger.json'),
                    mode: (process.env.CT_REGISTER_MODE && process.env.CT_REGISTER_MODE === 'auto') ? ctRegisterMicroservice.MODE_AUTOREGISTER : ctRegisterMicroservice.MODE_NORMAL,
                    framework: ctRegisterMicroservice.KOA2,
                    app,
                    logger,
                    name: config.get('service.name'),
                    ctUrl: process.env.CT_URL,
                    url: process.env.LOCAL_URL,
                    token: process.env.CT_TOKEN,
                    active: true
                }).then(() => {
                }, (error) => {
                    logger.error(error);
                    process.exit(1);
                });
            });

            logger.info('Server started in ', process.env.PORT);
            resolve({ app, server });
        }

        logger.info(`Connecting to MongoDB URL ${mongoUri}`);
        mongoose.connect(mongoUri, mongooseOptions, onDbReady);
    });
}

module.exports = init;
