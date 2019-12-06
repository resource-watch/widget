const nock = require('nock');
const Widget = require('models/widget.model');
const { WIDGET_CONFIG, USERS } = require('./test.constants');

const getUUID = () => Math.random().toString(36).substring(7);

const ensureCorrectError = (body, errMessage) => {
    body.should.have.property('errors').and.be.an('array');
    body.errors[0].should.have.property('detail').and.equal(errMessage);
};

const createAuthCases = (url, initMethod, providedRequester) => {
    let requester = providedRequester;
    const { USER, ADMIN, WRONG_ADMIN } = USERS;

    const setRequester = (req) => { requester = req; };

    const isUserForbidden = (to = url, method = initMethod) => async () => {
        const response = await requester[method](to).query({ loggedUser: JSON.stringify(USER) }).send();
        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    };

    const isAdminForbidden = (to = url, method = initMethod) => async () => {
        const response = await requester[method](to).query({ loggedUser: JSON.stringify(ADMIN) }).send();
        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Not authorized');
    };

    const isRightAppRequired = (to = url, method = initMethod) => async () => {
        const response = await requester[method](to).query({ loggedUser: JSON.stringify(WRONG_ADMIN) }).send();
        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    };

    const isLoggedUserRequired = (to = url, method = initMethod) => async () => {
        const response = await requester[method](to).send();
        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    };

    return {
        setRequester,
        isRightAppRequired,
        isUserForbidden,
        isAdminForbidden,
        isLoggedUserRequired,
    };
};

const createWidgetMetadata = (datasetID, widgetID) => ({
    _id: widgetID,
    type: 'widget',
    attributes: {
        dataset: datasetID,
        language: 'en',
        name: `Fake metadata ${widgetID} name`,
        description: `Fake metadata ${widgetID} description`,
        info: {
            too: 'par'
        },
        units: {
            foo: 'bar'
        },
        columns: {
            noo: 'zar'
        },
        status: 'published',
        createdAt: '2019-07-30T09:19:14.563Z',
        updatedAt: '2019-07-30T09:19:14.563Z',
    },
    resource: {
        id: widgetID,
        type: 'metadata'
    },
});

const createVocabulary = widgetID => ({
    _id: getUUID(),
    type: 'vocabulary',
    attributes: {
        resource: {
            id: widgetID,
            type: 'widget'
        },
        id: getUUID(),
        tags: [
            'daily',
            'near_real_time',
            'geospatial',
            'raster',
            'forest',
            'fire'
        ],
        application: 'rw'
    }
});

const createWidget = (apps = ['rw'], userId = '1a10d7c6e0a37126611fd7a7', datasetID, customerWidgetConfig) => {
    const uuid = getUUID();
    const datasetUuid = datasetID || getUUID();

    return {
        _id: uuid,
        name: `Widget ${uuid}`,
        dataset: datasetUuid,
        userId,
        slug: `widget-${uuid}`,
        description: '',
        source: '',
        sourceUrl: 'http://foo.bar',
        authors: '',
        queryUrl: `query/${getUUID()}?sql=select * from crops`,
        widgetConfig: customerWidgetConfig || WIDGET_CONFIG,
        freeze: false,
        published: true,
        template: false,
        defaultEditableWidget: false,
        thumbnailUrl: 'http://the-default-thumbnail.com/image.png',
        protected: false,
        default: true,
        verified: false,
        application: apps,
        env: 'production',
        createdAt: new Date(2018, 1, 1),
        updatedAt: new Date(2018, 1, 1)
    };
};

const ensureCorrectWidget = (actualWidget, expectedWidget) => {
    actualWidget.name.should.equal(expectedWidget.attributes.name);
    actualWidget.dataset.should.equal(expectedWidget.attributes.dataset);
    actualWidget.userId.should.equal(expectedWidget.attributes.userId);
    actualWidget.slug.should.equal(expectedWidget.attributes.slug);
    actualWidget.sourceUrl.should.equal(expectedWidget.attributes.sourceUrl);
    actualWidget.queryUrl.should.equal(expectedWidget.attributes.queryUrl);
};

const widgetConfig = WIDGET_CONFIG;

const createWidgetInDB = ({
    apps, userId, datasetID, customerWidgetConfig
}) => new Widget(createWidget(apps, userId, datasetID, customerWidgetConfig)).save();

const mockDataset = (id, responseData = {}) => {
    nock(`${process.env.CT_URL}/v1`)
        .get(`/dataset/${id}`)
        .reply(200, {
            data: Object.assign({}, {
                id,
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
            }, responseData)
        });
};

module.exports = {
    createWidget,
    getUUID,
    ensureCorrectWidget,
    widgetConfig,
    createWidgetInDB,
    createAuthCases,
    ensureCorrectError,
    createWidgetMetadata,
    createVocabulary,
    mockDataset
};
