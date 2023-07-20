/* eslint-disable no-unused-vars,no-undef,no-underscore-dangle */
const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const { USERS } = require('./utils/test.constants');

const { getTestServer } = require('./utils/test-server');

const {
    createWidgetInDB, getUUID, createWidget, ensureCorrectError, mockValidateRequestWithApiKey,
    mockValidateRequestWithApiKeyAndUserToken
} = require('./utils/helpers');
const { createMockDataset, createMockDeleteMetadata } = require('./utils/mock');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Delete widgets endpoint', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Widget.deleteMany({}).exec();
    });

    it('Deleting widget without being authenticated should fall with HTTP 401', async () => {
        mockValidateRequestWithApiKey({});
        const widgetOne = await new Widget(createWidget()).save();

        const response = await requester
            .delete(`/api/v1/widget/${widgetOne.id}`)
            .set('x-api-key', 'api-key-test')
            .send();

        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Deleting widget with being authenticated as USER should fall with HTTP 403', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const widgetOne = await new Widget(createWidget()).save();

        const response = await requester
            .delete(`/api/v1/widget/${widgetOne.id}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Forbidden');
    });

    it('Deleting widget with being authenticated as MANAGER that does not own the widget should fall with HTTP 403', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });
        const widgetOne = await new Widget(createWidget()).save();

        const response = await requester
            .delete(`/api/v1/widget/${widgetOne.id}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Forbidden');
    });

    it('Deleting widget with being authenticated as MANAGER that does own the widget should succeed', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });
        const createdWidget = await createWidgetInDB({ userId: USERS.MANAGER.id });

        createMockDataset(createdWidget.dataset);
        createMockDeleteMetadata(createdWidget.dataset, createdWidget._id);

        const response = await requester
            .delete(`/api/v1/widget/${createdWidget.id}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.instanceOf(Object);
        const { data } = response.body;

        data.id.should.equal(createdWidget._id.toString());
        data.type.should.equal('widget');
        data.should.have.property('attributes').and.instanceOf(Object);

        const expectedWidget = {
            ...createdWidget._doc,
            createdAt: createdWidget.createdAt.toISOString(),
            updatedAt: createdWidget.updatedAt.toISOString(),
        };
        // remove fields which are not present to user from response body;
        delete expectedWidget._id;
        delete expectedWidget.__v;

        data.attributes.should.deep.equal(expectedWidget);

        const widgets = await Widget.find({});
        widgets.should.be.lengthOf(0);
    });

    it('Deleting widget with being authenticated as ADMIN but with wrong app should fall', async () => {
        const createdWidget = await createWidgetInDB({ userId: USERS.WRONG_ADMIN.id });

        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.WRONG_ADMIN });

        const response = await requester
            .delete(`/api/v1/widget/${createdWidget.id}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    });

    it('Deleting widget should delete widget and return deleted widget (happy case)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });
        const datasetID = getUUID();
        createMockDataset(datasetID);
        await createWidgetInDB({ datasetID });
        const createdWidget = await createWidgetInDB({ dataset: datasetID });

        createMockDeleteMetadata(datasetID, createdWidget._id);

        const response = await requester
            .delete(`/api/v1/widget/${createdWidget.id}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .query({ dataset: datasetID });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.instanceOf(Object);
        const { data } = response.body;

        data.id.should.equal(createdWidget._id.toString());
        data.type.should.equal('widget');
        data.should.have.property('attributes').and.instanceOf(Object);

        const expectedWidget = {
            ...createdWidget._doc,
            createdAt: createdWidget.createdAt.toISOString(),
            updatedAt: createdWidget.updatedAt.toISOString(),
        };
        // remove fields which are not present to user from response body;
        delete expectedWidget._id;
        delete expectedWidget.__v;

        data.attributes.should.deep.equal(expectedWidget);

        const widgets = await Widget.find({});
        widgets.should.be.lengthOf(1);
    });

    afterEach(async () => {
        await Widget.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(async () => {
        await Widget.deleteMany({}).exec();
    });
});
