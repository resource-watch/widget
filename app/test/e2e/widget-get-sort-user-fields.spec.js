const nock = require('nock');
const Widget = require('models/widget.model');
const chai = require('chai');
const mongoose = require('mongoose');
const { getTestServer } = require('./utils/test-server');
const { createWidget, mockGetUserFromToken } = require('./utils/helpers');
const { createMockUser } = require('./utils/mock');
const {
    USERS: {
        USER, MANAGER, ADMIN, SUPERADMIN
    }
} = require('./utils/test.constants');

chai.should();

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;

const mockUsersForSort = (users) => {
    // Add _id property to provided users (some stuff uses _id, some uses id :shrug:)
    const fullUsers = users.map(u => ({ ...u, _id: u.id }));

    // Mock each user request (for includes=user)
    fullUsers.map(user => createMockUser([user]));

    // Mock all users request (for sorting by user role)
    createMockUser(fullUsers);
};

const mockWidgetsForSorting = async () => {
    const id = mongoose.Types.ObjectId();
    await new Widget(createWidget({ userId: USER.id })).save();
    await new Widget(createWidget({ userId: MANAGER.id })).save();
    await new Widget(createWidget({ userId: ADMIN.id })).save();
    await new Widget(createWidget({ userId: SUPERADMIN.id })).save();
    await new Widget(createWidget({ userId: id })).save();

    mockUsersForSort([
        USER, MANAGER, ADMIN, SUPERADMIN, { id }
    ]);
};

describe('GET widgets sorted by user fields', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Getting widgets sorted by user.role ASC without authentication should return 403 Forbidden', async () => {
        const response = await requester.get('/api/v1/widget').query({ sort: 'user.role' });
        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Sorting by user name or role not authorized.');
    });

    it('Getting widgets sorted by user.role ASC with user with role USER should return 403 Forbidden', async () => {
        mockGetUserFromToken(USER);
        const response = await requester
            .get('/api/v1/widget')
            .set('Authorization', `Bearer abcd`)
            .query({
                sort: 'user.role',
            });
        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Sorting by user name or role not authorized.');
    });

    it('Getting widgets sorted by user.role ASC with user with role MANAGER should return 403 Forbidden', async () => {
        mockGetUserFromToken(MANAGER);
        const response = await requester
            .get('/api/v1/widget')
            .set('Authorization', `Bearer abcd`)
            .query({
                sort: 'user.role',
            });
        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Sorting by user name or role not authorized.');
    });

    it('Getting widgets sorted by user.role ASC should return a list of widgets ordered by the role of the user who created the widget (happy case)', async () => {
        mockGetUserFromToken(ADMIN);
        await mockWidgetsForSorting();
        const response = await requester
            .get('/api/v1/widget')
            .set('Authorization', `Bearer abcd`)
            .query({
                includes: 'user',
                sort: 'user.role',
            });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(5);
        response.body.data.map(widget => widget.attributes.user.role).should.be.deep.equal(['ADMIN', 'MANAGER', 'SUPERADMIN', 'USER', undefined]);
    });

    it('Getting widgets sorted by user.role DESC should return a list of widgets ordered by the role of the user who created the widget (happy case)', async () => {
        mockGetUserFromToken(ADMIN);
        await mockWidgetsForSorting();
        const response = await requester
            .get('/api/v1/widget')
            .set('Authorization', `Bearer abcd`)
            .query({
                includes: 'user',
                sort: '-user.role',
            });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(5);
        response.body.data.map(widget => widget.attributes.user.role).should.be.deep.equal([undefined, 'USER', 'SUPERADMIN', 'MANAGER', 'ADMIN']);
    });

    it('Getting widgets sorted by user.name ASC should return a list of widgets ordered by the name of the user who created the widget (happy case)', async () => {
        mockGetUserFromToken(ADMIN);
        await mockWidgetsForSorting();
        const response = await requester
            .get('/api/v1/widget')
            .set('Authorization', `Bearer abcd`)
            .query({
                includes: 'user',
                sort: 'user.name',
            });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(5);
        response.body.data.map(widget => widget.attributes.user.name).should.be.deep.equal(['test admin', 'test manager', 'test super admin', 'test user', undefined]);
    });

    it('Getting widgets sorted by user.name DESC should return a list of widgets ordered by the name of the user who created the widget (happy case)', async () => {
        mockGetUserFromToken(ADMIN);
        await mockWidgetsForSorting();
        const response = await requester
            .get('/api/v1/widget')
            .set('Authorization', `Bearer abcd`)
            .query({
                includes: 'user',
                sort: '-user.name',
            });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(5);
        response.body.data.map(widget => widget.attributes.user.name).should.be.deep.equal([undefined, 'test user', 'test super admin', 'test manager', 'test admin']);
    });

    it('Sorting widgets by user role ASC puts widgets without valid users in the end of the list', async () => {
        mockGetUserFromToken(ADMIN);
        await new Widget(createWidget({ userId: USER.id })).save();
        await new Widget(createWidget({ userId: MANAGER.id })).save();
        await new Widget(createWidget({ userId: ADMIN.id })).save();
        await new Widget(createWidget({ userId: SUPERADMIN.id })).save();
        const noUserWidget1 = await new Widget(createWidget({ userId: 'legacy' })).save();
        const noUserWidget2 = await new Widget(createWidget({ userId: '5accc3660bb7c603ba473d0f' })).save();

        // Mock requests for includes=user
        const fullUsers = [USER, MANAGER, ADMIN, SUPERADMIN].map(u => ({ ...u, _id: u.id }));

        // Custom mock find-by-ids call
        const userIds = [USER.id, MANAGER.id, ADMIN.id, SUPERADMIN.id, '5accc3660bb7c603ba473d0f'];

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: userIds })
            .reply(200, { data: fullUsers });

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: [USER.id] })
            .reply(200, { data: [{ ...USER, _id: USER.id }] });

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: [MANAGER.id] })
            .reply(200, { data: [{ ...MANAGER, _id: MANAGER.id }] });

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: [ADMIN.id] })
            .reply(200, { data: [{ ...ADMIN, _id: ADMIN.id }] });

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: [SUPERADMIN.id] })
            .reply(200, { data: [{ ...SUPERADMIN, _id: SUPERADMIN.id }] });

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: [noUserWidget1.userId] })
            .reply(200, { data: [] });

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: [noUserWidget2.userId] })
            .reply(200, { data: [] });

        const response = await requester
            .get('/api/v1/widget')
            .set('Authorization', `Bearer abcd`)
            .query({
                includes: 'user',
                sort: 'user.role',
            });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(6);

        const returnedNoUserWidget1 = response.body.data.find(dataset => dataset.id === noUserWidget1._id);
        const returnedNoUserWidget2 = response.body.data.find(dataset => dataset.id === noUserWidget2._id);

        // Grab the last two widgets of the returned data
        const len = response.body.data.length;
        const lastTwoWidgets = response.body.data.slice(len - 2, len);
        lastTwoWidgets.includes(returnedNoUserWidget1).should.be.equal(true);
        lastTwoWidgets.includes(returnedNoUserWidget2).should.be.equal(true);
    });

    it('Sorting widgets by user role DESC puts widgets without valid users in the beginning of the list', async () => {
        mockGetUserFromToken(ADMIN);
        await new Widget(createWidget({ userId: USER.id })).save();
        await new Widget(createWidget({ userId: MANAGER.id })).save();
        await new Widget(createWidget({ userId: ADMIN.id })).save();
        await new Widget(createWidget({ userId: SUPERADMIN.id })).save();
        const noUserWidget1 = await new Widget(createWidget({ userId: 'legacy' })).save();
        const noUserWidget2 = await new Widget(createWidget({ userId: '5accc3660bb7c603ba473d0f' })).save();

        // Mock requests for includes=user
        const fullUsers = [USER, MANAGER, ADMIN, SUPERADMIN].map(u => ({ ...u, _id: u.id }));

        // Custom mock find-by-ids call
        const userIds = [USER.id, MANAGER.id, ADMIN.id, SUPERADMIN.id, '5accc3660bb7c603ba473d0f'];

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: userIds })
            .reply(200, { data: fullUsers });

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: [USER.id] })
            .reply(200, { data: [{ ...USER, _id: USER.id }] });

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: [MANAGER.id] })
            .reply(200, { data: [{ ...MANAGER, _id: MANAGER.id }] });

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: [ADMIN.id] })
            .reply(200, { data: [{ ...ADMIN, _id: ADMIN.id }] });

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: [SUPERADMIN.id] })
            .reply(200, { data: [{ ...SUPERADMIN, _id: SUPERADMIN.id }] });

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: [noUserWidget1.userId] })
            .reply(200, { data: [] });

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: [noUserWidget2.userId] })
            .reply(200, { data: [] });

        const response = await requester
            .get('/api/v1/widget')
            .set('Authorization', `Bearer abcd`)
            .query({
                includes: 'user',
                sort: '-user.role',
            });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(6);

        const returnedNoUserWidget1 = response.body.data.find(dataset => dataset.id === noUserWidget1._id);
        const returnedNoUserWidget2 = response.body.data.find(dataset => dataset.id === noUserWidget2._id);

        // Grab the first two widgets of the returned data
        const firstTwoWidgets = response.body.data.slice(0, 2);
        firstTwoWidgets.includes(returnedNoUserWidget1).should.be.equal(true);
        firstTwoWidgets.includes(returnedNoUserWidget2).should.be.equal(true);
    });

    it('Sorting widgets by user.name is case insensitive and returns a list of widgets ordered by the name of the user who created the widget', async () => {
        mockGetUserFromToken(ADMIN);
        const firstUser = { ...USER, name: 'Anthony' };
        const secondUser = { ...MANAGER, name: 'bernard' };
        const thirdUser = { ...ADMIN, name: 'Carlos' };
        await new Widget(createWidget({ userId: firstUser.id })).save();
        await new Widget(createWidget({ userId: secondUser.id })).save();
        await new Widget(createWidget({ userId: thirdUser.id })).save();
        mockUsersForSort([firstUser, secondUser, thirdUser]);

        const response = await requester
            .get('/api/v1/widget')
            .set('Authorization', `Bearer abcd`)
            .query({
                includes: 'user',
                sort: 'user.name',
            });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(3);
        response.body.data.map(widget => widget.attributes.user.name).should.be.deep.equal(['Anthony', 'bernard', 'Carlos']);
    });

    it('Sorting widgets by user.name is deterministic, applying an implicit sort by id after sorting by user.name', async () => {
        mockGetUserFromToken(ADMIN);
        const spoofedUser = { ...USER, name: 'AAA' };
        const spoofedManager = { ...MANAGER, name: 'AAA' };
        const spoofedAdmin = { ...ADMIN, name: 'AAA' };
        await new Widget(createWidget({ userId: spoofedUser.id, _id: '3' })).save();
        await new Widget(createWidget({ userId: spoofedManager.id, _id: '2' })).save();
        await new Widget(createWidget({ userId: spoofedAdmin.id, _id: '1' })).save();
        mockUsersForSort([spoofedUser, spoofedManager, spoofedAdmin]);

        const response = await requester
            .get('/api/v1/widget')
            .set('Authorization', `Bearer abcd`)
            .query({
                includes: 'user',
                sort: 'user.name',
            });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(3);
        response.body.data.map(widget => widget.id).should.be.deep.equal(['1', '2', '3']);
    });

    afterEach(async () => {
        await Widget.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
