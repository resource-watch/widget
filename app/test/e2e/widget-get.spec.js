/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');

const { getTestServer } = require('./utils/test-server');
const { createWidget } = require('./utils/helpers');

const should = chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Get widgets tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        Widget.remove({}).exec();
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

        widgetOne.name.should.equal(responseWidgetOne.attributes.name);
        widgetOne.dataset.should.equal(responseWidgetOne.attributes.dataset);
        widgetOne.userId.should.equal(responseWidgetOne.attributes.userId);
        widgetOne.slug.should.equal(responseWidgetOne.attributes.slug);
        widgetOne.sourceUrl.should.equal(responseWidgetOne.attributes.sourceUrl);
        widgetOne.queryUrl.should.equal(responseWidgetOne.attributes.queryUrl);

        widgetTwo.name.should.equal(responseWidgetTwo.attributes.name);
        widgetTwo.dataset.should.equal(responseWidgetTwo.attributes.dataset);
        widgetTwo.userId.should.equal(responseWidgetTwo.attributes.userId);
        widgetTwo.slug.should.equal(responseWidgetTwo.attributes.slug);
        widgetTwo.sourceUrl.should.equal(responseWidgetTwo.attributes.sourceUrl);
        widgetTwo.queryUrl.should.equal(responseWidgetTwo.attributes.queryUrl);
    });

    it('Get all widgets with includes=user should be successful and return a list of widgets with associated user name and email (populated db)', async () => {
        const widgetOne = await new Widget(createWidget()).save();
        const widgetTwo = await new Widget(createWidget()).save();

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', {
                ids: [widgetOne.userId]
            })
            .reply(200, {
                data: [
                    {
                        provider: 'local',
                        role: 'ADMIN',
                        _id: widgetOne.userId,
                        email: 'foo@vizzuality.com',
                        createdAt: '2016-08-02T09:34:51.979Z',
                        extraUserData: {
                            apps: [
                                'rw'
                            ]
                        },
                        name: 'Foo Bar',
                        photo: ''
                    }
                ]
            });


        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', {
                ids: [widgetTwo.userId]
            })
            .reply(200, {
                data: [
                    {
                        provider: 'local',
                        role: 'ADMIN',
                        _id: widgetTwo.userId,
                        email: 'bar@vizzuality.com',
                        createdAt: '2016-08-02T09:34:51.979Z',
                        extraUserData: {
                            apps: [
                                'rw'
                            ]
                        },
                        name: 'Bar Foo',
                        photo: ''
                    }
                ]
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
        responseWidgetOne.attributes.user.should.be.an('object');
        responseWidgetOne.attributes.user.name.should.be.a('string').and.equal('Foo Bar');
        responseWidgetOne.attributes.user.email.should.be.a('string').and.equal('foo@vizzuality.com');

        responseWidgetTwo.attributes.name.should.equal(widgetTwo.name);
        responseWidgetTwo.attributes.dataset.should.equal(widgetTwo.dataset);
        responseWidgetTwo.attributes.userId.should.equal(widgetTwo.userId);
        responseWidgetTwo.attributes.slug.should.equal(widgetTwo.slug);
        responseWidgetTwo.attributes.sourceUrl.should.equal(widgetTwo.sourceUrl);
        responseWidgetTwo.attributes.queryUrl.should.equal(widgetTwo.queryUrl);
        responseWidgetTwo.attributes.user.should.be.an('object');
        responseWidgetTwo.attributes.user.name.should.be.a('string').and.equal('Bar Foo');
        responseWidgetTwo.attributes.user.email.should.be.a('string').and.equal('bar@vizzuality.com');
    });

    it('Get all widgets with includes=user should be successful and return a list of widgets with associated user name and email only for users that exist (populated db)', async () => {
        const widgetOne = await new Widget(createWidget()).save();
        const widgetTwo = await new Widget(createWidget()).save();

        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', {
                ids: [widgetOne.userId]
            })
            .reply(200, {
                data: [
                    {
                        provider: 'local',
                        role: 'ADMIN',
                        _id: widgetOne.userId,
                        email: 'foo@vizzuality.com',
                        createdAt: '2016-08-02T09:34:51.979Z',
                        extraUserData: {
                            apps: [
                                'rw'
                            ]
                        },
                        name: 'Foo Bar',
                        photo: ''
                    }
                ]
            });


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
        responseWidgetOne.attributes.user.should.be.an('object');
        responseWidgetOne.attributes.user.name.should.be.a('string').and.equal('Foo Bar');
        responseWidgetOne.attributes.user.email.should.be.a('string').and.equal('foo@vizzuality.com');

        responseWidgetTwo.attributes.name.should.equal(widgetTwo.name);
        responseWidgetTwo.attributes.dataset.should.equal(widgetTwo.dataset);
        responseWidgetTwo.attributes.userId.should.equal(widgetTwo.userId);
        responseWidgetTwo.attributes.slug.should.equal(widgetTwo.slug);
        responseWidgetTwo.attributes.sourceUrl.should.equal(widgetTwo.sourceUrl);
        responseWidgetTwo.attributes.queryUrl.should.equal(widgetTwo.queryUrl);
        responseWidgetTwo.attributes.should.not.have.property('user');
    });

    it('Get all widgets should return widgets owned by user', async () => {
        Widget.remove({}).exec();
        const widgetOne = await new Widget(createWidget(undefined, 'xxx')).save();
        const widgetTwo = await new Widget(createWidget()).save();

        const response = await requester.get(`/api/v1/widget?userId=xxx`);

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);
        response.body.should.have.property('links').and.be.an('object');

        const responseWidgetOne = response.body.data[0];
        widgetOne.name.should.equal(responseWidgetOne.attributes.name);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        Widget.remove({}).exec();
    });
});
