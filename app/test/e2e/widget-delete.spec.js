/* eslint-disable no-unused-vars,no-undef,no-underscore-dangle */
const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const { USERS } = require('./utils/test.constants');

const { createRequest, getTestServer } = require('./utils/test-server');

const {
    createWidgetInDB, getUUID, createAuthCases, createWidget
} = require('./utils/helpers');
const { createMockDataset, createMockDeleteMetadata } = require('./utils/mock');

chai.should();

const prefix = '/api/v1/widget/';

let widget;
let requester;

const authCases = createAuthCases('123', 'delete');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Delete widgets endpoint', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        nock.cleanAll();

        widget = await createRequest(prefix, 'delete');
        authCases.setRequester(widget);
        requester = await getTestServer();

        await Widget.deleteMany({}).exec();
    });

    it('Deleting widget without being authenticated should fall with HTTP 401', authCases.isLoggedUserRequired());

    it('Deleting widget with being authenticated as USER should fall with HTTP 403', async () => {
        const widgetOne = await new Widget(createWidget()).save();

        const response = await requester
            .delete(`/api/v1/widget/${widgetOne.id}?loggedUser=${JSON.stringify(USERS.USER)}`)
            .send();

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Forbidden');
    });

    it('Deleting widget with being authenticated as MANAGER that does not own the widget should fall with HTTP 403', async () => {
        const widgetOne = await new Widget(createWidget()).save();

        const response = await requester
            .delete(`/api/v1/widget/${widgetOne.id}?loggedUser=${JSON.stringify(USERS.MANAGER)}`)
            .send();

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Forbidden');
    });

    it('Deleting widget with being authenticated as MANAGER that does own the widget should succeed', async () => {
        const createdWidget = await createWidgetInDB({ userId: USERS.MANAGER.id });

        createMockDataset(createdWidget.dataset);
        createMockDeleteMetadata(createdWidget.dataset, createdWidget._id);

        const response = await requester
            .delete(`/api/v1/widget/${createdWidget.id}?loggedUser=${JSON.stringify(USERS.MANAGER)}`)
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
        authCases.isRightAppRequired(createdWidget._id);
    });

    it('Deleting widget should delete widget and return deleted widget (happy case)', async () => {
        const datasetID = getUUID();
        createMockDataset(datasetID);
        await createWidgetInDB({ datasetID });
        const createdWidget = await createWidgetInDB({ dataset: datasetID });

        createMockDeleteMetadata(datasetID, createdWidget._id);

        const response = await widget
            .delete(createdWidget._id)
            .query({ dataset: datasetID, loggedUser: JSON.stringify(USERS.ADMIN) });

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
