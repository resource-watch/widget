const nock = require('nock');
const intersection = require('lodash/intersection');
const { DEFAULT_DATASET_ATTRIBUTES } = require('./test.constants');

const createMockDataset = datasetID => nock(process.env.CT_URL)
    .get(`/v1/dataset/${datasetID}`)
    .reply(200, {
        data: {
            id: datasetID,
            type: 'dataset',
            attributes: DEFAULT_DATASET_ATTRIBUTES
        }
    });

const createMockUserRole = (role, userID) => nock(process.env.CT_URL)
    .get(`/auth/user/ids/${role}`)
    .reply(200, { data: [userID] });

const createMockDatasetNotFound = datasetID => nock(process.env.CT_URL)
    .get(`/v1/dataset/${datasetID}`)
    .reply(404, {
        error: 'Dataset not found'
    });

const createMockDeleteMetadata = (datasetID, widgetID) => nock(process.env.CT_URL)
    .delete(`/v1/dataset/${datasetID}/widget/${widgetID}/metadata`)
    .reply(200, {
        data: [],
    });

const createMockGetMetadata = (mockMetadata, datasetID, anotherData = {}) => nock(process.env.CT_URL)
    .post(`/v1/dataset/${datasetID}/widget/metadata/find-by-ids`)
    .reply(200, {
        data: { ...mockMetadata, ...anotherData },
    });

const createMockVocabulary = (mockVocabulary, datasetID, widgetID, anotherData = {}) => nock(process.env.CT_URL)
    .get(`/v1/dataset/${datasetID}/widget/${widgetID}/vocabulary`)
    .reply(200, {
        data: { ...mockVocabulary, ...anotherData },
    });

const createMockUser = users => nock(process.env.CT_URL)
    .post(
        `/auth/user/find-by-ids`,
        body => intersection(body.ids, users.map(e => e.id.toString())).length === body.ids.length
    )
    .query(() => true)
    .reply(200, { data: users });

module.exports = {
    createMockDataset,
    createMockDatasetNotFound,
    createMockDeleteMetadata,
    createMockUser,
    createMockGetMetadata,
    createMockVocabulary,
    createMockUserRole
};
