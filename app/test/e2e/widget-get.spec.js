/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
const mongoose = require('mongoose');
const Widget = require('models/widget.model');
const { USERS: { USER, MANAGER, ADMIN } } = require('./utils/test.constants');
const { getTestServer } = require('./utils/test-server');
const { createWidget, ensureCorrectWidget, getUUID } = require('./utils/helpers');
const { createMockUser, createMockUserRole } = require('./utils/mock');
// eslint-disable-next-line import/no-unresolved

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Get widgets tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });


    beforeEach(async () => {
        await Widget.deleteMany({}).exec();
    });

    it('Get all widgets should be successful and return an empty list (empty db)', async () => {
        const response = await requester.get(`/api/v1/widget`).send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
        response.body.should.have.property('links').and.be.an('object');
    });

    it('Get all widgets should be successful and return a list of widgets (populated db)', async () => {
        const widgetOne = await new Widget(createWidget()).save();
        const widgetTwo = await new Widget(createWidget()).save();

        const response = await requester.get(`/api/v1/widget`).send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];
        const responseWidgetTwo = response.body.data[1];

        ensureCorrectWidget(widgetOne, responseWidgetOne);
        ensureCorrectWidget(widgetTwo, responseWidgetTwo);
    });

    it('Getting all widgets as ADMIN with query param user.role = ADMIN should return a filtered list of widgets created by ADMIN (populated db)', async () => {
        const adminID = getUUID();

        const widgetOne = await new Widget(createWidget(['rw'], adminID)).save();
        await new Widget(createWidget(['rw'], MANAGER.id)).save();

        createMockUserRole('ADMIN', adminID);

        const response = await requester.get(`/api/v1/widget`).query({
            'user.role': 'ADMIN',
            loggedUser: JSON.stringify(ADMIN)
        });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];

        ensureCorrectWidget(widgetOne, responseWidgetOne);
    });

    it('Getting all widgets as ADMIN with query param user.role = MANAGER should return a filtered list of widgets created by MANAGER (populated db)', async () => {
        const managerID = getUUID();
        const widgetOne = await new Widget(createWidget(['rw'], managerID)).save();
        await new Widget(createWidget(['rw'], USER.id)).save();

        createMockUserRole('MANAGER', managerID);

        const response = await requester.get(`/api/v1/widget`).query({
            'user.role': 'MANAGER',
            loggedUser: JSON.stringify(ADMIN)
        });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];

        ensureCorrectWidget(widgetOne, responseWidgetOne);
    });

    it('Getting all widgets as ADMIN with query param user.role = USER should return a filtered list of widgets created by USER (populated db)', async () => {
        const userID = getUUID();
        const widgetOne = await new Widget(createWidget(['rw'], userID)).save();
        await new Widget(createWidget(['rw'], MANAGER.id)).save();

        createMockUserRole('USER', userID);

        const response = await requester.get(`/api/v1/widget`).query({
            'user.role': 'USER',
            loggedUser: JSON.stringify(ADMIN)
        });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];

        ensureCorrectWidget(widgetOne, responseWidgetOne);
    });

    it('Getting all widgets as MANAGER with query param user.role = USER should return an unfiltered list of widgets (populated db)', async () => {
        const userID = getUUID();

        const widgetOne = await new Widget(createWidget(['rw'], userID)).save();
        await new Widget(createWidget(['rw'], userID)).save();

        const response = await requester.get(`/api/v1/widget`).query({
            'user.role': 'USER',
            loggedUser: JSON.stringify(USER)
        });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];

        ensureCorrectWidget(widgetOne, responseWidgetOne);
    });


    it('Get all widgets with includes=user should be successful and return a list of widgets with associated user name and email (populated db, anonymous call)', async () => {
        const widgetOne = await new Widget(createWidget(undefined, ADMIN.id)).save();
        const widgetTwo = await new Widget(createWidget(undefined, MANAGER.id)).save();

        createMockUser([ADMIN]);
        createMockUser([MANAGER]);

        const response = await requester.get(`/api/v1/widget?includes=user`).send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];
        const responseWidgetTwo = response.body.data[1];

        responseWidgetOne.attributes.name.should.equal(widgetOne.name);
        responseWidgetOne.attributes.dataset.should.equal(widgetOne.dataset);
        responseWidgetOne.attributes.userId.should.equal(widgetOne.userId);
        responseWidgetOne.attributes.slug.should.equal(widgetOne.slug);
        responseWidgetOne.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
        responseWidgetOne.attributes.queryUrl.should.equal(widgetOne.queryUrl);
        responseWidgetOne.attributes.should.have.property('user').and.should.be.an('object');
        responseWidgetOne.attributes.user.name.should.be.a('string').and.equal(ADMIN.name);
        responseWidgetOne.attributes.user.email.should.be.a('string').and.equal(ADMIN.email);
        responseWidgetOne.attributes.user.should.not.have.property('role');

        responseWidgetTwo.attributes.name.should.equal(widgetTwo.name);
        responseWidgetTwo.attributes.dataset.should.equal(widgetTwo.dataset);
        responseWidgetTwo.attributes.userId.should.equal(widgetTwo.userId);
        responseWidgetTwo.attributes.slug.should.equal(widgetTwo.slug);
        responseWidgetTwo.attributes.sourceUrl.should.equal(widgetTwo.sourceUrl);
        responseWidgetTwo.attributes.queryUrl.should.equal(widgetTwo.queryUrl);
        responseWidgetTwo.attributes.should.have.property('user').and.should.be.an('object');
        responseWidgetTwo.attributes.user.name.should.be.a('string').and.equal(MANAGER.name);
        responseWidgetTwo.attributes.user.email.should.be.a('string').and.equal(MANAGER.email);
        responseWidgetTwo.attributes.user.should.not.have.property('role');
    });

    it('Get all widgets with includes=user should be successful and return a list of widgets with associated user name and email (populated db, USER role)', async () => {
        const widgetOne = await new Widget(createWidget(undefined, ADMIN.id)).save();
        const widgetTwo = await new Widget(createWidget(undefined, MANAGER.id)).save();

        createMockUser([ADMIN]);
        createMockUser([MANAGER]);

        const response = await requester.get(`/api/v1/widget`)
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(USER)
            })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];
        const responseWidgetTwo = response.body.data[1];

        responseWidgetOne.attributes.name.should.equal(widgetOne.name);
        responseWidgetOne.attributes.dataset.should.equal(widgetOne.dataset);
        responseWidgetOne.attributes.userId.should.equal(widgetOne.userId);
        responseWidgetOne.attributes.slug.should.equal(widgetOne.slug);
        responseWidgetOne.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
        responseWidgetOne.attributes.queryUrl.should.equal(widgetOne.queryUrl);
        responseWidgetOne.attributes.should.have.property('user').and.should.be.an('object');
        responseWidgetOne.attributes.user.name.should.be.a('string').and.equal(ADMIN.name);
        responseWidgetOne.attributes.user.email.should.be.a('string').and.equal(ADMIN.email);
        responseWidgetOne.attributes.user.should.not.have.property('role');

        responseWidgetTwo.attributes.name.should.equal(widgetTwo.name);
        responseWidgetTwo.attributes.dataset.should.equal(widgetTwo.dataset);
        responseWidgetTwo.attributes.userId.should.equal(widgetTwo.userId);
        responseWidgetTwo.attributes.slug.should.equal(widgetTwo.slug);
        responseWidgetTwo.attributes.sourceUrl.should.equal(widgetTwo.sourceUrl);
        responseWidgetTwo.attributes.queryUrl.should.equal(widgetTwo.queryUrl);
        responseWidgetTwo.attributes.should.have.property('user').and.should.be.an('object');
        responseWidgetTwo.attributes.user.name.should.be.a('string').and.equal(MANAGER.name);
        responseWidgetTwo.attributes.user.email.should.be.a('string').and.equal(MANAGER.email);
        responseWidgetTwo.attributes.user.should.not.have.property('role');
    });

    it('Get all widgets with includes=user should be successful and return a list of widgets with associated user name and email (populated db, MANAGER role)', async () => {
        const widgetOne = await new Widget(createWidget(undefined, ADMIN.id)).save();
        const widgetTwo = await new Widget(createWidget(undefined, MANAGER.id)).save();

        createMockUser([ADMIN]);
        createMockUser([MANAGER]);

        const response = await requester.get(`/api/v1/widget`)
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(MANAGER)
            })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];
        const responseWidgetTwo = response.body.data[1];

        responseWidgetOne.attributes.name.should.equal(widgetOne.name);
        responseWidgetOne.attributes.dataset.should.equal(widgetOne.dataset);
        responseWidgetOne.attributes.userId.should.equal(widgetOne.userId);
        responseWidgetOne.attributes.slug.should.equal(widgetOne.slug);
        responseWidgetOne.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
        responseWidgetOne.attributes.queryUrl.should.equal(widgetOne.queryUrl);
        responseWidgetOne.attributes.should.have.property('user').and.should.be.an('object');
        responseWidgetOne.attributes.user.name.should.be.a('string').and.equal(ADMIN.name);
        responseWidgetOne.attributes.user.email.should.be.a('string').and.equal(ADMIN.email);
        responseWidgetOne.attributes.user.should.not.have.property('role');

        responseWidgetTwo.attributes.name.should.equal(widgetTwo.name);
        responseWidgetTwo.attributes.dataset.should.equal(widgetTwo.dataset);
        responseWidgetTwo.attributes.userId.should.equal(widgetTwo.userId);
        responseWidgetTwo.attributes.slug.should.equal(widgetTwo.slug);
        responseWidgetTwo.attributes.sourceUrl.should.equal(widgetTwo.sourceUrl);
        responseWidgetTwo.attributes.queryUrl.should.equal(widgetTwo.queryUrl);
        responseWidgetTwo.attributes.should.have.property('user').and.should.be.an('object');
        responseWidgetTwo.attributes.user.name.should.be.a('string').and.equal(MANAGER.name);
        responseWidgetTwo.attributes.user.email.should.be.a('string').and.equal(MANAGER.email);
        responseWidgetTwo.attributes.user.should.not.have.property('role');
    });

    it('Get all widgets with includes=user should be successful and return a list of widgets with associated user name and email (populated db, ADMIN role)', async () => {
        const widgetOne = await new Widget(createWidget(undefined, ADMIN.id)).save();
        const widgetTwo = await new Widget(createWidget(undefined, MANAGER.id)).save();

        createMockUser([ADMIN]);
        createMockUser([MANAGER]);

        const response = await requester
            .get(`/api/v1/widget`)
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(ADMIN)
            })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];
        const responseWidgetTwo = response.body.data[1];

        responseWidgetOne.attributes.name.should.equal(widgetOne.name);
        responseWidgetOne.attributes.dataset.should.equal(widgetOne.dataset);
        responseWidgetOne.attributes.userId.should.equal(widgetOne.userId);
        responseWidgetOne.attributes.slug.should.equal(widgetOne.slug);
        responseWidgetOne.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
        responseWidgetOne.attributes.queryUrl.should.equal(widgetOne.queryUrl);
        responseWidgetOne.attributes.should.have.property('user').and.should.be.an('object');
        responseWidgetOne.attributes.user.name.should.be.a('string').and.equal(ADMIN.name);
        responseWidgetOne.attributes.user.email.should.be.a('string').and.equal(ADMIN.email);
        responseWidgetOne.attributes.user.role.should.be.a('string').and.equal('ADMIN');

        responseWidgetTwo.attributes.name.should.equal(widgetTwo.name);
        responseWidgetTwo.attributes.dataset.should.equal(widgetTwo.dataset);
        responseWidgetTwo.attributes.userId.should.equal(widgetTwo.userId);
        responseWidgetTwo.attributes.slug.should.equal(widgetTwo.slug);
        responseWidgetTwo.attributes.sourceUrl.should.equal(widgetTwo.sourceUrl);
        responseWidgetTwo.attributes.queryUrl.should.equal(widgetTwo.queryUrl);
        responseWidgetOne.attributes.should.have.property('user').and.should.be.an('object');
        responseWidgetTwo.attributes.user.name.should.be.a('string').and.equal(MANAGER.name);
        responseWidgetTwo.attributes.user.email.should.be.a('string').and.equal(MANAGER.email);
        responseWidgetTwo.attributes.user.role.should.be.a('string').and.equal('MANAGER');
    });

    it('Get all widgets with includes=user should be successful and return a list of widgets with associated user name and email only for users that exist (populated db)', async () => {
        const widgetOne = await new Widget(createWidget()).save();
        const widgetTwo = await new Widget(createWidget()).save();

        createMockUser([ADMIN]);

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', {
                ids: [widgetTwo.userId]
            })
            .reply(200, {
                data: []
            });


        const response = await requester.get(`/api/v1/widget?includes=user`).send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];
        const responseWidgetTwo = response.body.data[1];

        responseWidgetOne.attributes.name.should.equal(widgetOne.name);
        responseWidgetOne.attributes.dataset.should.equal(widgetOne.dataset);
        responseWidgetOne.attributes.userId.should.equal(widgetOne.userId);
        responseWidgetOne.attributes.slug.should.equal(widgetOne.slug);
        responseWidgetOne.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
        responseWidgetOne.attributes.queryUrl.should.equal(widgetOne.queryUrl);
        responseWidgetOne.attributes.should.have.property('user').and.should.be.an('object');
        responseWidgetOne.attributes.user.name.should.be.a('string').and.equal(ADMIN.name);
        responseWidgetOne.attributes.user.email.should.be.a('string').and.equal(ADMIN.email);
        responseWidgetOne.attributes.user.should.not.have.property('role');

        responseWidgetTwo.attributes.name.should.equal(widgetTwo.name);
        responseWidgetTwo.attributes.dataset.should.equal(widgetTwo.dataset);
        responseWidgetTwo.attributes.userId.should.equal(widgetTwo.userId);
        responseWidgetTwo.attributes.slug.should.equal(widgetTwo.slug);
        responseWidgetTwo.attributes.sourceUrl.should.equal(widgetTwo.sourceUrl);
        responseWidgetTwo.attributes.queryUrl.should.equal(widgetTwo.queryUrl);
        responseWidgetTwo.attributes.should.not.have.property('user');
    });

    it('Get all widgets with includes=user should return a list of widgets and user name, email and role, even if only partial data exists', async () => {
        const widgetOne = await new Widget(createWidget()).save();
        const widgetTwo = await new Widget(createWidget()).save();
        const widgetThree = await new Widget(createWidget()).save();

        createMockUser([{
            ...USER,
            id: widgetOne.userId,
            email: 'user-one@control-tower.org',
            name: 'test user'
        }]);

        createMockUser([{
            ...MANAGER,
            id: widgetTwo.userId,
            name: undefined,
            email: 'user-two@control-tower.org'
        }]);

        createMockUser([{
            ...MANAGER,
            id: widgetThree.userId,
            name: 'user three',
            email: undefined
        }]);

        const response = await requester
            .get(`/api/v1/widget`)
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(ADMIN)
            }).send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(3);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data.find(widget => widget.id === widgetOne.id);
        const responseWidgetTwo = response.body.data.find(widget => widget.id === widgetTwo.id);
        const responseWidgetThree = response.body.data.find(widget => widget.id === widgetThree.id);

        responseWidgetOne.attributes.name.should.equal(widgetOne.name);
        responseWidgetOne.attributes.dataset.should.equal(widgetOne.dataset);
        responseWidgetOne.attributes.userId.should.equal(widgetOne.userId);
        responseWidgetOne.attributes.slug.should.equal(widgetOne.slug);
        responseWidgetOne.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
        responseWidgetOne.attributes.queryUrl.should.equal(widgetOne.queryUrl);
        responseWidgetOne.attributes.should.have.property('user').and.should.be.an('object');
        responseWidgetOne.attributes.user.name.should.be.a('string').and.equal('test user');
        responseWidgetOne.attributes.user.email.should.be.a('string').and.equal('user-one@control-tower.org');
        responseWidgetOne.attributes.user.role.should.be.a('string').and.equal('USER');

        responseWidgetTwo.attributes.name.should.equal(widgetTwo.name);
        responseWidgetTwo.attributes.dataset.should.equal(widgetTwo.dataset);
        responseWidgetTwo.attributes.userId.should.equal(widgetTwo.userId);
        responseWidgetTwo.attributes.slug.should.equal(widgetTwo.slug);
        responseWidgetTwo.attributes.sourceUrl.should.equal(widgetTwo.sourceUrl);
        responseWidgetTwo.attributes.queryUrl.should.equal(widgetTwo.queryUrl);
        responseWidgetTwo.attributes.user.role.should.be.a('string').and.equal('MANAGER');
        responseWidgetTwo.attributes.user.email.should.be.a('string').and.equal('user-two@control-tower.org');
        responseWidgetTwo.attributes.user.should.not.have.property('name');

        responseWidgetThree.attributes.name.should.equal(widgetThree.name);
        responseWidgetThree.attributes.dataset.should.equal(widgetThree.dataset);
        responseWidgetThree.attributes.userId.should.equal(widgetThree.userId);
        responseWidgetThree.attributes.slug.should.equal(widgetThree.slug);
        responseWidgetThree.attributes.sourceUrl.should.equal(widgetThree.sourceUrl);
        responseWidgetThree.attributes.queryUrl.should.equal(widgetThree.queryUrl);
        responseWidgetThree.attributes.user.name.should.be.a('string').and.equal('user three');
        responseWidgetThree.attributes.user.role.should.be.a('string').and.equal('MANAGER');
        responseWidgetThree.attributes.user.should.not.have.property('email');
    });

    it('Get all widgets should return widgets owned by user', async () => {
        const widgetOne = await new Widget(createWidget(undefined, 'xxx')).save();
        await new Widget(createWidget()).save();

        const response = await requester.get(`/api/v1/widget?userId=xxx`);

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];
        widgetOne.name.should.equal(responseWidgetOne.attributes.name);
    });

    it('Get all widgets with collection filter without being authenticated should return a 403 error', async () => {
        const response = await requester.get(`/api/v1/widget?collection=xxx`);

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array').and.length(1);
        response.body.errors[0].should.have.property('detail').and.equal('Collection filter not authorized');
    });

    it('Get all widgets with collection filter as string should return a 400 error', async () => {
        nock(process.env.CT_URL)
            .post('/v1/collection/find-by-ids', {
                ids: 'xxx',
                userId: USER.id
            })
            .reply(400, '{"errors":[{"status":400,"detail":"[{\\"ids\\":\\"\'ids\' must be a non-empty array\\"}]"}]}');

        const response = await requester.get(`/api/v1/widget?collection=xxx`).query({ loggedUser: JSON.stringify(USER) });

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array').and.length(1);
        response.body.errors[0].should.have.property('detail').and.equal('Error loading associated collection: 400 - {"errors":[{"status":400,"detail":"[{\\"ids\\":\\"\'ids\' must be a non-empty array\\"}]"}]}');
    });

    it('Get all widgets with collection filter as string should return the matching widgets (happy case)', async () => {
        const widgetOne = await new Widget(createWidget(undefined, 'xxx')).save();
        await new Widget(createWidget()).save();
        const collectionId = mongoose.Types.ObjectId().toString();

        nock(process.env.CT_URL)
            .post('/v1/collection/find-by-ids', {
                ids: collectionId,
                userId: USER.id
            })
            .reply(200, {
                data: [{
                    id: collectionId,
                    type: 'collection',
                    attributes: {
                        name: 'some name',
                        ownerId: USER.id,
                        application: 'gfw',
                        resources: [{
                            id: widgetOne.id,
                            type: 'widget'
                        }]
                    }
                }]

            });

        const response = await requester.get(`/api/v1/widget`).query({
            collection: collectionId,
            loggedUser: JSON.stringify(USER)
        });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];
        widgetOne.name.should.equal(responseWidgetOne.attributes.name);
    });

    it('Get all widgets with collection filter as array should return the matching widgets (happy case)', async () => {
        const widgetOne = await new Widget(createWidget(undefined, 'xxx')).save();
        const widgetTwo = await new Widget(createWidget()).save();
        const collectionIdOne = mongoose.Types.ObjectId().toString();
        const collectionIdTwo = mongoose.Types.ObjectId().toString();

        nock(process.env.CT_URL)
            .post('/v1/collection/find-by-ids', {
                ids: [collectionIdOne, collectionIdTwo],
                userId: USER.id
            })
            .reply(200, {
                data: [{
                    id: collectionIdOne,
                    type: 'collection',
                    attributes: {
                        name: 'some name',
                        ownerId: USER.id,
                        application: 'gfw',
                        resources: [{
                            id: widgetOne.id,
                            type: 'widget'
                        }]
                    }
                }, {
                    id: collectionIdTwo,
                    type: 'collection',
                    attributes: {
                        name: 'some name',
                        ownerId: USER.id,
                        application: 'gfw',
                        resources: [{
                            id: widgetTwo.id,
                            type: 'widget'
                        }]
                    }
                }]

            });

        const response = await requester.get(`/api/v1/widget`).query({
            collection: [collectionIdOne, collectionIdTwo],
            loggedUser: JSON.stringify(USER)
        });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetNames = response.body.data.map(widget => widget.attributes.name);
        responseWidgetNames.should.contain(widgetOne.name);
        responseWidgetNames.should.contain(widgetTwo.name);
    });

    it('Get all widgets with collection filter and with no widget resources on collections should return an empty list', async () => {
        const widgetOne = await new Widget(createWidget(undefined, 'xxx')).save();
        const widgetTwo = await new Widget(createWidget()).save();
        const collectionIdOne = mongoose.Types.ObjectId().toString();
        const collectionIdTwo = mongoose.Types.ObjectId().toString();

        nock(process.env.CT_URL)
            .post('/v1/collection/find-by-ids', {
                ids: [collectionIdOne, collectionIdTwo],
                userId: USER.id
            })
            .reply(200, {
                data: [{
                    id: collectionIdOne,
                    type: 'collection',
                    attributes: {
                        name: 'some name',
                        ownerId: USER.id,
                        application: 'gfw',
                        resources: [{
                            id: widgetOne.id,
                            type: 'foo'
                        }]
                    }
                }, {
                    id: collectionIdTwo,
                    type: 'collection',
                    attributes: {
                        name: 'some name',
                        ownerId: USER.id,
                        application: 'gfw',
                        resources: [{
                            id: widgetTwo.id,
                            type: 'bar'
                        }]
                    }
                }]

            });

        const response = await requester.get(`/api/v1/widget`).query({
            collection: [collectionIdOne, collectionIdTwo],
            loggedUser: JSON.stringify(USER)
        });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Getting widgets with includes user and user role USER should not add the usersRole query param to the pagination links', async () => {
        await new Widget(createWidget()).save();
        nock(process.env.CT_URL).get('/auth/user/ids/USER').reply(200, { data: [USER.id] });

        const response = await requester
            .get(`/api/v1/widget`)
            .query({
                includes: 'user',
                'user.role': 'USER',
                loggedUser: JSON.stringify(ADMIN)
            });

        response.status.should.equal(200);
        response.body.should.have.property('links').and.be.an('object');
        response.body.links.should.have.property('first').and.not.contain('usersRole=');
        response.body.links.should.have.property('last').and.not.contain('usersRole=');
        response.body.links.should.have.property('prev').and.not.contain('usersRole=');
        response.body.links.should.have.property('next').and.not.contain('usersRole=');
        response.body.links.should.have.property('self').and.not.contain('usersRole=');
    });

    /**
     * We'll want to limit the maximum page size in the future
     * However, as this will cause a production BC break, we can't enforce it just now
     */
    // it('Getting widgets with page size over 100 should return 400 Bad Request', async () => {
    //     const list = await requester.get('/api/v1/widget?page[size]=101');
    //     list.status.should.equal(400);
    //     list.body.errors[0].should.have.property('detail').and.equal('Invalid page size');
    // });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Widget.deleteMany({}).exec();
    });
});
