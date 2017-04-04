const URL = require('url').URL;
const logger = require('logger');
const Widget = require('models/widget.model');
const WidgetNotFound = require('errors/widgetNotFound.error');
const DuplicatedWidget = require('errors/duplicatedWidget.error');
const slug = require('slug');

class WidgetService {

    static getSlug(name) {
        return slug(name);
    }

    static async update(id, widget, user) {
	logger.debug(`[WidgetService]: Updating widget with id:  ${id}`);
        const currentWidget = await Widget.findById(id).exec() || await Widget.findOne({ slug: id }).exec();
	logger.debug(`[WidgetService]: Widget:  ${currentWidget}`);
	if (!currentWidget) {
            logger.error(`[WidgetService]: Widget with id ${id} doesn't exist`);
            throw new WidgetNotFound(`Widget with id '${id}' doesn't exist`);
        }

	currentWidget.name = widget.name || currentWidget.name;
	currentWidget.description = widget.description || currentWidget.description;
	currentWidget.userId = user.id || currentWidget.userId;
	currentWidget.description = widget.description || currentWidget.description;
	currentWidget.source = widget.source || currentWidget.source;
	currentWidget.sourceUrl = widget.sourceUrl || currentWidget.sourceUrl;
	currentWidget.application = widget.application || currentWidget.application;
	currentWidget.verified = widget.verified || currentWidget.verified;
	currentWidget.default = widget.default || currentWidget.default;
	currentWidget.published = widget.published || currentWidget.published;
	let newWidget = await currentWidget.save();
	logger.debug(`[WidgetService]: Widget:  ${newWidget}`);	
	return newWidget;
    }

    static async create(widget, dataset, user) {
        logger.debug(`[WidgetService]: Creating widget with name: ${widget.name}`);
	const tempSlug = WidgetService.getSlug(widget.name);
        const currentWidget = await Widget.findOne({
            slug: tempSlug
        }).exec();
	if (currentWidget) {
	    logger.error(`[WidgetService]: Widget with name ${widget.name} generates an existing slug: ${tempSlug}`);
	    throw new DuplicatedWidget(`Slug already existing: ${tempSlug}`);
	}
	
        const newWidget = await new Widget({
            name: widget.name,
	    dataset: dataset || widget.dataset,
	    userId: user.id,
	    slug: tempSlug,
	    description: widget.description,
	    source: widget.source,
	    sourceUrl: widget.sourceUrl,
	    application: widget.application,
	    verified: widget.verified,
	    default: widget.default,
	    published: widget.published,
	    authors: widget.authors,
	    queryUrl: widget.queryUrl,
	    widgetConfig: widget.widgetConfig,
	    template: widget.template,
	    layer: widget.layer
        }).save();
        return newWidget;
    }

    static async get(id, dataset = null) {
	logger.debug(`[WidgetService]: Getting widget with id: ${id}`);
	logger.info(`[DBACCES-FIND]: ID: ${id}`);
	const widget = await Widget.findById(id).exec();
	logger.info(`[DBACCES-FIND]: ID: ${widget}`);
	if (dataset !== widget.dataset) {
	    logger.error(`[WidgetService]: Widget not found with the id ${id}`);
	    throw new WidgetNotFound(`Widget not found with the id ${id} for the dataset ${dataset}`);
	} else {
	    return widget;
	}
	// if (!dataset) {
	//     logger.debug(`No dataset provided. Finding by id.`);
	//     const widget = await Widget.findById(id).exec();
	//     logger.debug(`Widget is: ${widget}`);
	// } else {
	//     logger.debug(`Dataset is ${dataset}`);
	//     const widget = await Widget.find({id: id, dataset: dataset}).exec();
	// }
	// if (typeof widget !== 'undefined') {
	//     return widget;
	// } else {
	//     logger.error(`[WidgetService]: Widget not found with the id ${id}`);
	//     throw new WidgetNotFound(`Widget not found with the id ${id}`);
	// }
    }

    static async delete(id) {
	logger.debug(`[WidgetService]: Deleting widget with id: ${id}`);
	logger.info(`[DBACCES-FIND]: ID: ${id}`);
	const widget = await Widget.findById(id).exec();
	if (!widget) {
	    logger.error(`[WidgetService]: Widget not found with the id ${id}`);
	    throw new WidgetNotFound(`Widget not found with the id ${id}`);
	}
	logger.info(`[DBACCES-DELETE]: ID: ${id}`);
	return await widget.remove();
    }

    static async getAll(query = {}, dataset = null) {
	logger.info(`[DBACCES-FIND]: all widgets`);
	const sort = query.sort || '';
	const page = query['page[number]'] ? parseInt(query['page[number]'], 10) : 1;
	logger.debug(`pageNumber param: ${page}`);
	const limit = query['page[size]'] ? parseInt(query['page[size]'], 10) : 10;
	logger.debug(`pageSize param: ${limit}`);
	const ids = query['ids'] ? query['ids'].split(',').map(el => el.trim()): [];
	logger.debug(`ids param: ${ids}`);
	if (dataset) {
	    query.dataset = dataset;
	    logger.debug(`[WidgetService] Dataset for filtering is ${dataset})`);
	}
	
	const filteredQuery = WidgetService.getFilteredQuery(Object.assign({}, query), ids);
	logger.debug(`filteredQuery: ${JSON.stringify(filteredQuery)}`);
	const filteredSort = WidgetService.getFilteredSort(sort);
	const options = {
	    page,
            limit,
            sort: filteredSort
        };
	logger.debug(`[WidgetService] Query options: ${JSON.stringify(options)}`);
	logger.info(`[DBACCESS-FIND]: widget`);
	let pages = await Widget.paginate(filteredQuery, options);
	pages = Object.assign({}, pages);
	return pages;
    }

    static getFilteredQuery(query, ids = []) {
	if (!query.application && query.app) {
            query.application = query.app;
        }
	
        const widgetAttributes = Object.keys(Widget.schema.obj);
	logger.debug(`[getFilteredQuery] widgetAttributes: ${widgetAttributes}`);
	Object.keys(query).forEach((param) => {
            if (widgetAttributes.indexOf(param) < 0) {
                delete query[param];
            } else {
                switch (Widget.schema.paths[param].instance) {
                case 'String':
                    query[param] = { $regex: query[param], $options: 'i' };
                    break;
                case 'Array':
                    if (query[param].indexOf('@') >= 0) {
                        query[param] = { $all: query[param].split('@').map(elem => elem.trim()) };
                    } else {
                        query[param] = { $in: query[param].split(',').map(elem => elem.trim()) };
                    }
                    break;
                case 'Object':
                    query[param] = query[param];
                    break;
                case 'Date':
                    query[param] = query[param];
                    break;
                default:
                    query[param] = query[param];
                }
            }
            if (ids.length > 0) {
                query._id = { $in: ids };
            }
        });
        return query;
    }

    static getFilteredSort(sort) {
        const sortParams = sort.split(',');
        const filteredSort = {};
        const widgetAttributes = Object.keys(Widget.schema.obj);
        sortParams.forEach((param) => {
            let sign = param.substr(0, 1);
            let realParam = param.substr(1);
            if (sign !== '-') {
                sign = '+';
                realParam = param;
            }
            if (widgetAttributes.indexOf(realParam) >= 0) {
                filteredSort[realParam] = parseInt(sign + 1, 10);
            }
        });
        return filteredSort;
    }

}

module.exports = WidgetService;
