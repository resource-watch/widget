const URL = require('url').URL;
const logger = require('logger');
const DatasetNotFound = require('errors/datasetNotFound.error');
const ctRegisterMicroservice = require('ct-register-microservice-node');

class DatasetService {
    static async checkDataset(ctx) {
        if (ctx.params.dataset || ctx.request.body.dataset) {
            const datasetId = ctx.params.dataset || ctx.request.body.dataset;
            logger.info(`[DatasetService] Validating presence of dataset with id: ${datasetId}`);

            try {
                const dataset = await ctRegisterMicroservice.requestToMicroservice({
                    uri: `/dataset/${datasetId}`,
                    method: 'GET',
                    json: true
                });

                return dataset;
            } catch (err) {
                logger.info(`[DatasetService] There was an error obtaining the dataset: ${err}`);
                throw err;
            }
        } else {
            // If no datasets are present, it has to be catched by the validator
            logger.info(`[DatasetService] No dataset provided in this context.`);
        }
    }
    
}


module.exports = DatasetService;
