/* eslint-disable no-unused-vars,no-undef,no-underscore-dangle */
const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const { USERS } = require('./utils/test.constants');

const { createRequest } = require('./utils/test-server');

const { createWidgetInDB, getUUID, createAuthCases } = require('./utils/helpers');
const { createMockDataset, createMockDeleteMetadata } = require('./utils/mock');

const should = chai.should();

const prefix = '/api/v1/widget/';
let widget;

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

        Widget.remove({}).exec();
    });

    it('Deleting widget without being authenticated should fall with HTTP 401', authCases.isLoggedUserRequired());

    it('Deleting widget with being authenticated as USER should fall with HTTP 403', authCases.isUserForbidden());

    it('Deleting widget with being authenticated as ADMIN but with wrong app should fall', async () => {
        const createdWidget = await createWidgetInDB({ userId: USERS.WRONG_ADMIN.id });
        authCases.isRightAppRequired(createdWidget._id);
    });

    it('Deleting widget should delete widget and return deleted widget (happy case)', async () => {
        const datasetID = getUUID();
        createMockDataset(datasetID);
        await createWidgetInDB({ datasetID });
        const createdWidget = await createWidgetInDB({ datasetID });

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
