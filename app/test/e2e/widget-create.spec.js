/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const { ROLES } = require('./test.constants');

const { getTestServer } = require('./test-server');
const { widgetConfig } = require('./utils');

const should = chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Create widgets tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        Widget.remove({}).exec();
    });

    it('Create a widget as an anonymous user should fail with a 401 error code', async () => {
        nock(`${process.env.CT_URL}/v1`)
            .get('/dataset/39f5dc1f-5e45-41d8-bcd5-96941c8a7e79')
            .reply(200, {
                data: {
                    id: '39f5dc1f-5e45-41d8-bcd5-96941c8a7e79',
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
            .send({
                dataset: '39f5dc1f-5e45-41d8-bcd5-96941c8a7e79',
                widget
            });

        response.status.should.equal(401);
    });

    it('Create a widget as an ADMIN should be successful', async () => {
        nock(`${process.env.CT_URL}/v1`)
            .get('/dataset/39f5dc1f-5e45-41d8-bcd5-96941c8a7e79')
            .reply(200, {
                data: {
                    id: '39f5dc1f-5e45-41d8-bcd5-96941c8a7e79',
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
            description: '',
            source: '',
            sourceUrl: 'http://foo.bar',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig
        };

        nock(`${process.env.CT_URL}`)
            .post(uri => uri.match(/\/v1\/webshot\/widget\/(\w|-)*\/thumbnail/))
            .reply(
                200,
                { data: { widgetThumbnail: 'http://thumbnail-url.com/file.png' } }
            );

        const response = await requester
            .post(`/api/v1/widget`)
            .send({
                dataset: '39f5dc1f-5e45-41d8-bcd5-96941c8a7e79',
                widget,
                loggedUser: ROLES.ADMIN
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.attributes.name.should.equal(widget.name);
        createdWidget.attributes.description.should.equal(widget.description);
        createdWidget.attributes.dataset.should.equal('39f5dc1f-5e45-41d8-bcd5-96941c8a7e79');
        createdWidget.attributes.sourceUrl.should.equal(widget.sourceUrl);
        createdWidget.attributes.queryUrl.should.equal(widget.queryUrl);
        createdWidget.attributes.thumbnailUrl.should.equal('http://thumbnail-url.com/file.png');
        createdWidget.attributes.widgetConfig.should.deep.equal(widget.widgetConfig);

        const databaseWidget = await Widget.findById(createdWidget.id).exec();

        databaseWidget.name.should.equal(widget.name);
        databaseWidget.description.should.equal(widget.description);
        databaseWidget.sourceUrl.should.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.equal(widget.queryUrl);
        databaseWidget.thumbnailUrl.should.equal('http://thumbnail-url.com/file.png');
        databaseWidget.widgetConfig.should.deep.equal(widget.widgetConfig);
    });

    it('Create a widget as an USER with a matching app should be successful', async () => {
        nock(`${process.env.CT_URL}/v1`)
            .get('/dataset/39f5dc1f-5e45-41d8-bcd5-96941c8a7e79')
            .reply(200, {
                data: {
                    id: '39f5dc1f-5e45-41d8-bcd5-96941c8a7e79',
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
            description: '',
            source: '',
            sourceUrl: 'http://foo.bar',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig
        };

        nock(`${process.env.CT_URL}`)
            .post(uri => uri.match(/\/v1\/webshot\/widget\/(\w|-)*\/thumbnail/))
            .reply(
                200,
                { data: { widgetThumbnail: 'http://thumbnail-url.com/file.png' } }
            );

        const response = await requester
            .post(`/api/v1/widget`)
            .send({
                dataset: '39f5dc1f-5e45-41d8-bcd5-96941c8a7e79',
                widget,
                loggedUser: ROLES.USER
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.attributes.name.should.equal(widget.name);
        createdWidget.attributes.description.should.equal(widget.description);
        createdWidget.attributes.dataset.should.equal('39f5dc1f-5e45-41d8-bcd5-96941c8a7e79');
        createdWidget.attributes.sourceUrl.should.equal(widget.sourceUrl);
        createdWidget.attributes.queryUrl.should.equal(widget.queryUrl);
        createdWidget.attributes.thumbnailUrl.should.equal('http://thumbnail-url.com/file.png');
        createdWidget.attributes.widgetConfig.should.deep.equal(widget.widgetConfig);

        const databaseWidget = await Widget.findById(createdWidget.id).exec();

        databaseWidget.name.should.equal(widget.name);
        databaseWidget.description.should.equal(widget.description);
        databaseWidget.sourceUrl.should.equal(widget.sourceUrl);
        databaseWidget.queryUrl.should.equal(widget.queryUrl);
        databaseWidget.thumbnailUrl.should.equal('http://thumbnail-url.com/file.png');
        databaseWidget.widgetConfig.should.deep.equal(widget.widgetConfig);
    });

    it('Create a widget as an USER without a matching app should fail with HTTP 403', async () => {
        nock(`${process.env.CT_URL}/v1`)
            .get('/dataset/39f5dc1f-5e45-41d8-bcd5-96941c8a7e79')
            .reply(200, {
                data: {
                    id: '39f5dc1f-5e45-41d8-bcd5-96941c8a7e79',
                    type: 'dataset',
                    attributes: {
                        name: 'Seasonal variability',
                        slug: 'Seasonal-variability',
                        type: null,
                        subtitle: null,
                        application: [
                            'potato'
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
                'potato'
            ],
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
            .send({
                dataset: '39f5dc1f-5e45-41d8-bcd5-96941c8a7e79',
                widget,
                loggedUser: ROLES.USER
            });

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array').and.length(1);
        response.body.errors[0].should.have.property('detail').and.equal('Forbidden');
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
