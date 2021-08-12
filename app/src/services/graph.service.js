class GraphService {

    static async createWidget() {
        // logger.debug('[GraphService]: Creating dataset in graph');
        // try {
        //     return await RWAPIMicroservice.requestToMicroservice({
        //         uri: `/v1/graph/widget/${idDataset}/${id}`,
        //         method: 'POST',
        //         json: true
        //     });
        // } catch (e) {
        //     throw new Error(e);
        // }
    }

    static async deleteWidget() {
        // logger.debug('[GraphService]: Deleting widget in graph');
        // try {
        //     return await RWAPIMicroservice.requestToMicroservice({
        //         uri: `/v1/graph/widget/${id}`,
        //         method: 'DELETE',
        //         json: true
        //     });
        // } catch (e) {
        //     throw new Error(e);
        // }
    }

    static async associateTags() {
        // logger.debug('[GraphService]: Associating tags in graph');
        // try {
        //     let tags = [];
        //     Object.keys(vocabularies).map((key) => {
        //         tags = tags.concat(vocabularies[key].tags);
        //         return null;
        //     });
        //     return await RWAPIMicroservice.requestToMicroservice({
        //         uri: `/v1/graph/widget/${id}/associate`,
        //         method: 'POST',
        //         json: true,
        //         body: {
        //             tags
        //         }
        //     });
        // } catch (e) {
        //     logger.error(e);
        //     throw new Error(e);
        // }
    }

}

module.exports = GraphService;
