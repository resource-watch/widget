/* eslint-disable no-unused-vars,no-undef,no-underscore-dangle */
const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const { USERS: { MICROSERVICE } } = require('./utils/test.constants');
const { createMockDataset, createMockDeleteMetadata } = require('./utils/mock');
const { createRequest } = require('./utils/test-server');
const { createWidgetInDB, getUUID, createAuthCases } = require('./utils/helpers');

chai.should();

const prefix = '/api/v1/dataset';
let widget;

const authCases = createAuthCases('/123/widget', 'delete');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Delete all widgets by dataset endpoint', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        nock.cleanAll();

        widget = await createRequest(prefix, 'delete');
        authCases.setRequester(widget);

        await Widget.deleteMany({}).exec();
    });

    it('Deleting all widgets by dataset without being authenticated should fall with HTTP 401', async () => {
        const datasetID = getUUID();
        await authCases.isLoggedUserRequired(`/${datasetID}/widget`);
    });

    it('Deleting all widgets by dataset with being authenticated as USER should fall with HTTP 403', async () => {
        const datasetID = getUUID();
        await authCases.isUserForbidden(`/${datasetID}/widget`);
    });

    it('Deleting all widgets by dataset with being authenticated as ADMIN should fall with HTTP 403', async () => {
        const datasetID = getUUID();
        await authCases.isAdminForbidden(`/${datasetID}/widget`);
    });

    it('Deleting all widgets by dataset should delete widgets in specific dataset (happy case)', async () => {
        const datasetID = getUUID();
        createMockDataset(datasetID);
        const expectedWidgets = [
            await createWidgetInDB({ dataset: datasetID, userId: MICROSERVICE.id }),
            await createWidgetInDB({ dataset: datasetID, userId: MICROSERVICE.id })
        ];
        expectedWidgets.map(wid => createMockDeleteMetadata(datasetID, wid._id.toString()));
        await createWidgetInDB({ datasetID: getUUID(), userId: MICROSERVICE.id });

        const response = await widget
            .delete(`/${datasetID}/widget`)
            .query({ loggedUser: JSON.stringify(MICROSERVICE) });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.instanceOf(Object);
        const { data } = response.body;

        const testWidget = (createdWidget, key) => {
            data[key].id.should.equal(createdWidget._id.toString());
            data[key].type.should.equal('widget');
            data[key].should.have.property('attributes').and.instanceOf(Object);

            const expectedWidget = {
                ...createdWidget._doc,
                createdAt: createdWidget.createdAt.toISOString(),
                updatedAt: createdWidget.updatedAt.toISOString(),
            };
            // remove fields which are not present to user from response body;
            delete expectedWidget._id;
            delete expectedWidget.__v;

            data[key].attributes.should.deep.equal(expectedWidget);
        };

        expectedWidgets.map(testWidget);

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
