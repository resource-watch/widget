const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const { USERS } = require('./utils/test.constants');

const { getTestServer } = require('./utils/test-server');
const {
    getUUID, createWidget, mockValidateRequestWithApiKey,
    mockValidateRequestWithApiKeyAndUserToken
} = require('./utils/helpers');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Clone widgets tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Widget.deleteMany({}).exec();
    });

    it('Clone a widget as an anonymous user should fail with a 401 error code', async () => {
        mockValidateRequestWithApiKey({});
        const widgetId = getUUID();

        const response = await requester
            .post(`/api/v1/widget/${widgetId}/clone`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(401);
    });

    it('Clone a widget that does not exist should fail with a 404 error code', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });

        const widgetId = getUUID();

        const response = await requester
            .post(`/api/v1/widget/${widgetId}/clone`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({});

        response.status.should.equal(404);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal(`Widget with id '${widgetId}' doesn't exist`);
    });

    it('Clone a widget as an USER that does not own the widget should fail with a 403 code', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const widgetOne = await new Widget(createWidget()).save();

        const response = await requester
            .post(`/api/v1/widget/${widgetOne.id}/clone`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Forbidden');
    });

    it('Clone a widget as an USER that does owns the widget but doesn\'t have the same applications should fail with a 403 code', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const widgetOne = await new Widget(createWidget({ userId: '123456789', application: ['potato'] })).save();

        const response = await requester
            .post(`/api/v1/widget/${widgetOne.id}/clone`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({});

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Forbidden');
    });

    it('Clone a widget as an USER that owns the widget should be successful', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const widgetOne = await new Widget(createWidget({ userId: USERS.USER.id })).save();

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .post((uri) => uri.match(/\/v1\/webshot\/widget\/(\w|-)*\/thumbnail/))
            .twice()
            .reply(
                200,
                { data: { widgetThumbnail: 'http://thumbnail-url.com/cloneFile.png' } }
            );

        const response = await requester
            .post(`/api/v1/widget/${widgetOne.id}/clone`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({});

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.id.should.not.equal(widgetOne.id);
        createdWidget.attributes.name.should.not.equal(widgetOne.name);
        createdWidget.attributes.slug.should.not.equal(widgetOne.slug);

        createdWidget.attributes.description.should.equal(widgetOne.description);
        createdWidget.attributes.dataset.should.equal(widgetOne.dataset);
        createdWidget.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
        createdWidget.attributes.queryUrl.should.equal(widgetOne.queryUrl);
        createdWidget.attributes.widgetConfig.should.deep.equal(widgetOne.widgetConfig);
        createdWidget.attributes.userId.should.equal(USERS.USER.id);
    });

    it('Clone a widget as an MANAGER should be successful', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });
        const widgetOne = await new Widget(createWidget({ userId: '123456789' })).save();

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .post((uri) => uri.match(/\/v1\/webshot\/widget\/(\w|-)*\/thumbnail/))
            .twice()
            .reply(
                200,
                { data: { widgetThumbnail: 'http://thumbnail-url.com/cloneFile.png' } }
            );

        const response = await requester
            .post(`/api/v1/widget/${widgetOne.id}/clone`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({});

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.id.should.not.equal(widgetOne.id);
        createdWidget.attributes.name.should.not.equal(widgetOne.name);
        createdWidget.attributes.slug.should.not.equal(widgetOne.slug);

        createdWidget.attributes.description.should.equal(widgetOne.description);
        createdWidget.attributes.dataset.should.equal(widgetOne.dataset);
        createdWidget.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
        createdWidget.attributes.queryUrl.should.equal(widgetOne.queryUrl);
        createdWidget.attributes.widgetConfig.should.deep.equal(widgetOne.widgetConfig);
        createdWidget.attributes.userId.should.equal(USERS.MANAGER.id);
    });

    it('Clone a widget as an ADMIN should be successful', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        const widgetOne = await new Widget(createWidget()).save();

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .post((uri) => uri.match(/\/v1\/webshot\/widget\/(\w|-)*\/thumbnail/))
            .twice()
            .reply(
                200,
                { data: { widgetThumbnail: 'http://thumbnail-url.com/cloneFile.png' } }
            );

        const response = await requester
            .post(`/api/v1/widget/${widgetOne.id}/clone`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({});

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.id.should.not.equal(widgetOne.id);
        createdWidget.attributes.name.should.not.equal(widgetOne.name);
        createdWidget.attributes.slug.should.not.equal(widgetOne.slug);

        createdWidget.attributes.description.should.equal(widgetOne.description);
        createdWidget.attributes.dataset.should.equal(widgetOne.dataset);
        createdWidget.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
        createdWidget.attributes.queryUrl.should.equal(widgetOne.queryUrl);
        createdWidget.attributes.widgetConfig.should.deep.equal(widgetOne.widgetConfig);
        createdWidget.attributes.userId.should.equal(USERS.ADMIN.id);
    });

    it('Clone a widget as an ADMIN with a custom user id should be successful and retain the ADMIN\'s userId', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        const widgetOne = await new Widget(createWidget()).save();

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .post((uri) => uri.match(/\/v1\/webshot\/widget\/(\w|-)*\/thumbnail/))
            .twice()
            .reply(
                200,
                { data: { widgetThumbnail: 'http://thumbnail-url.com/cloneFile.png' } }
            );

        const response = await requester
            .post(`/api/v1/widget/${widgetOne.id}/clone`, { userId: '1322548' })
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({});

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.id.should.not.equal(widgetOne.id);
        createdWidget.attributes.name.should.not.equal(widgetOne.name);
        createdWidget.attributes.slug.should.not.equal(widgetOne.slug);

        createdWidget.attributes.description.should.equal(widgetOne.description);
        createdWidget.attributes.dataset.should.equal(widgetOne.dataset);
        createdWidget.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
        createdWidget.attributes.queryUrl.should.equal(widgetOne.queryUrl);
        createdWidget.attributes.widgetConfig.should.deep.equal(widgetOne.widgetConfig);
        createdWidget.attributes.userId.should.equal(USERS.ADMIN.id);
        createdWidget.attributes.userId.should.not.equal('1322548');
    });

    it('Clone a widget as the \'microservice\' user with a custom userId should be successful and retain the custom userId', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MICROSERVICE });
        const widgetOne = await new Widget(createWidget()).save();

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .post((uri) => uri.match(/\/v1\/webshot\/widget\/(\w|-)*\/thumbnail/))
            .twice()
            .reply(
                200,
                { data: { widgetThumbnail: 'http://thumbnail-url.com/cloneFile.png' } }
            );

        const response = await requester
            .post(`/api/v1/widget/${widgetOne.id}/clone`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({
                userId: '1322548',
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.id.should.not.equal(widgetOne.id);
        createdWidget.attributes.name.should.not.equal(widgetOne.name);
        createdWidget.attributes.slug.should.not.equal(widgetOne.slug);

        createdWidget.attributes.description.should.equal(widgetOne.description);
        createdWidget.attributes.dataset.should.equal(widgetOne.dataset);
        createdWidget.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
        createdWidget.attributes.queryUrl.should.equal(widgetOne.queryUrl);
        createdWidget.attributes.widgetConfig.should.deep.equal(widgetOne.widgetConfig);
        createdWidget.attributes.userId.should.not.equal(USERS.ADMIN.id);
        createdWidget.attributes.userId.should.equal('1322548');
    });

    it('Clone a widget as an USER with a matching app should be successful', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const widgetOne = await new Widget(createWidget({ userId: USERS.USER.id })).save();

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .post((uri) => uri.match(/\/v1\/webshot\/widget\/(\w|-)*\/thumbnail/))
            .twice()
            .reply(
                200,
                { data: { widgetThumbnail: 'http://thumbnail-url.com/cloneFile.png' } }
            );

        const response = await requester
            .post(`/api/v1/widget/${widgetOne.id}/clone`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({});

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.id.should.not.equal(widgetOne.id);
        createdWidget.attributes.name.should.not.equal(widgetOne.name);
        createdWidget.attributes.slug.should.not.equal(widgetOne.slug);

        createdWidget.attributes.description.should.equal(widgetOne.description);
        createdWidget.attributes.dataset.should.equal(widgetOne.dataset);
        createdWidget.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
        createdWidget.attributes.queryUrl.should.equal(widgetOne.queryUrl);
        createdWidget.attributes.widgetConfig.should.deep.equal(widgetOne.widgetConfig);

        const databaseWidget = await Widget.findById(createdWidget.id).exec();

        databaseWidget.name.should.equal(createdWidget.attributes.name);
        databaseWidget.description.should.equal(createdWidget.attributes.description);
        databaseWidget.sourceUrl.should.equal(createdWidget.attributes.sourceUrl);
        databaseWidget.queryUrl.should.equal(createdWidget.attributes.queryUrl);
        databaseWidget.widgetConfig.should.deep.equal(createdWidget.attributes.widgetConfig);

    });

    it('Clone a widget as an USER without a matching app should fail with HTTP 403', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const widgetWithFakeApp = createWidget({ userId: USERS.USER.id });
        widgetWithFakeApp.application = ['potato'];
        const widgetOne = await new Widget(widgetWithFakeApp).save();

        const response = await requester
            .post(`/api/v1/widget/${widgetOne.id}/clone`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({});

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array').and.length(1);
        response.body.errors[0].should.have.property('detail').and.equal('Forbidden');
    });

    it('Clone a widget as an ADMIN overwriting data should be successful', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const widgetOne = await new Widget(createWidget({ userId: USERS.USER.id })).save();

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .post((uri) => uri.match(/\/v1\/webshot\/widget\/(\w|-)*\/thumbnail/))
            .twice()
            .reply(
                200,
                { data: { widgetThumbnail: 'http://thumbnail-url.com/cloneFile.png' } }
            );

        const response = await requester
            .post(`/api/v1/widget/${widgetOne.id}/clone`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({
                name: 'new name',
                description: 'new description'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.id.should.not.equal(widgetOne.id);

        createdWidget.attributes.name.should.equal('new name');
        createdWidget.attributes.description.should.equal('new description');

        createdWidget.attributes.slug.should.not.equal(widgetOne.slug);

        createdWidget.attributes.dataset.should.equal(widgetOne.dataset);
        createdWidget.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
        createdWidget.attributes.queryUrl.should.equal(widgetOne.queryUrl);
        createdWidget.attributes.widgetConfig.should.deep.equal(widgetOne.widgetConfig);

        const databaseWidget = await Widget.findById(createdWidget.id).exec();

        databaseWidget.name.should.equal(createdWidget.attributes.name);
        databaseWidget.description.should.equal(createdWidget.attributes.description);
        databaseWidget.sourceUrl.should.equal(createdWidget.attributes.sourceUrl);
        databaseWidget.queryUrl.should.equal(createdWidget.attributes.queryUrl);
        databaseWidget.widgetConfig.should.deep.equal(createdWidget.attributes.widgetConfig);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(async () => {
        await Widget.deleteMany({}).exec();
    });
});
