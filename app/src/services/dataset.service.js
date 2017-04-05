const URL = require('url').URL;
const logger = require('logger');
const http = require('http');

const DatasetNotFound = require('errors/datasetNotFound.error');

class DatasetService {

    static async checkDataset (url) {
	logger.info(`[DatasetService] Checking dataset in url: ${url} }`);
	const datasetRequest = http.request() // Preguntar Raul
	};

	return true;
    }
    
}

module.exports = DatasetService;
