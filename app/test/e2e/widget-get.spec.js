const nock = require('nock');
const chai = require('chai');
const config = require('config');
const mongoose = require('mongoose');
const Widget = require('models/widget.model');
const { USERS: { USER, MANAGER, ADMIN } } = require('./utils/test.constants');
const { getTestServer } = require('./utils/test-server');
const {
    createWidget, ensureCorrectWidget, getUUID, createVocabulary, createWidgetMetadata,
    mockValidateRequestWithApiKey, mockValidateRequestWithApiKeyAndUserToken
} = require('./utils/helpers');
const {
    createMockUser, createMockUserRole, createMockVocabulary, createMockGetMetadata
} = require('./utils/mock');

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

    describe('Test pagination links', () => {
        it('Get widgets without referer header should be successful and use the request host', async () => {
            mockValidateRequestWithApiKey({});

            const response = await requester
                .get(`/api/v1/widget`)
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?page[number]=1&page[size]=10`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?page[number]=1&page[size]=10`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?page[number]=1&page[size]=10`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?page[number]=1&page[size]=10`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?page[number]=1&page[size]=10`);
        });

        it('Get widgets with referer header should be successful and use that header on the links on the response', async () => {
            mockValidateRequestWithApiKey({});
            const response = await requester
                .get(`/api/v1/widget`)
                .set('referer', `https://potato.com/get-me-all-the-data`)
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal('http://potato.com/v1/widget?page[number]=1&page[size]=10');
            response.body.links.should.have.property('prev').and.equal('http://potato.com/v1/widget?page[number]=1&page[size]=10');
            response.body.links.should.have.property('next').and.equal('http://potato.com/v1/widget?page[number]=1&page[size]=10');
            response.body.links.should.have.property('first').and.equal('http://potato.com/v1/widget?page[number]=1&page[size]=10');
            response.body.links.should.have.property('last').and.equal('http://potato.com/v1/widget?page[number]=1&page[size]=10');
        });

        it('Get widgets with x-rw-domain header should be successful and use that header on the links on the response', async () => {
            mockValidateRequestWithApiKey({});
            const response = await requester
                .get(`/api/v1/widget`)
                .set('x-rw-domain', `potato.com`)
                .set('x-api-key', 'api-key-test');

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal('http://potato.com/v1/widget?page[number]=1&page[size]=10');
            response.body.links.should.have.property('prev').and.equal('http://potato.com/v1/widget?page[number]=1&page[size]=10');
            response.body.links.should.have.property('next').and.equal('http://potato.com/v1/widget?page[number]=1&page[size]=10');
            response.body.links.should.have.property('first').and.equal('http://potato.com/v1/widget?page[number]=1&page[size]=10');
            response.body.links.should.have.property('last').and.equal('http://potato.com/v1/widget?page[number]=1&page[size]=10');
        });

        it('Get widgets with x-rw-domain and referer headers should be successful and use the x-rw-domain header on the links on the response', async () => {
            mockValidateRequestWithApiKey({});
            const response = await requester
                .get(`/api/v1/widget`)
                .set('x-rw-domain', `potato.com`)
                .set('x-api-key', 'api-key-test')
                .set('referer', `https://tomato.com/get-me-all-the-data`);

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal('http://potato.com/v1/widget?page[number]=1&page[size]=10');
            response.body.links.should.have.property('prev').and.equal('http://potato.com/v1/widget?page[number]=1&page[size]=10');
            response.body.links.should.have.property('next').and.equal('http://potato.com/v1/widget?page[number]=1&page[size]=10');
            response.body.links.should.have.property('first').and.equal('http://potato.com/v1/widget?page[number]=1&page[size]=10');
            response.body.links.should.have.property('last').and.equal('http://potato.com/v1/widget?page[number]=1&page[size]=10');
        });
    });

    /*
    @TODO: metadata don't have envs, so that's fine
    however, vocabularies will, so you need to properly account for that
    We should only filter included entities if filterIncludesByEnv is passed as true
     */
    describe('Includes', () => {
        it('Get widgets including metadata - env filter is ignored for metadata', async () => {
            mockValidateRequestWithApiKey({});
            const widgetOne = await new Widget(createWidget({ env: 'custom' })).save();
            const metadata = createWidgetMetadata(widgetOne.dataset, widgetOne._id);
            createMockGetMetadata(metadata, widgetOne.dataset);

            const response = await requester
                .get(`/api/v1/widget`)
                .set('x-api-key', 'api-key-test')
                .query({ includes: 'metadata', env: 'custom' });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(1);
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=metadata&env=custom&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=metadata&env=custom&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=metadata&env=custom&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=metadata&env=custom&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=metadata&env=custom&page[number]=1&page[size]=10`);

            const responseWidgetOne = response.body.data[0];

            ensureCorrectWidget({ ...widgetOne.toObject(), metadata }, responseWidgetOne);
        });

        it('Get widgets includes vocabulary', async () => {
            mockValidateRequestWithApiKey({});
            const widgetOne = await new Widget(createWidget()).save();
            const vocabulary = createVocabulary(widgetOne._id);
            createMockVocabulary(vocabulary, widgetOne.dataset, widgetOne._id);

            const response = await requester
                .get(`/api/v1/widget`)
                .set('x-api-key', 'api-key-test')
                .query({ includes: 'vocabulary' });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(1);
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&page[number]=1&page[size]=10`);

            const responseWidgetOne = response.body.data[0];

            ensureCorrectWidget({ ...widgetOne.toObject(), vocabulary }, responseWidgetOne);
        });

        it('Get widgets includes vocabulary from custom env without filterIncludesByEnv should return widget filtered by the custom env including the associated vocabulary not filtered by the custom env', async () => {
            mockValidateRequestWithApiKey({});
            const widgetOne = await new Widget(createWidget({ env: 'custom' })).save();
            const vocabulary = createVocabulary(widgetOne._id);
            createMockVocabulary(vocabulary, widgetOne.dataset, widgetOne._id);

            const response = await requester
                .get(`/api/v1/widget`)
                .set('x-api-key', 'api-key-test')
                .query({ includes: 'vocabulary', env: 'custom' });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(1);
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&env=custom&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&env=custom&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&env=custom&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&env=custom&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&env=custom&page[number]=1&page[size]=10`);

            const responseWidgetOne = response.body.data[0];

            ensureCorrectWidget({ ...widgetOne.toObject(), vocabulary }, responseWidgetOne);
        });

        it('Get widgets includes vocabulary from custom env with filterIncludesByEnv should return widget filtered by the custom env including the associated vocabulary filtered by the custom env', async () => {
            mockValidateRequestWithApiKey({});
            const widgetOne = await new Widget(createWidget({ env: 'custom' })).save();
            const vocabulary = createVocabulary(widgetOne._id);
            createMockVocabulary(vocabulary, widgetOne.dataset, widgetOne._id, { env: 'custom' });

            const response = await requester
                .get(`/api/v1/widget`)
                .set('x-api-key', 'api-key-test')
                .query({ includes: 'vocabulary', env: 'custom', filterIncludesByEnv: true });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(1);
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&env=custom&filterIncludesByEnv=true&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&env=custom&filterIncludesByEnv=true&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&env=custom&filterIncludesByEnv=true&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&env=custom&filterIncludesByEnv=true&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&env=custom&filterIncludesByEnv=true&page[number]=1&page[size]=10`);

            const responseWidgetOne = response.body.data[0];

            ensureCorrectWidget({ ...widgetOne.toObject(), vocabulary }, responseWidgetOne);
        });

        it('Get widgets includes vocabulary and metadata from custom env with filterIncludesByEnv should return widget filtered by the custom env including the associated vocabulary filtered by the custom env, but metadata is not filtered', async () => {
            mockValidateRequestWithApiKey({});
            const widgetOne = await new Widget(createWidget({ env: 'custom' })).save();
            const vocabulary = createVocabulary(widgetOne._id);
            createMockVocabulary(vocabulary, widgetOne.dataset, widgetOne._id, { env: 'custom' });
            const metadata = createWidgetMetadata(widgetOne.dataset, widgetOne._id);
            createMockGetMetadata(metadata, widgetOne.dataset);

            const response = await requester
                .get(`/api/v1/widget`)
                .set('x-api-key', 'api-key-test')
                .query({ includes: ['metadata', 'vocabulary'].join(','), env: 'custom', filterIncludesByEnv: true });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(1);
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=metadata%2Cvocabulary&env=custom&filterIncludesByEnv=true&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=metadata%2Cvocabulary&env=custom&filterIncludesByEnv=true&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=metadata%2Cvocabulary&env=custom&filterIncludesByEnv=true&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=metadata%2Cvocabulary&env=custom&filterIncludesByEnv=true&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=metadata%2Cvocabulary&env=custom&filterIncludesByEnv=true&page[number]=1&page[size]=10`);

            const responseWidgetOne = response.body.data[0];

            ensureCorrectWidget({ ...widgetOne.toObject(), vocabulary, metadata }, responseWidgetOne);
        });

        it('Get widgets includes vocabulary from custom env with filterIncludesByEnv should return widget filtered by the custom env including the associated vocabulary filtered by the custom env (multi-env)', async () => {
            mockValidateRequestWithApiKey({});
            const widgetOne = await new Widget(createWidget({ env: 'custom' })).save();
            const widgetTwo = await new Widget(createWidget({ env: 'potato' })).save();
            const vocabulary = createVocabulary(widgetOne._id);
            createMockVocabulary(vocabulary, widgetOne.dataset, widgetOne._id, { env: 'custom,potato' });
            createMockVocabulary(vocabulary, widgetTwo.dataset, widgetTwo._id, { env: 'custom,potato' });

            const response = await requester
                .get(`/api/v1/widget`)
                .set('x-api-key', 'api-key-test')
                .query({ includes: 'vocabulary', env: 'custom,potato', filterIncludesByEnv: true });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(2);
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&env=custom%2Cpotato&filterIncludesByEnv=true&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&env=custom%2Cpotato&filterIncludesByEnv=true&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&env=custom%2Cpotato&filterIncludesByEnv=true&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&env=custom%2Cpotato&filterIncludesByEnv=true&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?includes=vocabulary&env=custom%2Cpotato&filterIncludesByEnv=true&page[number]=1&page[size]=10`);

            ensureCorrectWidget({ ...widgetOne.toObject(), vocabulary }, response.body.data[0]);
            ensureCorrectWidget({ ...widgetTwo.toObject(), vocabulary }, response.body.data[1]);
        });

        it('Get widgets includes metadata and vocabulary should return widgets with included data', async () => {
            mockValidateRequestWithApiKey({});
            const widgetOne = await new Widget(createWidget()).save();

            const vocabulary = createVocabulary(widgetOne._id);
            createMockVocabulary(vocabulary, widgetOne.dataset, widgetOne._id);
            const metadata = createWidgetMetadata(widgetOne.dataset, widgetOne._id);
            createMockGetMetadata(metadata, widgetOne.dataset);

            const response = await requester
                .get(`/api/v1/widget`)
                .set('x-api-key', 'api-key-test')
                .query({ includes: ['metadata', 'vocabulary'].join(',') });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(1);
            response.body.should.have.property('links').and.be.an('object');

            const responseWidgetOne = response.body.data[0];

            ensureCorrectWidget({ ...widgetOne.toObject(), vocabulary, metadata }, responseWidgetOne);
        });

        it('Get all widgets with includes=user should be successful and return a list of widgets with associated user name and email (populated db, anonymous call)', async () => {
            mockValidateRequestWithApiKey({});
            const widgetOne = await new Widget(createWidget({ userId: ADMIN.id })).save();
            const widgetTwo = await new Widget(createWidget({ userId: MANAGER.id })).save();

            createMockUser([ADMIN]);
            createMockUser([MANAGER]);

            const response = await requester
                .get(`/api/v1/widget?includes=user`)
                .set('x-api-key', 'api-key-test')
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

        it('Get all widgets with includes=user should be successful and return a list of widgets with associated user name and email (populated db, USER role)', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: USER });
            const widgetOne = await new Widget(createWidget({ userId: ADMIN.id })).save();
            const widgetTwo = await new Widget(createWidget({ userId: MANAGER.id })).save();

            createMockUser([ADMIN]);
            createMockUser([MANAGER]);

            const response = await requester.get(`/api/v1/widget`)
                .query({
                    includes: 'user',
                })
                .set('Authorization', `Bearer abcd`)
                .set('x-api-key', 'api-key-test')
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
            mockValidateRequestWithApiKeyAndUserToken({ user: MANAGER });
            const widgetOne = await new Widget(createWidget({ userId: ADMIN.id })).save();
            const widgetTwo = await new Widget(createWidget({ userId: MANAGER.id })).save();

            createMockUser([ADMIN]);
            createMockUser([MANAGER]);

            const response = await requester.get(`/api/v1/widget`)
                .query({
                    includes: 'user',
                })
                .set('Authorization', `Bearer abcd`)
                .set('x-api-key', 'api-key-test')
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
            mockValidateRequestWithApiKeyAndUserToken({ user: ADMIN });
            const widgetOne = await new Widget(createWidget({ userId: ADMIN.id })).save();
            const widgetTwo = await new Widget(createWidget({ userId: MANAGER.id })).save();

            createMockUser([ADMIN]);
            createMockUser([MANAGER]);

            const response = await requester
                .get(`/api/v1/widget`)
                .set('Authorization', `Bearer abcd`)
                .set('x-api-key', 'api-key-test')
                .query({
                    includes: 'user',
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
            mockValidateRequestWithApiKey({});
            const widgetOne = await new Widget(createWidget()).save();
            const widgetTwo = await new Widget(createWidget()).save();

            createMockUser([ADMIN]);

            nock(process.env.GATEWAY_URL, {
                reqheaders: {
                    'x-api-key': 'api-key-test',
                }
            })
                .post('/auth/user/find-by-ids', {
                    ids: [widgetTwo.userId]
                })
                .reply(200, {
                    data: []
                });

            const response = await requester
                .get(`/api/v1/widget?includes=user`)
                .set('x-api-key', 'api-key-test')
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
            responseWidgetTwo.attributes.should.not.have.property('user');
        });

        it('Get all widgets with includes=user should return a list of widgets and user name, email and role, even if only partial data exists', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: ADMIN });
            const widgetOne = await new Widget(createWidget()).save();
            const widgetTwo = await new Widget(createWidget()).save();
            const widgetThree = await new Widget(createWidget()).save();

            createMockUser([{
                ...USER,
                id: widgetOne.userId,
                email: 'user-one@wri.org',
                name: 'test user'
            }]);

            createMockUser([{
                ...MANAGER,
                id: widgetTwo.userId,
                name: undefined,
                email: 'user-two@wri.org'
            }]);

            createMockUser([{
                ...MANAGER,
                id: widgetThree.userId,
                name: 'user three',
                email: undefined
            }]);

            const response = await requester
                .get(`/api/v1/widget`)
                .set('Authorization', `Bearer abcd`)
                .set('x-api-key', 'api-key-test')
                .query({
                    includes: 'user',
                })
                .send();

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(3);
            response.body.should.have.property('links').and.be.an('object');

            const responseWidgetOne = response.body.data.find((widget) => widget.id === widgetOne.id);
            const responseWidgetTwo = response.body.data.find((widget) => widget.id === widgetTwo.id);
            const responseWidgetThree = response.body.data.find((widget) => widget.id === widgetThree.id);

            responseWidgetOne.attributes.name.should.equal(widgetOne.name);
            responseWidgetOne.attributes.dataset.should.equal(widgetOne.dataset);
            responseWidgetOne.attributes.userId.should.equal(widgetOne.userId);
            responseWidgetOne.attributes.slug.should.equal(widgetOne.slug);
            responseWidgetOne.attributes.sourceUrl.should.equal(widgetOne.sourceUrl);
            responseWidgetOne.attributes.queryUrl.should.equal(widgetOne.queryUrl);
            responseWidgetOne.attributes.should.have.property('user').and.should.be.an('object');
            responseWidgetOne.attributes.user.name.should.be.a('string').and.equal('test user');
            responseWidgetOne.attributes.user.email.should.be.a('string').and.equal('user-one@wri.org');
            responseWidgetOne.attributes.user.role.should.be.a('string').and.equal('USER');

            responseWidgetTwo.attributes.name.should.equal(widgetTwo.name);
            responseWidgetTwo.attributes.dataset.should.equal(widgetTwo.dataset);
            responseWidgetTwo.attributes.userId.should.equal(widgetTwo.userId);
            responseWidgetTwo.attributes.slug.should.equal(widgetTwo.slug);
            responseWidgetTwo.attributes.sourceUrl.should.equal(widgetTwo.sourceUrl);
            responseWidgetTwo.attributes.queryUrl.should.equal(widgetTwo.queryUrl);
            responseWidgetTwo.attributes.user.role.should.be.a('string').and.equal('MANAGER');
            responseWidgetTwo.attributes.user.email.should.be.a('string').and.equal('user-two@wri.org');
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

        it('Getting widgets with includes user and user role USER should not add the usersRole query param to the pagination links', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: ADMIN });
            await new Widget(createWidget()).save();
            nock(process.env.GATEWAY_URL, {
                reqheaders: {
                    'x-api-key': 'api-key-test',
                }
            }).get('/auth/user/ids/USER').reply(200, { data: [USER.id] });

            const response = await requester
                .get(`/api/v1/widget`)
                .set('Authorization', `Bearer abcd`)
                .set('x-api-key', 'api-key-test')
                .query({
                    includes: 'user',
                    'user.role': 'USER',
                });

            response.status.should.equal(200);
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('first').and.not.contain('usersRole=');
            response.body.links.should.have.property('last').and.not.contain('usersRole=');
            response.body.links.should.have.property('prev').and.not.contain('usersRole=');
            response.body.links.should.have.property('next').and.not.contain('usersRole=');
            response.body.links.should.have.property('self').and.not.contain('usersRole=');
        });
    });

    describe('Environment', () => {
        it('Get widgets without env param should filter by env=production', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: ADMIN });
            const widgetOne = await new Widget(createWidget()).save();
            await new Widget(createWidget({ env: 'custom' })).save();

            const response = await requester
                .get(`/api/v1/widget`)
                .set('Authorization', `Bearer abcd`)
                .set('x-api-key', 'api-key-test')
                .query();

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(1);
            response.body.data[0].should.have.property('id').and.equal(widgetOne.id);
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?page[number]=1&page[size]=10`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?page[number]=1&page[size]=10`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?page[number]=1&page[size]=10`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?page[number]=1&page[size]=10`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?page[number]=1&page[size]=10`);

            const responseWidgetOne = response.body.data[0];

            ensureCorrectWidget(widgetOne, responseWidgetOne);
        });

        it('Get widgets with all env query parameter should return widgets from every env', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: ADMIN });
            const widgetOne = await new Widget(createWidget()).save();
            const widgetTwo = await new Widget(createWidget({ env: 'custom' })).save();
            const widgetThree = await new Widget(createWidget({ env: 'potato' })).save();

            const response = await requester
                .get(`/api/v1/widget`)
                .set('Authorization', `Bearer abcd`)
                .set('x-api-key', 'api-key-test')
                .query({
                    env: 'all'
                });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(3);
            response.body.data[0].should.have.property('id').and.equal(widgetOne.id);
            response.body.data[1].should.have.property('id').and.equal(widgetTwo.id);
            response.body.data[2].should.have.property('id').and.equal(widgetThree.id);
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?env=all&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?env=all&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?env=all&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?env=all&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?env=all&page[number]=1&page[size]=10`);

            const responseWidgetOne = response.body.data[0];
            const responseWidgetTwo = response.body.data[1];
            const responseWidgetThree = response.body.data[2];

            ensureCorrectWidget(widgetOne, responseWidgetOne);
            ensureCorrectWidget(widgetTwo, responseWidgetTwo);
            ensureCorrectWidget(widgetThree, responseWidgetThree);
        });

        it('Get widgets with env query parameter should return the matching widgets (single value env)', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: ADMIN });
            await new Widget(createWidget()).save();
            await new Widget(createWidget({ env: 'potato' })).save();
            const widgetTwo = await new Widget(createWidget({ env: 'dev' })).save();
            await new Widget(createWidget({ env: 'custom' })).save();

            const response = await requester
                .get(`/api/v1/widget`)
                .set('Authorization', `Bearer abcd`)
                .set('x-api-key', 'api-key-test')
                .query({
                    env: 'dev'
                });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(1);
            response.body.data.map((elem) => elem.id).sort().should.deep.equal([widgetTwo.id].sort());
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?env=dev&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?env=dev&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?env=dev&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?env=dev&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?env=dev&page[number]=1&page[size]=10`);
        });

        it('Get widgets with env query parameter should return the matching widgets (multi-value env)', async () => {
            mockValidateRequestWithApiKeyAndUserToken({ user: ADMIN });
            const widgetOne = await new Widget(createWidget({ env: 'potato' })).save();
            const widgetTwo = await new Widget(createWidget({ env: 'dev' })).save();
            await new Widget(createWidget({ env: 'custom' })).save();
            const response = await requester
                .get(`/api/v1/widget`)
                .set('Authorization', `Bearer abcd`)
                .set('x-api-key', 'api-key-test')
                .query({
                    env: ['dev', 'potato'].join(',')
                });

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array').and.length(2);
            response.body.data.map((elem) => elem.id).sort().should.deep.equal([widgetOne.id, widgetTwo.id].sort());
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?env=dev%2Cpotato&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?env=dev%2Cpotato&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?env=dev%2Cpotato&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?env=dev%2Cpotato&page[number]=1&page[size]=10`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/widget?env=dev%2Cpotato&page[number]=1&page[size]=10`);
        });
    });

    it('Get all widgets should be successful and return an empty list (empty db)', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .get(`/api/v1/widget`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
        response.body.should.have.property('links').and.be.an('object');
    });

    it('Get all widgets should be successful and return a list of widgets (populated db)', async () => {
        mockValidateRequestWithApiKey({});
        const widgetOne = await new Widget(createWidget()).save();
        const widgetTwo = await new Widget(createWidget()).save();

        const response = await requester
            .get(`/api/v1/widget`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];
        const responseWidgetTwo = response.body.data[1];

        ensureCorrectWidget(widgetOne, responseWidgetOne);
        ensureCorrectWidget(widgetTwo, responseWidgetTwo);
    });

    it('Getting all widgets as ADMIN with query param user.role = ADMIN should return a filtered list of widgets created by ADMIN (populated db)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: ADMIN });
        const adminID = getUUID();

        const widgetOne = await new Widget(createWidget({ userId: adminID })).save();
        await new Widget(createWidget({ userId: MANAGER.id })).save();

        createMockUserRole('ADMIN', adminID);

        const response = await requester
            .get(`/api/v1/widget`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .query({
                'user.role': 'ADMIN',
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];

        ensureCorrectWidget(widgetOne, responseWidgetOne);
    });

    it('Getting all widgets as ADMIN with query param user.role = MANAGER should return a filtered list of widgets created by MANAGER (populated db)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: ADMIN });
        const managerID = getUUID();
        const widgetOne = await new Widget(createWidget({ userId: managerID })).save();
        await new Widget(createWidget(['rw'], USER.id)).save();

        createMockUserRole('MANAGER', managerID);

        const response = await requester
            .get(`/api/v1/widget`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .query({
                'user.role': 'MANAGER',
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];

        ensureCorrectWidget(widgetOne, responseWidgetOne);
    });

    it('Getting all widgets as ADMIN with query param user.role = USER should return a filtered list of widgets created by USER (populated db)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: ADMIN });
        const userID = getUUID();
        const widgetOne = await new Widget(createWidget({ userId: userID })).save();
        await new Widget(createWidget({ userId: MANAGER.id })).save();

        createMockUserRole('USER', userID);

        const response = await requester
            .get(`/api/v1/widget`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .query({
                'user.role': 'USER',
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];

        ensureCorrectWidget(widgetOne, responseWidgetOne);
    });

    it('Getting all widgets as MANAGER with query param user.role = USER should return an unfiltered list of widgets (populated db)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USER });
        const userID = getUUID();

        const widgetOne = await new Widget(createWidget({ userId: userID })).save();
        await new Widget(createWidget({ userId: userID })).save();

        const response = await requester
            .get(`/api/v1/widget`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .query({
                'user.role': 'USER',
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];

        ensureCorrectWidget(widgetOne, responseWidgetOne);
    });

    it('Get all widgets should return widgets owned by user', async () => {
        mockValidateRequestWithApiKey({});
        const widgetOne = await new Widget(createWidget({ userId: 'xxx' })).save();
        await new Widget(createWidget()).save();

        const response = await requester
            .get(`/api/v1/widget?userId=xxx`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];
        widgetOne.name.should.equal(responseWidgetOne.attributes.name);
    });

    it('Get all widgets with collection filter without being authenticated should return a 403 error', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .get(`/api/v1/widget?collection=xxx`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array').and.length(1);
        response.body.errors[0].should.have.property('detail').and.equal('Collection filter not authorized');
    });

    it('Get all widgets with collection filter as string should return a 400 error', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USER });
        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .post('/v1/collection/find-by-ids', {
                ids: 'xxx',
                userId: USER.id
            })
            .reply(400, '{"errors":[{"status":400,"detail":"[{\\"ids\\":\\"\'ids\' must be a non-empty array\\"}]"}]}');

        const response = await requester
            .get(`/api/v1/widget?collection=xxx`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array').and.length(1);
        response.body.errors[0].should.have.property('detail').and.equal('Error loading associated collection: 400 - {"errors":[{"status":400,"detail":"[{\\"ids\\":\\"\'ids\' must be a non-empty array\\"}]"}]}');
    });

    it('Get all widgets with collection filter as string should return the matching widgets (happy case)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USER });
        const widgetOne = await new Widget(createWidget({ userId: 'xxx' })).save();
        await new Widget(createWidget()).save();
        const collectionId = mongoose.Types.ObjectId().toString();

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
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

        const response = await requester
            .get(`/api/v1/widget`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .query({
                collection: collectionId,
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];
        widgetOne.name.should.equal(responseWidgetOne.attributes.name);
    });

    it('Get all widgets with collection filter as array should return the matching widgets (happy case)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USER });
        const widgetOne = await new Widget(createWidget({ userId: 'xxx' })).save();
        const widgetTwo = await new Widget(createWidget()).save();
        const collectionIdOne = mongoose.Types.ObjectId().toString();
        const collectionIdTwo = mongoose.Types.ObjectId().toString();

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
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

        const response = await requester
            .get(`/api/v1/widget`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .query({
                collection: [collectionIdOne, collectionIdTwo],
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetNames = response.body.data.map((widget) => widget.attributes.name);
        responseWidgetNames.should.contain(widgetOne.name);
        responseWidgetNames.should.contain(widgetTwo.name);
    });

    it('Get all widgets with collection filter and with no widget resources on collections should return an empty list', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USER });
        const widgetOne = await new Widget(createWidget(undefined, 'xxx')).save();
        const widgetTwo = await new Widget(createWidget()).save();
        const collectionIdOne = mongoose.Types.ObjectId().toString();
        const collectionIdTwo = mongoose.Types.ObjectId().toString();

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
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

        const response = await requester
            .get(`/api/v1/widget`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .query({
                collection: [collectionIdOne, collectionIdTwo],
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
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
