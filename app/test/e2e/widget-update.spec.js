const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const chaiDatetime = require('chai-datetime');
const { USERS } = require('./utils/test.constants');

const { getTestServer } = require('./utils/test-server');
const {
    ensureCorrectError,
    createWidget,
    getUUID,
    mockDataset,
    mockWebshot,
    widgetConfig,
    mockGetUserFromToken
} = require('./utils/helpers');

chai.should();
chai.use(chaiDatetime);

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Update widgets tests', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Widget.deleteMany({}).exec();
    });

    it('Update a widget as an anonymous user should fail with a 401 error code', async () => {
        const response = await requester.patch(`/api/v1/widget/${getUUID()}`).send();
        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Update a widget that doesn\'t exist should fail with a 404 error code', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const uuid = getUUID();
        const response = await requester
            .patch(`/api/v1/widget/${uuid}`)
            .set('Authorization', `Bearer abcd`)
            .send({ });

        response.status.should.equal(404);
        ensureCorrectError(response.body, `Widget not found with the id ${uuid}`);
    });

    it('Update a widget as an ADMIN should be successful', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const widgetOne = await new Widget(createWidget()).save();

        mockDataset(widgetOne.dataset, {}, true);

        const widget = {
            name: 'Widget default',
            queryUrl: 'query/5be16fea-5b1a-4daf-a9e9-9dc1f6ea6d4e?sql=select * from crops',
            application: ['rw'],
            description: 'updated widget description',
            source: 'widget source',
            sourceUrl: 'http://bar.foo',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig: { ...widgetConfig, someNewProp: 'someNewValue' }
        };

        let databaseWidget = await Widget.findById(widgetOne.id).exec();

        databaseWidget.name.should.not.equal(widget.name);
        databaseWidget.description.should.not.equal(widget.description);
        databaseWidget.sourceUrl.should.not.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.not.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.not.deep.equal(widget.widgetConfig);
        new Date(databaseWidget.updatedAt).should.beforeDate(new Date());

        mockWebshot();
        const response = await requester
            .patch(`/api/v1/widget/${widgetOne.id}`)
            .set('Authorization', `Bearer abcd`)
            .send({ dataset: widgetOne.dataset, widget });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const updatedWidget = response.body.data;

        updatedWidget.attributes.name.should.equal(widget.name);
        updatedWidget.attributes.description.should.equal(widget.description);
        updatedWidget.attributes.dataset.should.equal(widgetOne.dataset);
        updatedWidget.attributes.sourceUrl.should.equal(widget.sourceUrl);
        updatedWidget.attributes.queryUrl.should.equal(widget.queryUrl);
        updatedWidget.attributes.widgetConfig.should.deep.equal(widget.widgetConfig);
        updatedWidget.attributes.updatedAt.should.not.equal(databaseWidget.updatedAt);
        new Date(updatedWidget.attributes.updatedAt).should.equalDate(new Date());

        databaseWidget = await Widget.findById(widgetOne.id).exec();

        databaseWidget.name.should.equal(widget.name);
        databaseWidget.description.should.equal(widget.description);
        databaseWidget.sourceUrl.should.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.deep.equal(widget.widgetConfig);
        databaseWidget.widgetConfig.should.deep.equal(widget.widgetConfig);
        new Date(databaseWidget.updatedAt).should.equalDate(new Date());
    });

    it('Update a widget as an USER with a matching app should be successful', async () => {
        mockGetUserFromToken(USERS.USER);
        const widgetOne = await new Widget(createWidget({ userId: USERS.USER.id })).save();

        mockDataset(widgetOne.dataset, {}, true);

        const widget = {
            name: 'Widget default',
            queryUrl: 'query/5be16fea-5b1a-4daf-a9e9-9dc1f6ea6d4e?sql=select * from crops',
            application: ['rw'],
            description: 'updated widget description',
            source: 'widget source',
            sourceUrl: 'http://bar.foo',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig: { ...widgetConfig, someNewProp: 'someNewValue' }
        };

        let databaseWidget = await Widget.findById(widgetOne.id).exec();

        databaseWidget.name.should.not.equal(widget.name);
        databaseWidget.description.should.not.equal(widget.description);
        databaseWidget.sourceUrl.should.not.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.not.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.not.deep.equal(widget.widgetConfig);
        new Date(databaseWidget.updatedAt).should.beforeDate(new Date());

        mockWebshot();
        const response = await requester
            .patch(`/api/v1/widget/${widgetOne.id}`)
            .set('Authorization', `Bearer abcd`)
            .send({ dataset: widgetOne.dataset, widget });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const updatedWidget = response.body.data;

        updatedWidget.attributes.name.should.equal(widget.name);
        updatedWidget.attributes.description.should.equal(widget.description);
        updatedWidget.attributes.dataset.should.equal(widgetOne.dataset);
        updatedWidget.attributes.sourceUrl.should.equal(widget.sourceUrl);
        updatedWidget.attributes.queryUrl.should.equal(widget.queryUrl);
        updatedWidget.attributes.widgetConfig.should.deep.equal(widget.widgetConfig);
        new Date(updatedWidget.attributes.updatedAt).should.equalDate(new Date());

        databaseWidget = await Widget.findById(widgetOne.id).exec();

        databaseWidget.name.should.equal(widget.name);
        databaseWidget.description.should.equal(widget.description);
        databaseWidget.sourceUrl.should.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.deep.equal(widget.widgetConfig);
        new Date(databaseWidget.updatedAt).should.equalDate(new Date());
    });

    it('Update a widget as an MANAGER with a matching app should be successful', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        const widgetOne = await new Widget(createWidget({ userId: USERS.MANAGER.id })).save();

        mockDataset(widgetOne.dataset, {}, true);

        const widget = {
            name: 'Widget default',
            queryUrl: 'query/5be16fea-5b1a-4daf-a9e9-9dc1f6ea6d4e?sql=select * from crops',
            application: ['rw'],
            description: 'updated widget description',
            source: 'widget source',
            sourceUrl: 'http://bar.foo',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig: { ...widgetConfig, someNewProp: 'someNewValue' }
        };

        let databaseWidget = await Widget.findById(widgetOne.id).exec();

        databaseWidget.name.should.not.equal(widget.name);
        databaseWidget.description.should.not.equal(widget.description);
        databaseWidget.sourceUrl.should.not.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.not.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.not.deep.equal(widget.widgetConfig);
        new Date(databaseWidget.updatedAt).should.beforeDate(new Date());

        mockWebshot();
        const response = await requester
            .patch(`/api/v1/widget/${widgetOne.id}`)
            .set('Authorization', `Bearer abcd`)
            .send({ dataset: widgetOne.dataset, widget });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const updatedWidget = response.body.data;

        updatedWidget.attributes.name.should.equal(widget.name);
        updatedWidget.attributes.description.should.equal(widget.description);
        updatedWidget.attributes.dataset.should.equal(widgetOne.dataset);
        updatedWidget.attributes.sourceUrl.should.equal(widget.sourceUrl);
        updatedWidget.attributes.queryUrl.should.equal(widget.queryUrl);
        updatedWidget.attributes.widgetConfig.should.deep.equal(widget.widgetConfig);
        new Date(updatedWidget.attributes.updatedAt).should.equalDate(new Date());

        databaseWidget = await Widget.findById(widgetOne.id).exec();

        databaseWidget.name.should.equal(widget.name);
        databaseWidget.description.should.equal(widget.description);
        databaseWidget.sourceUrl.should.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.deep.equal(widget.widgetConfig);
        new Date(databaseWidget.updatedAt).should.equalDate(new Date());
    });

    it('Update a widget as an MANAGER without a matching userId should fail with HTTP 403', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        const widgetOne = await new Widget(createWidget({ userId: USERS.USER.id })).save();

        mockDataset(widgetOne.dataset);

        const widget = {
            name: 'Widget default',
            queryUrl: 'query/5be16fea-5b1a-4daf-a9e9-9dc1f6ea6d4e?sql=select * from crops',
            application: ['rw'],
            description: 'widget description',
            source: 'widget source',
            sourceUrl: 'http://bar.foo',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig: { ...widgetConfig, someNewProp: 'someNewValue' }
        };

        const response = await requester
            .patch(`/api/v1/widget/${widgetOne.id}`)
            .set('Authorization', `Bearer abcd`)
            .send({ dataset: widgetOne.dataset, widget });

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array').and.length(1);
        response.body.errors[0].should.have.property('detail').and.equal('Forbidden');
    });

    it('Update a widget as an USER without a matching app should fail with HTTP 403', async () => {
        mockGetUserFromToken(USERS.USER);
        const widgetOne = await new Widget(createWidget({ application: ['potato'] })).save();

        mockDataset(widgetOne.dataset);

        const widget = {
            name: 'Widget default',
            queryUrl: 'query/5be16fea-5b1a-4daf-a9e9-9dc1f6ea6d4e?sql=select * from crops',
            application: ['rw'],
            description: 'updated widget description',
            source: 'widget source',
            sourceUrl: 'http://bar.foo',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig: { ...widgetConfig, someNewProp: 'someNewValue' }
        };

        let databaseWidget = await Widget.findById(widgetOne.id).exec();

        databaseWidget.name.should.not.equal(widget.name);
        databaseWidget.description.should.not.equal(widget.description);
        databaseWidget.sourceUrl.should.not.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.not.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.not.deep.equal(widget.widgetConfig);

        const response = await requester
            .patch(`/api/v1/widget/${widgetOne.id}`)
            .set('Authorization', `Bearer abcd`)
            .send({ dataset: widgetOne.dataset, widget });

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array').and.length(1);
        response.body.errors[0].should.have.property('detail').and.equal('Forbidden');

        databaseWidget = await Widget.findById(widgetOne.id).exec();

        databaseWidget.name.should.not.equal(widget.name);
        databaseWidget.description.should.not.equal(widget.description);
        databaseWidget.sourceUrl.should.not.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.not.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.not.deep.equal(widget.widgetConfig);
        new Date(databaseWidget.updatedAt).should.beforeDate(new Date());
    });

    it('Updating a widget when taking a snapshot fails should still succeed', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const widgetOne = await new Widget(createWidget()).save();

        mockDataset(widgetOne.dataset, {}, true);

        const widget = {
            name: 'Widget default',
            queryUrl: 'query/5be16fea-5b1a-4daf-a9e9-9dc1f6ea6d4e?sql=select * from crops',
            application: [
                'rw'
            ],
            description: 'updated widget description',
            source: 'widget source',
            sourceUrl: 'http://bar.foo',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig: { ...widgetConfig, someNewProp: 'someNewValue' }
        };

        let databaseWidget = await Widget.findById(widgetOne.id).exec();

        databaseWidget.name.should.not.equal(widget.name);
        databaseWidget.description.should.not.equal(widget.description);
        databaseWidget.sourceUrl.should.not.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.not.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.not.deep.equal(widget.widgetConfig);
        new Date(databaseWidget.updatedAt).should.beforeDate(new Date());

        mockWebshot(false);
        const response = await requester
            .patch(`/api/v1/widget/${widgetOne.id}`)
            .set('Authorization', `Bearer abcd`)
            .send({
                widget,
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const updatedWidget = response.body.data;

        updatedWidget.attributes.name.should.equal(widget.name);
        updatedWidget.attributes.description.should.equal(widget.description);
        updatedWidget.attributes.dataset.should.equal(widgetOne.dataset);
        updatedWidget.attributes.sourceUrl.should.equal(widget.sourceUrl);
        updatedWidget.attributes.queryUrl.should.equal(widget.queryUrl);
        updatedWidget.attributes.widgetConfig.should.deep.equal(widget.widgetConfig);
        updatedWidget.attributes.updatedAt.should.not.equal(databaseWidget.updatedAt);
        new Date(updatedWidget.attributes.updatedAt).should.equalDate(new Date());

        databaseWidget = await Widget.findById(widgetOne.id).exec();

        databaseWidget.name.should.equal(widget.name);
        databaseWidget.description.should.equal(widget.description);
        databaseWidget.sourceUrl.should.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.deep.equal(widget.widgetConfig);
        databaseWidget.widgetConfig.should.deep.equal(widget.widgetConfig);
        new Date(databaseWidget.updatedAt).should.equalDate(new Date());
    });

    it('Updating a widget with widgetConfig value to a JSON string should fail', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const widgetOne = await new Widget(createWidget()).save();

        mockDataset(widgetOne.dataset);

        const widget = {
            name: 'Widget default',
            queryUrl: 'query/5be16fea-5b1a-4daf-a9e9-9dc1f6ea6d4e?sql=select * from crops',
            application: [
                'rw'
            ],
            description: 'widget description',
            source: 'widget source',
            sourceUrl: 'http://bar.foo',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig: '{}'
        };

        const response = await requester
            .patch(`/api/v1/widget/${widgetOne.id}`)
            .set('Authorization', `Bearer abcd`)
            .send({
                widget,
            });

        response.status.should.equal(400);
        ensureCorrectError(response.body, '- widgetConfig: must be an object - ');
    });

    it('Updating a widget with an empty value for a string field should be successful', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const widgetOne = await new Widget(createWidget({ layerId: 'layer Id' })).save();

        mockDataset(widgetOne.dataset, {}, true);

        const widget = {
            name: 'Widget default',
            queryUrl: '',
            application: [
                'rw'
            ],
            description: '',
            source: '',
            authors: ''
        };

        mockWebshot();
        const response = await requester
            .patch(`/api/v1/widget/${widgetOne.id}`)
            .set('Authorization', `Bearer abcd`)
            .send({
                widget,
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const updatedWidget = response.body.data;

        updatedWidget.attributes.name.should.equal(widget.name);
        updatedWidget.attributes.description.should.equal(widget.description);
        updatedWidget.attributes.source.should.equal(widget.source);
        updatedWidget.attributes.queryUrl.should.equal(widget.queryUrl);
        updatedWidget.attributes.authors.should.deep.equal(widget.authors);
        new Date(updatedWidget.attributes.updatedAt).should.equalDate(new Date());

        const databaseWidget = await Widget.findById(widgetOne.id).exec();

        databaseWidget.name.should.equal(widget.name);
        databaseWidget.description.should.equal(widget.description);
        databaseWidget.queryUrl.should.equal(widget.queryUrl);
        databaseWidget.source.should.equal(widget.source);
        databaseWidget.authors.should.equal(widget.authors);
        new Date(databaseWidget.updatedAt).should.equalDate(new Date());
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
