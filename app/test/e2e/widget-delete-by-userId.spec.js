const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const { getTestServer } = require('./utils/test-server');
const {
    ensureCorrectError, createWidget, mockGetUserFromToken
} = require('./utils/helpers');
const { USERS } = require('./utils/test.constants');

chai.should();

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;

describe('Delete all widgets for a user', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Deleting all widgets of an user without being authenticated should return a 401 "Not authorized" error', async () => {
        const response = await requester.delete(`/api/v1/widget/by-user/${USERS.USER.id}`);
        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Deleting all widgets of an user while being authenticated as USER that is not the owner of widgets or admin should return a 403 "Forbidden" error', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        await new Widget(createWidget({ application: ['rw'], dataset: '123', userId: USERS.USER.id })).save();

        const response = await requester
            .delete(`/api/v1/widget/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();

        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    });

    it('Deleting all widgets of an user while being authenticated as ADMIN should return a 200 and all widgets deleted', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const widgetOne = await new Widget(createWidget({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const widgetTwo = await new Widget(createWidget({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const fakeWidgetFromAdmin = await new Widget(createWidget({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.ADMIN.id
        })).save();
        const fakeWidgetFromManager = await new Widget(createWidget({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.MANAGER.id
        })).save();

        const response = await requester
            .delete(`/api/v1/widget/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();
        response.status.should.equal(200);
        response.body.deletedWidgets.data[0].attributes.name.should.equal(widgetOne.name);
        response.body.deletedWidgets.data[0].attributes.userId.should.equal(widgetOne.userId);
        response.body.deletedWidgets.data[0].attributes.dataset.should.equal(widgetOne.dataset);
        response.body.deletedWidgets.data[1].attributes.name.should.equal(widgetTwo.name);
        response.body.deletedWidgets.data[1].attributes.userId.should.equal(widgetTwo.userId);
        response.body.deletedWidgets.data[1].attributes.dataset.should.equal(widgetTwo.dataset);

        const findWidgetByUser = await Widget.find({ userId: { $eq: USERS.USER.id } }).exec();
        findWidgetByUser.should.be.an('array').with.lengthOf(0);

        const findAllWidgets = await Widget.find({}).exec();
        findAllWidgets.should.be.an('array').with.lengthOf(2);

        const widgetNames = findAllWidgets.map(widget => widget.name);
        widgetNames.should.contain(fakeWidgetFromManager.name);
        widgetNames.should.contain(fakeWidgetFromAdmin.name);
    });

    it('Deleting all widgets of an user while being authenticated as microservice should return a 200 and all widgets deleted', async () => {
        mockGetUserFromToken(USERS.MICROSERVICE);
        const widgetOne = await new Widget(createWidget({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const widgetTwo = await new Widget(createWidget({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const fakeWidgetFromAdmin = await new Widget(createWidget({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.ADMIN.id
        })).save();
        const fakeWidgetFromManager = await new Widget(createWidget({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.MANAGER.id
        })).save();

        const response = await requester
            .delete(`/api/v1/widget/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();
        response.status.should.equal(200);
        response.body.deletedWidgets.data[0].attributes.name.should.equal(widgetOne.name);
        response.body.deletedWidgets.data[0].attributes.userId.should.equal(widgetOne.userId);
        response.body.deletedWidgets.data[0].attributes.dataset.should.equal(widgetOne.dataset);
        response.body.deletedWidgets.data[1].attributes.name.should.equal(widgetTwo.name);
        response.body.deletedWidgets.data[1].attributes.userId.should.equal(widgetTwo.userId);
        response.body.deletedWidgets.data[1].attributes.dataset.should.equal(widgetTwo.dataset);

        const findWidgetByUser = await Widget.find({ userId: { $eq: USERS.USER.id } }).exec();
        findWidgetByUser.should.be.an('array').with.lengthOf(0);

        const findAllWidgets = await Widget.find({}).exec();
        findAllWidgets.should.be.an('array').with.lengthOf(2);

        const widgetNames = findAllWidgets.map(widget => widget.name);
        widgetNames.should.contain(fakeWidgetFromManager.name);
        widgetNames.should.contain(fakeWidgetFromAdmin.name);
    });

    it('Deleting all widgets of an user while being authenticated as that same user should return a 200 and all widgets deleted', async () => {
        mockGetUserFromToken(USERS.USER);
        const widgetOne = await new Widget(createWidget({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const widgetTwo = await new Widget(createWidget({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const fakeWidgetFromAdmin = await new Widget(createWidget({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.ADMIN.id
        })).save();
        const fakeWidgetFromManager = await new Widget(createWidget({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.MANAGER.id
        })).save();

        const response = await requester
            .delete(`/api/v1/widget/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();
        response.status.should.equal(200);
        response.body.deletedWidgets.data[0].attributes.name.should.equal(widgetOne.name);
        response.body.deletedWidgets.data[0].attributes.userId.should.equal(widgetOne.userId);
        response.body.deletedWidgets.data[0].attributes.dataset.should.equal(widgetOne.dataset);
        response.body.deletedWidgets.data[1].attributes.name.should.equal(widgetTwo.name);
        response.body.deletedWidgets.data[1].attributes.userId.should.equal(widgetTwo.userId);
        response.body.deletedWidgets.data[1].attributes.dataset.should.equal(widgetTwo.dataset);

        const findWidgetByUser = await Widget.find({ userId: { $eq: USERS.USER.id } }).exec();
        findWidgetByUser.should.be.an('array').with.lengthOf(0);

        const findAllWidgets = await Widget.find({}).exec();
        findAllWidgets.should.be.an('array').with.lengthOf(2);

        const widgetNames = findAllWidgets.map(widget => widget.name);
        widgetNames.should.contain(fakeWidgetFromManager.name);
        widgetNames.should.contain(fakeWidgetFromAdmin.name);
    });

    it('Deleting all widgets of an user while being authenticated as USER should return a 200 and all widgets deleted - no widgets in the db', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .delete(`/api/v1/widget/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .send();

        response.status.should.equal(200);
        response.body.deletedWidgets.data.should.be.an('array').with.lengthOf(0);
    });

    it('Deleting widgets while some of them are protected should only delete unprotected ones', async () => {
        mockGetUserFromToken(USERS.USER);

        const widgetOne = await new Widget(createWidget({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const widgetTwo = await new Widget(createWidget({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const widgetThree = await new Widget(createWidget({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.USER.id, protected: true
        })).save();
        const fakeWidgetFromAdmin = await new Widget(createWidget({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.ADMIN.id
        })).save();
        const fakeWidgetFromManager = await new Widget(createWidget({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.MANAGER.id
        })).save();


        const deleteResponse = await requester
            .delete(`/api/v1/widget/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();

        deleteResponse.status.should.equal(200);
        deleteResponse.body.deletedWidgets.should.have.property('data').with.lengthOf(2);
        deleteResponse.body.protectedWidgets.should.have.property('data').with.lengthOf(1);

        const deletedWidgets = deleteResponse.body.deletedWidgets.data;
        let widgetIds = deletedWidgets.map(widget => widget.id);
        widgetIds.should.contain(widgetOne._id);
        widgetIds.should.contain(widgetTwo._id);

        const protectedWidgets = deleteResponse.body.protectedWidgets.data;
        widgetIds = protectedWidgets.map(widget => widget.id);
        widgetIds.should.contain(widgetThree._id);

        const findWidgetByUser = await Widget.find({ userId: { $eq: USERS.USER.id } }).exec();
        findWidgetByUser.should.be.an('array').with.lengthOf(1);
        widgetIds = findWidgetByUser.map(widget => widget._id);
        widgetIds.should.contain(widgetThree._id);

        const findAllWidgets = await Widget.find({}).exec();
        findAllWidgets.should.be.an('array').with.lengthOf(3);

        widgetIds = findAllWidgets.map(widget => widget._id);
        widgetIds.should.contain(fakeWidgetFromAdmin._id);
        widgetIds.should.contain(fakeWidgetFromManager._id);
        widgetIds.should.contain(widgetThree._id);
    });

    afterEach(async () => {
        await Widget.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
