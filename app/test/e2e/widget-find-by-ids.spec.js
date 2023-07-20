const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const { createWidget, mockValidateRequestWithApiKey } = require('./utils/helpers');

const { getTestServer } = require('./utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Find widgets by Ids', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Widget.deleteMany({}).exec();
    });

    it('Find widgets without ids in body returns a 400 error', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v1/widget/find-by-ids`)
            .set('x-api-key', 'api-key-test')
            .send({});

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`- ids: must be an array - `);
    });

    it('Find widgets with empty id list returns an empty list (empty db)', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v1/widget/find-by-ids`)
            .set('x-api-key', 'api-key-test')
            .send({
                ids: []
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Find widgets with id list containing widget that does not exist returns an empty list (empty db)', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v1/widget/find-by-ids`)
            .set('x-api-key', 'api-key-test')
            .send({
                ids: ['abcd']
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Find widgets with id list containing a widget that exists returns only the listed widget', async () => {
        mockValidateRequestWithApiKey({});
        const widgetOne = await new Widget(createWidget()).save();
        await new Widget(createWidget()).save();

        const response = await requester
            .post(`/api/v1/widget/find-by-ids`)
            .set('x-api-key', 'api-key-test')
            .send({
                ids: [widgetOne.dataset]
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);

        const responseWidgetOne = response.body.data[0];

        widgetOne.name.should.equal(responseWidgetOne.attributes.name);
        widgetOne.dataset.should.equal(responseWidgetOne.attributes.dataset);
        widgetOne.userId.should.equal(responseWidgetOne.attributes.userId);
        widgetOne.slug.should.equal(responseWidgetOne.attributes.slug);
        widgetOne.sourceUrl.should.equal(responseWidgetOne.attributes.sourceUrl);
        widgetOne.queryUrl.should.equal(responseWidgetOne.attributes.queryUrl);
    });

    it('Find widgets with id list on the body containing widgets that exist returns the listed widgets', async () => {
        mockValidateRequestWithApiKey({});
        const widgetOne = await new Widget(createWidget()).save();
        const widgetTwo = await new Widget(createWidget()).save();

        const response = await requester
            .post(`/api/v1/widget/find-by-ids`)
            .set('x-api-key', 'api-key-test')
            .send({
                ids: [widgetOne.dataset, widgetTwo.dataset]
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);

        const responseWidgetOne = response.body.data[0];
        const responseWidgetTwo = response.body.data[1];

        widgetOne.name.should.equal(responseWidgetOne.attributes.name);
        widgetOne.dataset.should.equal(responseWidgetOne.attributes.dataset);
        widgetOne.userId.should.equal(responseWidgetOne.attributes.userId);
        widgetOne.slug.should.equal(responseWidgetOne.attributes.slug);
        widgetOne.sourceUrl.should.equal(responseWidgetOne.attributes.sourceUrl);
        widgetOne.queryUrl.should.equal(responseWidgetOne.attributes.queryUrl);

        widgetTwo.name.should.equal(responseWidgetTwo.attributes.name);
        widgetTwo.dataset.should.equal(responseWidgetTwo.attributes.dataset);
        widgetTwo.userId.should.equal(responseWidgetTwo.attributes.userId);
        widgetTwo.slug.should.equal(responseWidgetTwo.attributes.slug);
        widgetTwo.sourceUrl.should.equal(responseWidgetTwo.attributes.sourceUrl);
        widgetTwo.queryUrl.should.equal(responseWidgetTwo.attributes.queryUrl);
    });

    it('Find widgets with id list on query param and the body containing widgets that exist returns the listed widgets from the body list, ignores query param', async () => {
        mockValidateRequestWithApiKey({});
        const widgetOne = await new Widget(createWidget()).save();
        const widgetTwo = await new Widget(createWidget()).save();

        const response = await requester
            .post(`/api/v1/widget/find-by-ids?ids=${widgetTwo.dataset}`)
            .set('x-api-key', 'api-key-test')
            .send({
                ids: [widgetOne.dataset]
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);

        const responseWidgetOne = response.body.data[0];

        widgetOne.name.should.equal(responseWidgetOne.attributes.name);
        widgetOne.dataset.should.equal(responseWidgetOne.attributes.dataset);
        widgetOne.userId.should.equal(responseWidgetOne.attributes.userId);
        widgetOne.slug.should.equal(responseWidgetOne.attributes.slug);
        widgetOne.sourceUrl.should.equal(responseWidgetOne.attributes.sourceUrl);
        widgetOne.queryUrl.should.equal(responseWidgetOne.attributes.queryUrl);
    });

    describe('Environment', () => {
        it('Get widgets with no env filter should return all passed widgets', async () => {
            mockValidateRequestWithApiKey({});
            const widgetOne = await new Widget(createWidget()).save();
            const widgetTwo = await new Widget(createWidget({ env: 'custom' })).save();

            const response = await requester
                .post(`/api/v1/widget/find-by-ids`)
                .set('x-api-key', 'api-key-test')
                .send({
                    ids: [widgetOne.dataset, widgetTwo.dataset],
                });
            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(2);

            const responseWidgetOne = response.body.data[0];
            const responseWidgetTwo = response.body.data[1];

            responseWidgetOne.attributes.name.should.equal(widgetOne.name);
            responseWidgetOne.attributes.dataset.should.equal(widgetOne.dataset);
            responseWidgetOne.attributes.userId.should.equal(widgetOne.userId);
            responseWidgetOne.attributes.slug.should.equal(widgetOne.slug);
            responseWidgetOne.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
            responseWidgetOne.attributes.queryUrl.should.equal(widgetOne.queryUrl);

            responseWidgetTwo.attributes.name.should.equal(widgetTwo.name);
            responseWidgetTwo.attributes.dataset.should.equal(widgetTwo.dataset);
            responseWidgetTwo.attributes.userId.should.equal(widgetTwo.userId);
            responseWidgetTwo.attributes.slug.should.equal(widgetTwo.slug);
            responseWidgetTwo.attributes.sourceUrl.should.equal(widgetTwo.sourceUrl);
            responseWidgetTwo.attributes.queryUrl.should.equal(widgetTwo.queryUrl);
        });

        it('Get widgets with custom env should return empty response', async () => {
            mockValidateRequestWithApiKey({});
            const widgetOne = await new Widget(createWidget()).save();

            const response = await requester
                .post(`/api/v1/widget/find-by-ids`)
                .set('x-api-key', 'api-key-test')
                .send({
                    ids: [widgetOne.dataset],
                    env: 'custom'
                });
            response.status.should.equal(200);

            response.body.should.have.property('data').and.be.an('array').and.length(0);
        });

        it('Get widgets with custom env and created custom widget - should return one widget', async () => {
            mockValidateRequestWithApiKey({});
            const widgetOne = await new Widget(createWidget({ env: 'custom' })).save();
            await new Widget(createWidget()).save();

            const response = await requester
                .post(`/api/v1/widget/find-by-ids`)
                .set('x-api-key', 'api-key-test')
                .send({
                    ids: [widgetOne.dataset],
                    env: 'custom'
                });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(1);
        });

        it('Get widgets with custom env and mismatch widget id - should return empty', async () => {
            mockValidateRequestWithApiKey({});
            await new Widget(createWidget({ env: 'custom' })).save();
            const widgetTwo = await new Widget(createWidget()).save();

            const response = await requester
                .post(`/api/v1/widget/find-by-ids`)
                .set('x-api-key', 'api-key-test')
                .send({
                    ids: [widgetTwo.dataset],
                    env: 'custom'
                });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(0);
        });

        it('Get widgets with custom and production env', async () => {
            mockValidateRequestWithApiKey({});
            const widgetOne = await new Widget(createWidget({ env: 'custom' })).save();
            const widgetTwo = await new Widget(createWidget()).save();
            const widgetThree = await new Widget(createWidget()).save();

            const response = await requester
                .post(`/api/v1/widget/find-by-ids`)
                .set('x-api-key', 'api-key-test')
                .send({
                    ids: [widgetOne.dataset, widgetTwo.dataset, widgetThree.dataset],
                    env: ['custom', 'production'].join(',')
                });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(3);
        });

        it('Get widgets with env as array should fail', async () => {
            mockValidateRequestWithApiKey({});
            const widgetOne = await new Widget(createWidget({ env: 'custom' })).save();
            const widgetTwo = await new Widget(createWidget()).save();
            const widgetThree = await new Widget(createWidget()).save();

            const response = await requester
                .post(`/api/v1/widget/find-by-ids`)
                .set('x-api-key', 'api-key-test')
                .send({
                    ids: [widgetOne.dataset, widgetTwo.dataset, widgetThree.dataset],
                    env: ['custom', 'production']
                });

            response.status.should.equal(400);
            response.body.should.have.property('errors').and.be.an('array');
            response.body.errors[0].should.have.property('detail').and.equal(`- env: must be a string - `);
        });
    });

    afterEach(async () => {
        await Widget.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
