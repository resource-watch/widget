/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const Widget = require('models/widget.model');
const chai = require('chai');
const {
    USERS: {
        USER, ADMIN, MANAGER, MICROSERVICE
    }
} = require('./utils/test.constants');

const { expect } = chai;

chai.should();

const { createRequest } = require('./utils/test-server');
const {
    createAuthCases,
    ensureCorrectError,
    createWidgetInDB,
    getUUID,
} = require('./utils/helpers');
const { createMockDataset, createMockDatasetNotFound } = require('./utils/mock');

const prefix = '/api/v1/widget/change-environment';
let widget;

const authCases = createAuthCases('/123/production', 'patch');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Update env of widget by dataset endpoint', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        nock.cleanAll();

        widget = await createRequest(prefix, 'patch');
        authCases.setRequester(widget);

        await Widget.deleteMany({}).exec();
    });

    it('Updating env of widget by dataset which doesn\'t exist should return not found', async () => {
        createMockDatasetNotFound('123');
        const response = await widget.patch('/123/production');
        response.status.should.equal(404);
        ensureCorrectError(response.body, 'Dataset not found');
    });

    it('Updating env of widget by dataset without being authenticated should fall with HTTP 403', async () => {
        const datasetID = getUUID();
        createMockDataset(datasetID);
        const response = await widget.patch(`/${datasetID}/production`);
        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Not authorized');
    });

    it('Updating env of widget by dataset with being authenticated as USER should fall with HTTP 403', async () => {
        const datasetID = getUUID();
        createMockDataset(datasetID);
        const response = await widget.patch(`/${datasetID}/production`).send({ loggedUser: USER });
        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Not authorized');
    });

    it('Updating env of widget by dataset with being authenticated as ADMIN should fall with HTTP 403', async () => {
        const datasetID = getUUID();
        createMockDataset(datasetID);
        const response = await widget.patch(`/${datasetID}/production`).send({ loggedUser: ADMIN });
        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Not authorized');
    });


    it('Updating env of widget by dataset with being authenticated as MANAGER should fall with HTTP 403', async () => {
        const datasetID = getUUID();
        createMockDataset(datasetID);
        const response = await widget.patch(`/${datasetID}/production`).send({ loggedUser: MANAGER });
        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Not authorized');
    });

    it('Updating env of widget by dataset should update all relative widgets to provided dataset', async () => {
        const datasetID = getUUID();
        createMockDataset(datasetID);

        await createWidgetInDB({ datasetID });
        await createWidgetInDB({ datasetID });
        await createWidgetInDB({ datasetID: getUUID() });

        const response = await widget.patch(`/${datasetID}/preproduction`).send({ loggedUser: MICROSERVICE });
        response.status.should.equal(200);

        const widgetsWithEnvPreproduction = await Widget.find({ dataset: datasetID, env: 'preproduction' });
        const widgetsWithEnvProduction = await Widget.find({ env: 'production' });
        expect(widgetsWithEnvPreproduction).to.be.lengthOf(2);
        expect(widgetsWithEnvProduction).to.be.lengthOf(1);
    });


    afterEach(async () => {
        await Widget.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
