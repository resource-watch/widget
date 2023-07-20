const nock = require('nock');
const Widget = require('models/widget.model');
const config = require('config');
const { mockValidateRequest, mockCloudWatchLogRequest } = require('rw-api-microservice-node/dist/test-mocks');
const { WIDGET_CONFIG, USERS } = require('./test.constants');

const getUUID = () => Math.random().toString(36).substring(7);

const ensureCorrectError = (body, errMessage) => {
    body.should.have.property('errors').and.be.an('array');
    body.errors[0].should.have.property('detail').and.equal(errMessage);
};

const APPLICATION = {
    data: {
        type: 'applications',
        id: '649c4b204967792f3a4e52c9',
        attributes: {
            name: 'grouchy-armpit',
            organization: null,
            user: null,
            apiKeyValue: 'a1a9e4c3-bdff-4b6b-b5ff-7a60a0454e13',
            createdAt: '2023-06-28T15:00:48.149Z',
            updatedAt: '2023-06-28T15:00:48.149Z'
        }
    }
};

const mockValidateRequestWithApiKey = ({
    apiKey = 'api-key-test',
    application = APPLICATION
}) => {
    mockValidateRequest({
        gatewayUrl: process.env.GATEWAY_URL,
        microserviceToken: process.env.MICROSERVICE_TOKEN,
        application,
        apiKey
    });
    mockCloudWatchLogRequest({
        application,
        awsRegion: process.env.AWS_REGION,
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: config.get('service.name')
    });
};

const mockValidateRequestWithApiKeyAndUserToken = ({
    apiKey = 'api-key-test',
    token = 'abcd',
    application = APPLICATION,
    user = USERS.USER
}) => {
    mockValidateRequest({
        gatewayUrl: process.env.GATEWAY_URL,
        microserviceToken: process.env.MICROSERVICE_TOKEN,
        user,
        application,
        token,
        apiKey
    });
    mockCloudWatchLogRequest({
        user,
        application,
        awsRegion: process.env.AWS_REGION,
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: config.get('service.name')
    });
};

// const mockGetUserFromToken = (userProfile) => {
//     nock(process.env.GATEWAY_URL, { reqheaders: { authorization: 'Bearer abcd' } })
//         .get('/auth/user/me')
//         .reply(200, userProfile);
// };

const createAuthCases = (url, initMethod, providedRequester) => {
    let requester = providedRequester;
    const { USER, ADMIN, WRONG_ADMIN } = USERS;

    const setRequester = (req) => {
        requester = req;
    };

    const isUserForbidden = (to = url, method = initMethod) => async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USER });
        const response = await requester[method](to)
            .set('x-api-key', 'api-key-test')
            .send();
        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    };

    const isAdminForbidden = (to = url, method = initMethod) => async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: ADMIN });
        const response = await requester[method](to)
            .set('x-api-key', 'api-key-test')
            .send();
        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Not authorized');
    };

    const isRightAppRequired = (to = url, method = initMethod) => async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: WRONG_ADMIN });
        const response = await requester[method](to)
            .set('x-api-key', 'api-key-test')
            .send();
        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    };

    const isLoggedUserRequired = (to = url, method = initMethod) => async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester[method](to)
            .set('x-api-key', 'api-key-test')
            .send();
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

const createVocabulary = (widgetID) => ({
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

// const createWidget = (apps = ['rw'], userId = '1a10d7c6e0a37126611fd7a7', datasetID, customerWidgetConfig, widgetId) => {
const createWidget = (anotherData = {}) => {
    const uuid = anotherData._id || getUUID();
    delete anotherData._id;

    return {
        _id: uuid,
        name: `Widget ${uuid}`,
        dataset: getUUID(),
        userId: '1a10d7c6e0a37126611fd7a7',
        slug: `widget-${uuid}`,
        description: 'widget description',
        source: 'widget source',
        sourceUrl: 'http://foo.bar',
        authors: 'widget authors',
        queryUrl: `query/${getUUID()}?sql=select * from crops`,
        widgetConfig: WIDGET_CONFIG,
        freeze: false,
        published: true,
        template: false,
        defaultEditableWidget: false,
        thumbnailUrl: 'http://the-default-thumbnail.com/image.png',
        protected: false,
        default: true,
        verified: false,
        application: ['rw'],
        env: 'production',
        createdAt: new Date(2018, 1, 1),
        updatedAt: new Date(2018, 1, 1),
        ...anotherData
    };
};

const ensureCorrectWidget = (actualWidgetModel, expectedWidget) => {
    const widget = { ...expectedWidget, ...expectedWidget.attributes };
    delete widget.attributes;
    delete widget.type;

    let actualWidget = actualWidgetModel;
    if (actualWidgetModel.toObject) {
        actualWidget = actualWidgetModel.toObject();
    }
    actualWidget.id = actualWidget._id;
    actualWidget.updatedAt = actualWidget.updatedAt.toISOString();
    actualWidget.createdAt = actualWidget.createdAt.toISOString();
    // eslint-disable-next-line no-underscore-dangle
    delete actualWidget.__v;
    delete actualWidget._id;
    delete actualWidget.userName;
    delete actualWidget.userRole;

    actualWidget.should.deep.equal(widget);
};

const widgetConfig = WIDGET_CONFIG;

const createWidgetInDB = async (widgetData) => {
    const data = createWidget(widgetData);
    const savedWidget = await new Widget(data).save();
    return Widget.findById(savedWidget._id);
};

const mockDataset = (id, responseData = {}, twice = false) => {
    const data = {
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
        },
        ...responseData
    };

    const scope = nock(`${process.env.GATEWAY_URL}/v1`).get(`/dataset/${id}`);
    if (twice) scope.twice();
    scope.reply(200, { data });

    return data;
};

const mockWebshot = (success = true, responseData = {}) => {
    const data = { widgetThumbnail: 'http://thumbnail-url.com/file.png', ...responseData };
    nock(process.env.GATEWAY_URL, {
        reqheaders: {
            'x-api-key': 'api-key-test',
        }
    })
        .post((uri) => uri.match(/\/v1\/webshot\/widget\/(\w|-)*\/thumbnail/))
        .reply(success ? 200 : 500, { data });
};

module.exports = {
    mockValidateRequestWithApiKeyAndUserToken,
    mockValidateRequestWithApiKey,
    createWidget,
    getUUID,
    ensureCorrectWidget,
    widgetConfig,
    createWidgetInDB,
    createAuthCases,
    ensureCorrectError,
    createWidgetMetadata,
    createVocabulary,
    mockDataset,
    mockWebshot,
};
