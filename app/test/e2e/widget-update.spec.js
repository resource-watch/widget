/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const chaiDatetime = require('chai-datetime');
const { ROLES } = require('./test.constants');

const { getTestServer } = require('./test-server');
const { widgetConfig, getUUID, createWidget } = require('./utils');

const should = chai.should();
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

        Widget.remove({}).exec();
    });

    it('Update a widget as an anonymous user should fail with a 401 error code', async () => {
        const response = await requester
            .patch(`/api/v1/widget/${getUUID()}`)
            .send();

        response.status.should.equal(401);
    });

    it('Update a widget that doesn\'t exist should fail with a 404 error code', async () => {
        const response = await requester
            .patch(`/api/v1/widget/${getUUID()}`)
            .send({
                loggedUser: ROLES.ADMIN
            });

        response.status.should.equal(404);
    });

    it('Update a widget as an ADMIN should be successful', async () => {
        const widgetOne = await new Widget(createWidget()).save();

        nock(`${process.env.CT_URL}/v1`)
            .get(`/dataset/${widgetOne.dataset}`)
            .twice()
            .reply(200, {
                data: {
                    id: widgetOne.dataset,
                    type: 'dataset',
                    attributes: {
                        name: 'Seasonal variability',
                        slug: 'Seasonal-variability',
                        type: null,
                        subtitle: null,
                        application: [
                            'rw'
                        ],
                        dataPath: null,
                        attributesPath: null,
                        connectorType: 'rest',
                        provider: 'cartodb',
                        userId: '1a10d7c6e0a37126611fd7a7',
                        connectorUrl: 'https://wri-01.carto.com/tables/rw_projections_20150309/public',
                        tableName: 'rw_projections_20150309',
                        status: 'pending',
                        published: true,
                        overwrite: false,
                        verified: false,
                        blockchain: {},
                        mainDateField: null,
                        env: 'production',
                        geoInfo: false,
                        protected: false,
                        legend: {
                            date: [],
                            region: [],
                            country: [],
                            nested: []
                        },
                        clonedHost: {},
                        errorMessage: null,
                        taskId: null,
                        updatedAt: '2018-11-19T11:45:44.405Z',
                        dataLastUpdated: null,
                        widgetRelevantProps: [],
                        layerRelevantProps: []
                    }
                }
            });

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
            widgetConfig: Object.assign({}, widgetConfig, { someNewProp: 'someNewValue' })
        };

        let databaseWidget = await Widget.findById(widgetOne.id).exec();

        databaseWidget.name.should.not.equal(widget.name);
        databaseWidget.description.should.not.equal(widget.description);
        databaseWidget.sourceUrl.should.not.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.not.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.not.deep.equal(widget.widgetConfig);
        new Date(databaseWidget.updatedAt).should.beforeDate(new Date());

        nock(`${process.env.CT_URL}`)
            .post(uri => uri.match(/\/v1\/webshot\/widget\/(\w|-)*\/thumbnail/))
            .reply(
                200,
                { data: { widgetThumbnail: 'http://thumbnail-url.com/file.png' } }
            );

        const response = await requester
            .patch(`/api/v1/widget/${widgetOne.id}`)
            .send({
                dataset: widgetOne.dataset,
                widget,
                loggedUser: ROLES.ADMIN
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

    it('Update a widget as an USER with a matching app should be successful', async () => {
        const widgetOne = await new Widget(createWidget()).save();

        nock(`${process.env.CT_URL}/v1`)
            .get(`/dataset/${widgetOne.dataset}`)
            .twice()
            .reply(200, {
                data: {
                    id: widgetOne.dataset,
                    type: 'dataset',
                    attributes: {
                        name: 'Seasonal variability',
                        slug: 'Seasonal-variability',
                        type: null,
                        subtitle: null,
                        application: [
                            'rw'
                        ],
                        dataPath: null,
                        attributesPath: null,
                        connectorType: 'rest',
                        provider: 'cartodb',
                        userId: '1a10d7c6e0a37126611fd7a7',
                        connectorUrl: 'https://wri-01.carto.com/tables/rw_projections_20150309/public',
                        tableName: 'rw_projections_20150309',
                        status: 'pending',
                        published: true,
                        overwrite: false,
                        verified: false,
                        blockchain: {},
                        mainDateField: null,
                        env: 'production',
                        geoInfo: false,
                        protected: false,
                        legend: {
                            date: [],
                            region: [],
                            country: [],
                            nested: []
                        },
                        clonedHost: {},
                        errorMessage: null,
                        taskId: null,
                        updatedAt: '2018-11-19T11:45:44.405Z',
                        dataLastUpdated: null,
                        widgetRelevantProps: [],
                        layerRelevantProps: []
                    }
                }
            });

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
            widgetConfig: Object.assign({}, widgetConfig, { someNewProp: 'someNewValue' })
        };

        let databaseWidget = await Widget.findById(widgetOne.id).exec();

        databaseWidget.name.should.not.equal(widget.name);
        databaseWidget.description.should.not.equal(widget.description);
        databaseWidget.sourceUrl.should.not.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.not.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.not.deep.equal(widget.widgetConfig);
        new Date(databaseWidget.updatedAt).should.beforeDate(new Date());

        nock(`${process.env.CT_URL}`)
            .post(uri => uri.match(/\/v1\/webshot\/widget\/(\w|-)*\/thumbnail/))
            .reply(
                200,
                { data: { widgetThumbnail: 'http://thumbnail-url.com/file.png' } }
            );

        const response = await requester
            .patch(`/api/v1/widget/${widgetOne.id}`)
            .send({
                dataset: widgetOne.dataset,
                widget,
                loggedUser: ROLES.USER
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
        new Date(updatedWidget.attributes.updatedAt).should.equalDate(new Date());

        databaseWidget = await Widget.findById(widgetOne.id).exec();

        databaseWidget.name.should.equal(widget.name);
        databaseWidget.description.should.equal(widget.description);
        databaseWidget.sourceUrl.should.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.deep.equal(widget.widgetConfig);
        new Date(databaseWidget.updatedAt).should.equalDate(new Date());
    });

    it('Update a widget as an USER without a matching app should fail with HTTP 403', async () => {
        const widgetOne = await new Widget(createWidget(['potato'])).save();

        nock(`${process.env.CT_URL}/v1`)
            .get(`/dataset/${widgetOne.dataset}`)
            .reply(200, {
                data: {
                    id: widgetOne.dataset,
                    type: 'dataset',
                    attributes: {
                        name: 'Seasonal variability',
                        slug: 'Seasonal-variability',
                        type: null,
                        subtitle: null,
                        application: [
                            'rw'
                        ],
                        dataPath: null,
                        attributesPath: null,
                        connectorType: 'rest',
                        provider: 'cartodb',
                        userId: '1a10d7c6e0a37126611fd7a7',
                        connectorUrl: 'https://wri-01.carto.com/tables/rw_projections_20150309/public',
                        tableName: 'rw_projections_20150309',
                        status: 'pending',
                        published: true,
                        overwrite: false,
                        verified: false,
                        blockchain: {},
                        mainDateField: null,
                        env: 'production',
                        geoInfo: false,
                        protected: false,
                        legend: {
                            date: [],
                            region: [],
                            country: [],
                            nested: []
                        },
                        clonedHost: {},
                        errorMessage: null,
                        taskId: null,
                        updatedAt: '2018-11-19T11:45:44.405Z',
                        dataLastUpdated: null,
                        widgetRelevantProps: [],
                        layerRelevantProps: []
                    }
                }
            });

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
            widgetConfig: Object.assign({}, widgetConfig, { someNewProp: 'someNewValue' })
        };

        let databaseWidget = await Widget.findById(widgetOne.id).exec();

        databaseWidget.name.should.not.equal(widget.name);
        databaseWidget.description.should.not.equal(widget.description);
        databaseWidget.sourceUrl.should.not.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.not.equal(widget.queryUrl);
        databaseWidget.widgetConfig.should.not.deep.equal(widget.widgetConfig);

        const response = await requester
            .patch(`/api/v1/widget/${widgetOne.id}`)
            .send({
                dataset: widgetOne.dataset,
                widget,
                loggedUser: ROLES.USER
            });

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

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(() => {
        Widget.remove({}).exec();
    });
});
