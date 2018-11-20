/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const { ROLES } = require('./test.constants');

const { getTestServer, widgetConfig } = require('./test-server');
const { getUUID, createWidget } = require('./utils');

const should = chai.should();

let requester;

describe('Clone widgets tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        Widget.remove({}).exec();
    });

    it('Clone a widget as an anonymous user should fail with a 401 error code', async () => {
        const widgetId = getUUID();

        const response = await requester
            .post(`/api/v1/widget/${widgetId}/clone`)
            .send();

        response.status.should.equal(401);
    });

    it('Clone a widget that does not exist should fail with a 404 error code', async () => {
        const widgetId = getUUID();

        const response = await requester
            .post(`/api/v1/widget/${widgetId}/clone`)
            .send({
                loggedUser: ROLES.ADMIN
            });

        response.status.should.equal(404);
    });

    it('Clone a widget as an ADMIN should be successful', async () => {
        const widgetOne = await new Widget(createWidget()).save();

        const response = await requester
            .post(`/api/v1/widget/${widgetOne.id}/clone`)
            .send({
                loggedUser: ROLES.ADMIN
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.id.should.not.equal(widgetOne.id);
        createdWidget.attributes.name.should.not.equal(widgetOne.name);
        createdWidget.attributes.slug.should.not.equal(widgetOne.slug);

        createdWidget.attributes.description.should.equal(widgetOne.description);
        createdWidget.attributes.dataset.should.equal(widgetOne.dataset);
        createdWidget.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
        createdWidget.attributes.queryUrl.should.equal(widgetOne.queryUrl);
        createdWidget.attributes.widgetConfig.should.deep.equal(widgetOne.widgetConfig);
    });

    it('Clone a widget as an USER with a matching app should be successful', async () => {
        const widgetOne = await new Widget(createWidget()).save();

        const response = await requester
            .post(`/api/v1/widget/${widgetOne.id}/clone`)
            .send({
                loggedUser: ROLES.USER
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.id.should.not.equal(widgetOne.id);
        createdWidget.attributes.name.should.not.equal(widgetOne.name);
        createdWidget.attributes.slug.should.not.equal(widgetOne.slug);

        createdWidget.attributes.description.should.equal(widgetOne.description);
        createdWidget.attributes.dataset.should.equal(widgetOne.dataset);
        createdWidget.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
        createdWidget.attributes.queryUrl.should.equal(widgetOne.queryUrl);
        createdWidget.attributes.widgetConfig.should.deep.equal(widgetOne.widgetConfig);
    });

    it('Clone a widget as an USER without a matching app should fail with HTTP 403', async () => {
        const widgetWithFakeApp = createWidget();
        widgetWithFakeApp.application = ['potato'];
        const widgetOne = await new Widget(widgetWithFakeApp).save();

        const response = await requester
            .post(`/api/v1/widget/${widgetOne.id}/clone`)
            .send({
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
