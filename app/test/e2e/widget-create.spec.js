const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const { USERS } = require('./utils/test.constants');

const { getTestServer } = require('./utils/test-server');
const {
    widgetConfig,
    mockDataset,
    mockWebshot,
    ensureCorrectError,
    mockGetUserFromToken
} = require('./utils/helpers');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Create widgets tests', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Widget.deleteMany({}).exec();
    });

    it('Create a widget as an anonymous user should fail with a 401 error code', async () => {
        const dataset = mockDataset('39f5dc1f-5e45-41d8-bcd5-96941c8a7e79');

        const widget = {
            name: 'Widget default',
            queryUrl: 'query/5be16fea-5b1a-4daf-a9e9-9dc1f6ea6d4e?sql=select * from crops',
            application: ['rw'],
            description: '',
            source: '',
            sourceUrl: 'http://foo.bar',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig
        };
        const response = await requester
            .post(`/api/v1/widget`)
            .send({ dataset: dataset.id, widget });

        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Create a widget as an ADMIN should be successful', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const dataset = mockDataset('39f5dc1f-5e45-41d8-bcd5-96941c8a7e79');

        const widget = {
            name: 'Widget default',
            queryUrl: 'query/5be16fea-5b1a-4daf-a9e9-9dc1f6ea6d4e?sql=select * from crops',
            application: ['rw'],
            description: '',
            source: '',
            sourceUrl: 'http://foo.bar',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig
        };

        mockWebshot();
        const response = await requester
            .post(`/api/v1/widget`)
            .set('Authorization', `Bearer abcd`)
            .send({ dataset: dataset.id, widget });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.attributes.name.should.equal(widget.name);
        createdWidget.attributes.description.should.equal(widget.description);
        createdWidget.attributes.dataset.should.equal(dataset.id);
        createdWidget.attributes.sourceUrl.should.equal(widget.sourceUrl);
        createdWidget.attributes.queryUrl.should.equal(widget.queryUrl);
        createdWidget.attributes.widgetConfig.should.deep.equal(widget.widgetConfig);
        new Date(createdWidget.attributes.updatedAt).should.equalDate(new Date());


        const databaseWidget = await Widget.findById(createdWidget.id).exec();

        databaseWidget.name.should.equal(widget.name);
        databaseWidget.description.should.equal(widget.description);
        databaseWidget.sourceUrl.should.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.deep.equal(widget.widgetConfig);
        new Date(databaseWidget.updatedAt).should.equalDate(new Date());
    });

    it('Create a widget as an ADMIN should be successful - minimum required fields', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const dataset = mockDataset('39f5dc1f-5e45-41d8-bcd5-96941c8a7e79');

        const widget = {
            name: 'Widget default',
            application: ['rw'],
        };

        mockWebshot();
        const response = await requester
            .post(`/api/v1/widget`)
            .set('Authorization', `Bearer abcd`)
            .send({ dataset: dataset.id, widget });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.attributes.name.should.equal(widget.name);
        createdWidget.attributes.dataset.should.equal(dataset.id);
        new Date(createdWidget.attributes.updatedAt).should.equalDate(new Date());


        const databaseWidget = await Widget.findById(createdWidget.id).exec();

        databaseWidget.name.should.equal(widget.name);
        new Date(databaseWidget.updatedAt).should.equalDate(new Date());
    });

    it('Create a widget as an USER with a matching app should be successful', async () => {
        mockGetUserFromToken(USERS.USER);
        const dataset = mockDataset('39f5dc1f-5e45-41d8-bcd5-96941c8a7e79');

        const widget = {
            name: 'Widget default',
            queryUrl: 'query/5be16fea-5b1a-4daf-a9e9-9dc1f6ea6d4e?sql=select * from crops',
            application: ['rw'],
            description: '',
            source: '',
            sourceUrl: 'http://foo.bar',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig
        };

        mockWebshot();
        const response = await requester
            .post(`/api/v1/widget`)
            .set('Authorization', `Bearer abcd`)
            .send({ dataset: dataset.id, widget });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.attributes.name.should.equal(widget.name);
        createdWidget.attributes.description.should.equal(widget.description);
        createdWidget.attributes.dataset.should.equal(dataset.id);
        createdWidget.attributes.sourceUrl.should.equal(widget.sourceUrl);
        createdWidget.attributes.queryUrl.should.equal(widget.queryUrl);
        createdWidget.attributes.widgetConfig.should.deep.equal(widget.widgetConfig);
        new Date(createdWidget.attributes.updatedAt).should.equalDate(new Date());

        const databaseWidget = await Widget.findById(createdWidget.id).exec();

        databaseWidget.name.should.equal(widget.name);
        databaseWidget.description.should.equal(widget.description);
        databaseWidget.sourceUrl.should.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.deep.equal(widget.widgetConfig);
        new Date(databaseWidget.updatedAt).should.equalDate(new Date());
    });

    it('Create a widget as an USER without a matching app should fail with HTTP 403', async () => {
        mockGetUserFromToken(USERS.USER);
        const dataset = mockDataset('39f5dc1f-5e45-41d8-bcd5-96941c8a7e79', { application: ['potato'] });

        const widget = {
            name: 'Widget default',
            queryUrl: 'query/5be16fea-5b1a-4daf-a9e9-9dc1f6ea6d4e?sql=select * from crops',
            application: ['potato'],
            description: '',
            source: '',
            sourceUrl: 'http://foo.bar',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig
        };
        const response = await requester
            .post(`/api/v1/widget`)
            .set('Authorization', `Bearer abcd`)
            .send({ dataset: dataset.id, widget });

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array').and.length(1);
        response.body.errors[0].should.have.property('detail').and.equal('Forbidden');
    });

    it('Create a widget when taking a snapshot fails should return 200 OK with the created widget data', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const dataset = mockDataset('39f5dc1f-5e45-41d8-bcd5-96941c8a7e79');

        const widget = {
            name: 'Widget default',
            queryUrl: 'query/5be16fea-5b1a-4daf-a9e9-9dc1f6ea6d4e?sql=select * from crops',
            application: ['rw'],
            description: '',
            source: '',
            sourceUrl: 'http://foo.bar',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig
        };

        mockWebshot(false);
        const response = await requester
            .post(`/api/v1/widget`)
            .set('Authorization', `Bearer abcd`)
            .send({ dataset: dataset.id, widget });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.attributes.name.should.equal(widget.name);
        createdWidget.attributes.description.should.equal(widget.description);
        createdWidget.attributes.dataset.should.equal('39f5dc1f-5e45-41d8-bcd5-96941c8a7e79');
        createdWidget.attributes.sourceUrl.should.equal(widget.sourceUrl);
        createdWidget.attributes.queryUrl.should.equal(widget.queryUrl);
        createdWidget.attributes.widgetConfig.should.deep.equal(widget.widgetConfig);
        new Date(createdWidget.attributes.updatedAt).should.equalDate(new Date());

        const databaseWidget = await Widget.findById(createdWidget.id).exec();

        databaseWidget.name.should.equal(widget.name);
        databaseWidget.description.should.equal(widget.description);
        databaseWidget.sourceUrl.should.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.deep.equal(widget.widgetConfig);
        new Date(databaseWidget.updatedAt).should.equalDate(new Date());
    });

    it('Create a widget with widgetConfig set to a JSON string should fail', async () => {
        mockGetUserFromToken(USERS.USER);
        const dataset = mockDataset('39f5dc1f-5e45-41d8-bcd5-96941c8a7e79');

        const widget = {
            name: 'Widget default',
            queryUrl: 'query/5be16fea-5b1a-4daf-a9e9-9dc1f6ea6d4e?sql=select * from crops',
            application: ['rw'],
            description: '',
            source: '',
            sourceUrl: 'http://foo.bar',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig: '{}'
        };

        const response = await requester
            .post(`/api/v1/widget`)
            .set('Authorization', `Bearer abcd`)
            .send({ dataset: dataset.id, widget });

        response.status.should.equal(400);
        ensureCorrectError(response.body, '- widgetConfig: must be an object - ');
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
