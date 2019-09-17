/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const { USERS: { USER, MANAGER, ADMIN }, SINGLE_WIDGET_CONFIG } = require('./utils/test.constants');

const should = chai.should();

const { createRequest } = require('./utils/test-server');
const {
    createWidgetInDB,
    getUUID,
    createWidgetMetadata,
    createAuthCases,
    ensureCorrectError,
    createVocabulary
} = require('./utils/helpers');
const { createMockUser, createMockGetMetadata, createMockVocabulary } = require('./utils/mock');

const prefix = '/api/v1/widget/';
let widget;

const authCases = createAuthCases('123', 'delete');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const ensureCorrectWidget = (response, createdWidget, additionalData = {}) => {
    response.body.should.have.property('data').and.instanceOf(Object);
    const { data } = response.body;

    data.id.should.equal(createdWidget._id);
    data.type.should.equal('widget');
    data.should.have.property('attributes').and.instanceOf(Object);

    const expectedWidget = {
        ...createdWidget._doc,
        createdAt: createdWidget.createdAt.toISOString(),
        updatedAt: createdWidget.updatedAt.toISOString(),
        ...additionalData
    };
    // remove fields which are not present to user from response body;
    delete expectedWidget._id;
    delete expectedWidget.__v;

    data.attributes.should.deep.equal(expectedWidget);
};

describe('Get widget by id endpoint', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        nock.cleanAll();

        widget = await createRequest(prefix, 'get');
        authCases.setRequester(widget);

        Widget.remove({}).exec();
    });

    it('Getting widget when widget doesn\'t exist should return not found', async () => {
        const response = await widget.get('123').send({ dataset: getUUID() });
        response.status.should.equal(404);
        ensureCorrectError(response.body, 'Widget not found with the id 123');
    });

    it('Getting widget should return widget (happy case)', async () => {
        const datasetID = getUUID();

        const createdWidget = await createWidgetInDB({ datasetID });
        const response = await widget.get(createdWidget._id).send({ dataset: datasetID });
        response.status.should.equal(200);

        ensureCorrectWidget(response, createdWidget);
    });

    it('Getting widget with vocabulary should return widget with vocabulary (happy case)', async () => {
        const datasetID = getUUID();
        const createdWidget = await createWidgetInDB({ datasetID });
        const vocabulary = createVocabulary(createdWidget._id);
        createMockVocabulary(vocabulary, datasetID, createdWidget._id);

        const response = await widget
            .get(createdWidget._id)
            .query({ includes: ['vocabulary'] })
            .send({ dataset: datasetID });
        response.status.should.equal(200);

        ensureCorrectWidget(response, createdWidget, { vocabulary });
    });

    it('Getting widget with users should return widget with users (happy case)', async () => {
        createMockUser([USER]);
        const datasetID = getUUID();

        const createdWidget = await createWidgetInDB({ datasetID, userId: USER.id });
        const response = await widget
            .get(createdWidget._id)
            .query({ includes: 'user' })
            .send({ dataset: datasetID });
        response.status.should.equal(200);

        ensureCorrectWidget(response, createdWidget, {
            user: {
                email: USER.email,
                name: USER.name
            }
        });
    });

    it('Getting widget with includes=metadata should return widget with metadata (happy case)', async () => {
        const datasetID = getUUID();
        const createdWidget = await createWidgetInDB({ datasetID, userId: USER.id });
        const metadata = createWidgetMetadata(datasetID, createdWidget._id);
        createMockGetMetadata(metadata, datasetID);

        const response = await widget
            .get(createdWidget._id)
            .query({ includes: 'metadata' })
            .send({ dataset: datasetID });
        response.status.should.equal(200);

        ensureCorrectWidget(response, createdWidget, { metadata });
    });

    it('Getting widget as an anonymous user with includes=user should return widget with user name and email (happy case)', async () => {
        const datasetID = getUUID();
        const createdWidget = await createWidgetInDB({ datasetID, userId: USER.id });
        createMockUser([USER]);

        const response = await widget
            .get(createdWidget._id)
            .query({ includes: 'user' })
            .send({ dataset: datasetID });
        response.status.should.equal(200);

        ensureCorrectWidget(response, createdWidget, { user: { email: USER.email, name: USER.name } });
    });

    it('Getting widget with USER role and includes=user should return widget with user name and email (happy case)', async () => {
        const datasetID = getUUID();
        const createdWidget = await createWidgetInDB({ datasetID, userId: USER.id });
        createMockUser([USER]);

        const response = await widget
            .get(createdWidget._id)
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(USER)
            })
            .send({ dataset: datasetID });
        response.status.should.equal(200);

        ensureCorrectWidget(response, createdWidget, { user: { email: USER.email, name: USER.name } });
    });

    it('Getting widget with MANAGER role and includes=user should return widget with user name and email (happy case)', async () => {
        const datasetID = getUUID();
        const createdWidget = await createWidgetInDB({ datasetID, userId: USER.id });
        createMockUser([USER]);

        const response = await widget
            .get(createdWidget._id)
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(MANAGER)
            })
            .send({ dataset: datasetID });
        response.status.should.equal(200);

        ensureCorrectWidget(response, createdWidget, { user: { email: USER.email, name: USER.name } });
    });

    it('Getting widget with ADMIN role and includes=user should return widget with user name and email (happy case)', async () => {
        const datasetID = getUUID();
        const createdWidget = await createWidgetInDB({ datasetID, userId: USER.id });
        createMockUser([USER]);

        const response = await widget
            .get(createdWidget._id)
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(ADMIN)
            })
            .send({ dataset: datasetID });
        response.status.should.equal(200);

        ensureCorrectWidget(response, createdWidget, { user: { email: USER.email, name: USER.name, role: USER.role } });
    });

    it('Getting widget with widgetConfig as array with queryUrl should return widget with changed queryUrl (happy case)', async () => {
        const datasetID = getUUID();
        const testURL = 'http://testt.test.com';

        const createdWidget = await createWidgetInDB({ datasetID });
        const response = await widget
            .get(createdWidget._id)
            .query({ queryUrl: testURL })
            .send({ dataset: datasetID });
        response.status.should.equal(200);

        ensureCorrectWidget(response, createdWidget, {
            queryUrl: testURL,
            widgetConfig: {
                ...createdWidget.widgetConfig,
                data: [
                    {
                        ...createdWidget.widgetConfig.data[0],
                        url: testURL
                    },
                    ...createdWidget.widgetConfig.data.slice(1, createdWidget.widgetConfig.data.length),
                ]
            }
        });
    });

    it('Getting widget with widgetConfig as array with queryURL with custom params should return widget with queryUQL with custom params (happy case)', async () => {
        const datasetID = getUUID();

        const createdWidget = await createWidgetInDB({ datasetID });
        const response = await widget
            .get(createdWidget._id)
            .query({ foo: 'bar', bar: 'foo' })
            .send({ dataset: datasetID });
        response.status.should.equal(200);

        ensureCorrectWidget(response, createdWidget, {
            queryUrl: `${createdWidget.queryUrl}&foo=bar&bar=foo`,
            widgetConfig: {
                ...createdWidget.widgetConfig,
                data: [
                    {
                        ...createdWidget.widgetConfig.data[0],
                        url: `${createdWidget.widgetConfig.data[0].url}&foo=bar&bar=foo`
                    },
                    ...createdWidget.widgetConfig.data.slice(1, createdWidget.widgetConfig.data.length),
                ]
            }
        });
    });

    it('Getting widget with widgetConfig single object with queryUrl should return widget with changed queryUrl (happy case)', async () => {
        const datasetID = getUUID();
        const testURL = 'http://testt.test.com';

        const createdWidget = await createWidgetInDB({ datasetID, customerWidgetConfig: SINGLE_WIDGET_CONFIG });
        const response = await widget
            .get(createdWidget._id)
            .query({ queryUrl: testURL })
            .send({ dataset: datasetID });
        response.status.should.equal(200);

        ensureCorrectWidget(response, createdWidget, {
            queryUrl: testURL,
            widgetConfig: {
                ...createdWidget.widgetConfig,
                data: {
                    ...SINGLE_WIDGET_CONFIG.data,
                    url: testURL
                },
            }
        });
    });

    it('Getting widget with widgetConfig as single object with queryURL with custom params should return widget with queryUQL with custom params (happy case)', async () => {
        const datasetID = getUUID();

        const createdWidget = await createWidgetInDB({ datasetID, customerWidgetConfig: SINGLE_WIDGET_CONFIG });
        const response = await widget
            .get(createdWidget._id)
            .query({ foo: 'bar', bar: 'foo' })
            .send({ dataset: datasetID });
        response.status.should.equal(200);

        ensureCorrectWidget(response, createdWidget, {
            queryUrl: `${createdWidget.queryUrl}&foo=bar&bar=foo`,
            widgetConfig: {
                ...createdWidget.widgetConfig,
                data: {
                    ...SINGLE_WIDGET_CONFIG.data,
                    url: `${SINGLE_WIDGET_CONFIG.data.url}&foo=bar&bar=foo`
                }
            }
        });
    });

    afterEach(() => {
        Widget.remove({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(() => {
        Widget.remove({}).exec();
    });
});
