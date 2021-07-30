const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const { createWidget } = require('./utils/helpers');

const { getTestServer } = require('./utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Find widgets by IDs', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Widget.deleteMany({}).exec();
    });

    it('Find widgets without ids in body returns a 400 error', async () => {
        const response = await requester
            .post(`/api/v1/widget/find-by-ids`)
            .send({});

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Bad request - Missing 'ids' from request body`);
    });

    it('Find widgets with empty id list returns an empty list (empty db)', async () => {
        const response = await requester
            .post(`/api/v1/widget/find-by-ids`)
            .send({
                ids: []
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Find widgets with id list containing widget that does not exist returns an empty list (empty db)', async () => {
        const response = await requester
            .post(`/api/v1/widget/find-by-ids`)
            .send({
                ids: ['abcd']
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Find widgets with id list containing a widget that exists returns only the listed widget', async () => {
        const widgetOne = await new Widget(createWidget()).save();
        await new Widget(createWidget()).save();

        const response = await requester
            .post(`/api/v1/widget/find-by-ids`)
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
        const widgetOne = await new Widget(createWidget()).save();
        const widgetTwo = await new Widget(createWidget()).save();

        const response = await requester
            .post(`/api/v1/widget/find-by-ids`)
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
        const widgetOne = await new Widget(createWidget()).save();
        const widgetTwo = await new Widget(createWidget()).save();

        const response = await requester
            .post(`/api/v1/widget/find-by-ids?ids=${widgetTwo.dataset}`)
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
        it('Get widgets with custom env should return empty response', async () => {
            const widgetOne = await new Widget(createWidget()).save();

            const response = await requester
                .post(`/api/v1/widget/find-by-ids`)
                .send({
                    ids: [widgetOne.dataset],
                    env: 'custom'
                });
            response.status.should.equal(200);

            response.body.should.have.property('data').and.be.an('array').and.length(0);
        });

        it('Get widgets with custom env and created custom widget - should return one widget', async () => {
            const widgetOne = await new Widget(createWidget({ env: 'custom' })).save();
            await new Widget(createWidget()).save();

            const response = await requester
                .post(`/api/v1/widget/find-by-ids`)
                .send({
                    ids: [widgetOne.dataset],
                    env: 'custom'
                });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(1);
        });

        it('Get widgets with custom env and mismatch widget id - should return empty', async () => {
            await new Widget(createWidget({ env: 'custom' })).save();
            const widgetTwo = await new Widget(createWidget()).save();

            const response = await requester
                .post(`/api/v1/widget/find-by-ids`)
                .send({
                    ids: [widgetTwo.dataset],
                    env: 'custom'
                });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(0);
        });

        it('Get widgets with custom and production env', async () => {
            const widgetOne = await new Widget(createWidget({ env: 'custom' })).save();
            const widgetTwo = await new Widget(createWidget()).save();
            const widgetThree = await new Widget(createWidget()).save();

            const response = await requester
                .post(`/api/v1/widget/find-by-ids`)
                .send({
                    ids: [widgetOne.dataset, widgetTwo.dataset, widgetThree.dataset],
                    env: ['custom', 'production']
                });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(3);
        });
    });

    afterEach(async () => {
        await Widget.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
