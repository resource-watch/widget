const URL    = require('url').URL;
const logger = require('logger');
const http   = require('http');
const rp     = require('request-promise');


const DatasetNotFound = require('errors/datasetNotFound.error');

class DatasetService {

    static async checkDataset (url) {
	logger.info(`[DatasetService] Checking dataset in url: ${url} }`);
    }
    
}

module.exports = DatasetService;
