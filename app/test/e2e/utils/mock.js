const nock = require('nock');
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

const createMockGetMetadata = (mockMetadata, datasetID) => nock(process.env.CT_URL)
    .post(`/v1/dataset/${datasetID}/widget/metadata/find-by-ids`)
    .reply(200, {
        data: mockMetadata,
    });

const createMockVocabulary = (mockVocabulary, datasetID, widgetID) => nock(process.env.CT_URL)
    .get(`/v1/dataset/${datasetID}/widget/${widgetID}/vocabulary`)
    .reply(200, {
        data: mockVocabulary,
    });

const createMockUser = mockUser => nock(process.env.CT_URL)
    .post(`/auth/user/find-by-ids`, JSON.stringify({ ids: mockUser.map(e => e.id).sort() }))
    .reply(200, { data: mockUser })
    .log(console.log);

module.exports = {
    createMockDataset,
    createMockDatasetNotFound,
    createMockDeleteMetadata,
    createMockUser,
    createMockGetMetadata,
    createMockVocabulary,
    createMockUserRole
};
