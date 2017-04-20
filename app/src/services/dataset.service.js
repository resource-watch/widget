const URL    = require('url').URL;
const logger = require('logger');
const http   = require('http');
const rp     = require('request-promise');
const DatasetNotFound = require('errors/datasetNotFound.error');

class DatasetService {
    static async checkDataset(ctx) {
	if (ctx.params.dataset || ctx.request.body.dataset) {
	    const datasetId = ctx.params.dataset || ctx.request.body.dataset;
	    logger.info(`[DatasetService] Validating presence of dataset with id: ${datasetId}`);
	    const apiVersion = ctx.mountPath.split('/')[ctx.mountPath.split('/').length - 1];
	    const datasetUrl = `${ctx.request.protocol}://${ctx.request.host}/${apiVersion}/dataset/${datasetId}`;
	    const options = {  
		method: 'GET',
		uri: datasetUrl,
		json: true,
		resolveWithFullResponse: true
	    };
	    try {
		rp(options)
		    .then(function(response) {
			logger.info(`[DatasetService] Response status code: ${response.StatusCode}`);
		    })
		    .catch(function (err) {
			logger.info(`[DatasetService] Error: ${err}`);
			throw new DatasetNotFound(`Dataset with id ${datasetId} not found`);
		    });
	    } catch(err) {
		if (err instanceof DatasetNotFound) {
		    logger.info(`AHA`);
		}
	    }
	} else {
	    // If no datasets are present, it has to be catched by the validator
	    logger.info(`[DatasetService] No dataset provided in the context`);
	}
    }
}


module.exports = DatasetService;
