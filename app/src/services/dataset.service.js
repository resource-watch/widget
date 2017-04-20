const URL    = require('url').URL;
const logger = require('logger');
const http   = require('http');
const rp     = require('request-promise');
const DatasetNotFound = require('errors/datasetNotFound.error');

class DatasetService {

    static async checkDataset (url) {
	logger.info(`[DatasetService] Checking dataset in url: ${url} }`);
	var options = {
	    uri: url,
	    headers: {
		'User-Agent': 'Request-Promise'
	    },
	    json: true
	};
	rp(options)
	    .then(function (dataset) {
		return true;
	    })
	    .catch(function (err) {
		logger.debug(`Error!: ${err}`);
		throw new DatasetNotFound(`Dataset not found`);
                return false;
	    });
    }
    
}

module.exports = DatasetService;
