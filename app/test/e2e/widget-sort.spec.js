const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const { createWidget } = require('./utils/helpers');

const { getTestServer } = require('./utils/test-server');

chai.should();

let requester;

let widgetOne;
let widgetTwo;
let widgetThree;


describe('Sort widgets tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        await Widget.deleteMany({}).exec();

        widgetOne = await new Widget(createWidget({ source: 'cartodb' })).save();
        widgetTwo = await new Widget(createWidget({ source: 'json' })).save();
        widgetThree = await new Widget(createWidget({ source: 'gee' })).save();

        requester = await getTestServer();
    });

    it('Sort widgets by non-existent field (implicit order)', async () => {
        const responseOne = await requester
            .get(`/api/v1/widget`)
            .query({ sort: 'potato' });

        const widgetsOne = responseOne.body.data;

        responseOne.status.should.equal(200);
        responseOne.body.should.have.property('data').with.lengthOf(3);
        responseOne.body.should.have.property('links').and.be.an('object');

        const widgetIds = widgetsOne.map(widget => widget.id);

        widgetIds.should.contain(widgetTwo._id);
        widgetIds.should.contain(widgetOne._id);
    });

    it('Sort widgets by source (implicit order)', async () => {
        const responseOne = await requester
            .get(`/api/v1/widget`)
            .query({ sort: 'source' });
        const widgetsOne = responseOne.body.data;

        responseOne.status.should.equal(200);
        responseOne.body.should.have.property('data').with.lengthOf(3);
        responseOne.body.should.have.property('links').and.be.an('object');

        const widgetIdsOne = widgetsOne.map(widget => widget.id);

        widgetIdsOne[0].should.equal(widgetOne._id);
        widgetIdsOne[1].should.equal(widgetThree._id);
        widgetIdsOne[2].should.equal(widgetTwo._id);
    });

    it('Sort widgets by source (explicit asc order)', async () => {
        const responseOne = await requester
            .get(`/api/v1/widget`)
            .query({ sort: '+source' });

        const widgetsOne = responseOne.body.data;

        responseOne.status.should.equal(200);
        responseOne.body.should.have.property('data').with.lengthOf(3);
        responseOne.body.should.have.property('links').and.be.an('object');

        const widgetIdsOne = widgetsOne.map(widget => widget.id);

        widgetIdsOne[0].should.equal(widgetOne._id);
        widgetIdsOne[1].should.equal(widgetThree._id);
        widgetIdsOne[2].should.equal(widgetTwo._id);
    });

    it('Sort widgets by source (explicit desc order)', async () => {
        const responseOne = await requester
            .get(`/api/v1/widget`)
            .query({ sort: '-source' });

        const widgetsOne = responseOne.body.data;

        responseOne.status.should.equal(200);
        responseOne.body.should.have.property('data').with.lengthOf(3);
        responseOne.body.should.have.property('links').and.be.an('object');

        const widgetIdsOne = widgetsOne.map(widget => widget.id);

        widgetIdsOne[0].should.equal(widgetTwo._id);
        widgetIdsOne[1].should.equal(widgetThree._id);
        widgetIdsOne[2].should.equal(widgetOne._id);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(async () => {
        await Widget.deleteMany({}).exec();
    });
});
