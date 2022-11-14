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
        response.body.deletedWidgets.map(elem => elem.attributes.name).sort().should.eql([widgetOne.name, widgetTwo.name].sort());
        response.body.deletedWidgets.map(elem => elem.attributes.userId).sort().should.eql([widgetOne.userId, widgetTwo.userId].sort());
        response.body.deletedWidgets.map(elem => elem.attributes.dataset).sort().should.eql([widgetOne.dataset, widgetTwo.dataset].sort());


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
        response.body.deletedWidgets.map(elem => elem.attributes.name).sort().should.eql([widgetOne.name, widgetTwo.name].sort());
        response.body.deletedWidgets.map(elem => elem.attributes.userId).sort().should.eql([widgetOne.userId, widgetTwo.userId].sort());
        response.body.deletedWidgets.map(elem => elem.attributes.dataset).sort().should.eql([widgetOne.dataset, widgetTwo.dataset].sort());


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
        response.body.deletedWidgets.map(elem => elem.attributes.name).sort().should.eql([widgetOne.name, widgetTwo.name].sort());
        response.body.deletedWidgets.map(elem => elem.attributes.userId).sort().should.eql([widgetOne.userId, widgetTwo.userId].sort());
        response.body.deletedWidgets.map(elem => elem.attributes.dataset).sort().should.eql([widgetOne.dataset, widgetTwo.dataset].sort());

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
        response.body.deletedWidgets.should.be.an('array').with.lengthOf(0);
    });

    it('Deleting widgets while some of them are protected should only delete unprotected ones', async () => {
        mockGetUserFromToken(USERS.USER);

        await Promise.all([...Array(100)].map(async () => {
            await new Widget(createWidget({
                env: 'staging', application: ['rw'], dataset: '123', userId: USERS.USER.id
            })).save();
            await new Widget(createWidget({
                env: 'production', application: ['gfw'], dataset: '123', userId: USERS.USER.id
            })).save();
            await new Widget(createWidget({
                env: 'production', application: ['gfw'], dataset: '123', userId: USERS.USER.id, protected: true
            })).save();
            await new Widget(createWidget({
                env: 'staging', application: ['rw'], dataset: '123', userId: USERS.ADMIN.id
            })).save();
            await new Widget(createWidget({
                env: 'production', application: ['gfw'], dataset: '123', userId: USERS.MANAGER.id
            })).save();
        }));

        const deleteResponse = await requester
            .delete(`/api/v1/widget/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();

        deleteResponse.status.should.equal(200);
        deleteResponse.body.deletedWidgets.should.be.an('array').and.with.lengthOf(200);
        deleteResponse.body.protectedWidgets.should.be.an('array').and.with.lengthOf(100);

        const { deletedWidgets } = deleteResponse.body;
        deletedWidgets.forEach((widget) => {
            widget.attributes.protected.should.equal(false);
            widget.attributes.userId.should.equal(USERS.USER.id);
        });

        const { protectedWidgets } = deleteResponse.body;
        protectedWidgets.forEach((widget) => {
            widget.attributes.protected.should.equal(true);
            widget.attributes.userId.should.equal(USERS.USER.id);
        });

        const findWidgetByUser = await Widget.find({ userId: { $eq: USERS.USER.id } }).exec();
        findWidgetByUser.should.be.an('array').with.lengthOf(100);
        findWidgetByUser.forEach((widget) => {
            widget.protected.should.equal(true);
            widget.userId.should.equal(USERS.USER.id);
        });

        const findWidgetByAdminUser = await Widget.find({ userId: { $eq: USERS.ADMIN.id } }).exec();
        findWidgetByAdminUser.should.be.an('array').with.lengthOf(100);
        findWidgetByAdminUser.forEach((widget) => {
            widget.protected.should.equal(false);
            widget.userId.should.equal(USERS.ADMIN.id);
        });

        const findAllWidgets = await Widget.find({}).exec();
        findAllWidgets.should.be.an('array').with.lengthOf(300);
    });

    afterEach(async () => {
        await Widget.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
