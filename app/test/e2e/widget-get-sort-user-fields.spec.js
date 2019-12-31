const nock = require('nock');
const Widget = require('models/widget.model');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const { createWidget } = require('./utils/helpers');
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

const mockFourWidgetsForSorting = async () => {
    await new Widget(createWidget(['rw'], USER.id)).save();
    await new Widget(createWidget(['rw'], MANAGER.id)).save();
    await new Widget(createWidget(['rw'], ADMIN.id)).save();
    await new Widget(createWidget(['rw'], SUPERADMIN.id)).save();

    mockUsersForSort([
        USER, MANAGER, ADMIN, SUPERADMIN
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
        const response = await requester.get('/api/v1/widget').query({ sort: 'user.role', loggedUser: JSON.stringify(USER) });
        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Sorting by user name or role not authorized.');
    });

    it('Getting widgets sorted by user.role ASC with user with role MANAGER should return 403 Forbidden', async () => {
        const response = await requester.get('/api/v1/widget').query({ sort: 'user.role', loggedUser: JSON.stringify(MANAGER) });
        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Sorting by user name or role not authorized.');
    });

    it('Getting widgets sorted by user.role ASC should return a list of widgets ordered by the role of the user who created the widget (happy case)', async () => {
        await mockFourWidgetsForSorting();
        const response = await requester.get('/api/v1/widget').query({
            includes: 'user',
            sort: 'user.role',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(4);
        response.body.data.map(widget => widget.attributes.user.role).should.be.deep.equal(['ADMIN', 'MANAGER', 'SUPERADMIN', 'USER']);
    });

    it('Getting widgets sorted by user.role DESC should return a list of widgets ordered by the role of the user who created the widget (happy case)', async () => {
        await mockFourWidgetsForSorting();
        const response = await requester.get('/api/v1/widget').query({
            includes: 'user',
            sort: '-user.role',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(4);
        response.body.data.map(widget => widget.attributes.user.role).should.be.deep.equal(['USER', 'SUPERADMIN', 'MANAGER', 'ADMIN']);
    });

    it('Getting widgets sorted by user.name ASC should return a list of widgets ordered by the name of the user who created the widget (happy case)', async () => {
        await mockFourWidgetsForSorting();
        const response = await requester.get('/api/v1/widget').query({
            includes: 'user',
            sort: 'user.name',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(4);
        response.body.data.map(widget => widget.attributes.user.name).should.be.deep.equal(['test admin', 'test manager', 'test super admin', 'test user']);
    });

    it('Getting widgets sorted by user.name DESC should return a list of widgets ordered by the name of the user who created the widget (happy case)', async () => {
        await mockFourWidgetsForSorting();
        const response = await requester.get('/api/v1/widget').query({
            includes: 'user',
            sort: '-user.name',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(4);
        response.body.data.map(widget => widget.attributes.user.name).should.be.deep.equal(['test user', 'test super admin', 'test manager', 'test admin']);
    });

    it('Sorting widgets by user role ASC puts widgets without valid users in the beginning of the list', async () => {
        await new Widget(createWidget(['rw'], USER.id)).save();
        await new Widget(createWidget(['rw'], MANAGER.id)).save();
        await new Widget(createWidget(['rw'], ADMIN.id)).save();
        await new Widget(createWidget(['rw'], SUPERADMIN.id)).save();
        const noUserWidget = await new Widget(createWidget(['rw'], 'legacy')).save();

        mockUsersForSort([
            USER, MANAGER, ADMIN, SUPERADMIN
        ]);

        const response = await requester.get('/api/v1/widget').query({
            includes: 'user',
            sort: 'user.role',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(5);

        const returnedNoUserWidget = response.body.data.find(widget => widget.id === noUserWidget._id);
        response.body.data.indexOf(returnedNoUserWidget).should.be.equal(0);
    });

    it('Sorting widgets by user role DESC puts widgets without valid users in the end of the list', async () => {
        await new Widget(createWidget(['rw'], USER.id)).save();
        await new Widget(createWidget(['rw'], MANAGER.id)).save();
        await new Widget(createWidget(['rw'], ADMIN.id)).save();
        await new Widget(createWidget(['rw'], SUPERADMIN.id)).save();
        const noUserWidget = await new Widget(createWidget(['rw'], 'legacy')).save();

        mockUsersForSort([
            USER, MANAGER, ADMIN, SUPERADMIN
        ]);

        const response = await requester.get('/api/v1/widget').query({
            includes: 'user',
            sort: '-user.role',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(5);

        const returnedNoUserWidget = response.body.data.find(widget => widget.id === noUserWidget._id);
        response.body.data.indexOf(returnedNoUserWidget).should.be.equal(4);
    });

    afterEach(async () => {
        await Widget.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
