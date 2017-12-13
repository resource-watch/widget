const URL = require('url').URL;
const logger = require('logger');
const Widget = require('models/widget.model');
const DatasetService = require('services/dataset.service');
const WidgetNotFound = require('errors/widgetNotFound.error');
const DuplicatedWidget = require('errors/duplicatedWidget.error');
const WidgetProtected = require('errors/widgetProtected.error');
const GraphService = require('services/graph.service');
const RelationshipsService = require('services/relationships.service');
const ctRegisterMicroservice = require('ct-register-microservice-node');
const slug = require('slug');

class WidgetService {

    static async getSlug(name) {
        let valid = false;
        let slugTemp = null;
        let i = 0;
        while (!valid) {
            slugTemp = slug(name);
            if (i > 0) {
                slugTemp += `_${i}`;
            }
            const currentDataset = await Widget.findOne({
                slug: slugTemp
            }).exec();
            if (!currentDataset) {
                return slugTemp;
            }
            i++;
        }
    }

    static async update(id, widget, user) {
        logger.debug(`[WidgetService]: Updating widget with id:  ${id}`);
        const currentWidget = await Widget.findById(id).exec() || await Widget.findOne({
            slug: id
        }).exec();
        logger.debug('Obtaining dataset');
        const dataset = await DatasetService.checkDataset({ params: { dataset: currentWidget.dataset } });

        logger.debug(`[WidgetService]: Widget:  ${currentWidget}`);
        if (!currentWidget) {
            logger.error(`[WidgetService]: Widget with id ${id} doesn't exist`);
            throw new WidgetNotFound(`Widget with id '${id}' doesn't exist`);
        }

        currentWidget.name = widget.name || currentWidget.name;
        currentWidget.description = widget.description || currentWidget.description;
        //currentWidget.userId		 = user.id		|| currentWidget.userId;
        currentWidget.usedId = currentWidget.userId;
        // ^discuss
        currentWidget.source = widget.source || currentWidget.source;
        currentWidget.sourceUrl = widget.sourceUrl || currentWidget.sourceUrl;
        currentWidget.application = widget.application || currentWidget.application;
        currentWidget.layerId = widget.layerId || currentWidget.layerId;
        currentWidget.authors = widget.authors || currentWidget.authors;
        currentWidget.queryUrl = widget.queryUrl || currentWidget.queryUrl;
        currentWidget.widgetConfig = widget.widgetConfig || currentWidget.widgetConfig;
        if (widget.protected === false || widget.protected === true) {
            currentWidget.protected = widget.protected;
        }
        // Those == null wrapped in parens are totally on purpose: undefined is being coerced
        if (!(widget.template == null)) {
            currentWidget.template = widget.template;
        }
        if (!(widget.verified == null)) {
            currentWidget.verified = widget.verified;
        }
        if (!(widget.default == null)) {
            currentWidget.default = widget.default;
        }
        if (!(widget.defaultEditableWidget == null)) {
            currentWidget.defaultEditableWidget = widget.defaultEditableWidget;
        }
        if (!(widget.published == null)) {
            currentWidget.published = widget.published;
        }

        let newWidget = await currentWidget.save();
        logger.debug(`[WidgetService]: Widget:  ${newWidget}`);
        return newWidget;
    }

    static async create(widget, datasetId, dataset, user) {
        logger.debug(`[WidgetService]: Creating widget with name: ${widget.name}`);
        const tempSlug = await WidgetService.getSlug(widget.name);
        

        const newWidget = await new Widget({
            name: widget.name,
            dataset: datasetId || widget.dataset,
            userId: user.id,
            slug: tempSlug,
            description: widget.description,
            source: widget.source,
            sourceUrl: widget.sourceUrl,
            application: widget.application,
            verified: widget.verified,
            default: widget.default,
            defaultEditableWidget: widget.defaultEditableWidget,
            published: widget.published,
            protected: widget.protected,
            authors: widget.authors,
            queryUrl: widget.queryUrl,
            env: dataset.env,
            widgetConfig: widget.widgetConfig,
            template: widget.template,
            layerId: widget.layerId
        }).save();

        logger.debug('[WidgetService]: Creating in graph');
        try {
            await GraphService.createWidget(datasetId || widget.dataset, newWidget._id);
        } catch (err) {
            logger.error('Error creating widget in graph. Removing widget');
            await newWidget.remove();
            throw new Error(err);
        }
        return newWidget;
    }


    static async updateEnvironment(dataset, env) {
        logger.debug('Updating widgets with dataset', dataset);
        await Widget.update({ dataset }, { $set: { env } }, { multi: true });
    }

    static async get(id, dataset, includes = []) {
        logger.debug(`[WidgetService]: Getting widget with id: ${id}`);
        logger.info(`[DBACCES-FIND]: ID: ${id}`);
        let widget = await Widget.findById(id).exec();
        logger.info(`[DBACCES-FIND]: Widget: ${widget}`);
        if (widget) {
            if (dataset && dataset !== widget.dataset) {
                throw new WidgetNotFound(`Widget not found with the id ${id} for the dataset ${dataset}`);
            } else {
                if (includes && includes.length > 0) {
                    logger.debug('Finding relationships');
                    let widgets = await RelationshipsService.getRelationships([widget], includes);
                    return widgets[0];
                }
                return widget;
            }
        } else {
            throw new WidgetNotFound(`Widget not found with the id ${id}`);
        }
    }

    static async delete(id, dataset) {
        logger.debug(`[WidgetService]: Deleting widget with id: ${id}`);
        logger.info(`[DBACCES-FIND]: ID: ${id}`);
        const widget = await Widget.findById(id).exec();
        if (!widget) {
            logger.error(`[WidgetService]: Widget not found with the id ${id}`);
            throw new WidgetNotFound(`Widget not found with the id ${id}`);
        }
        if (widget.protected) {
            logger.error(`[WidgetService]: Widget with id ${id} is protected`);
            throw new WidgetProtected(`Widget is protected`);
        }
        logger.debug('[WidgetService]: Deleting in graph');
        try {
            await GraphService.deleteWidget(id);
        } catch (err) {
            logger.error('Error removing dataset of the graph', err);
        }
        logger.info(`[DBACCES-DELETE]: ID: ${id}`);
        try {
            await WidgetService.deleteMedadata(id, widget._id);
        } catch (err) {
            logger.error('Error removing metadata of the widget', err);
        }
        return widget.remove();
    }

    static async deleteByDataset(id) {
        logger.debug(`[WidgetService]: Deleting widgets of dataset with id: ${id}`);
        logger.info(`[DBACCES-FIND]: ID: ${id}`);
        const widgets = await Widget.find({
            dataset: id
        }).exec();
        for (let i = 0, length = widgets.length; i < length; i++) {
            const widget = widgets[i];
            logger.debug('[WidgetService]: Deleting in graph');
            try {
                await GraphService.deleteWidget(id);
            } catch (err) {
                logger.error('Error removing dataset of the graph', err);
            }
            logger.info(`[DBACCES-DELETE]: ID: ${id}`);
            await widget.remove();
            try {
                await WidgetService.deleteMedadata(id, widget._id);
            } catch (err) {
                logger.error('Error removing metadata of the widget', err);
            }

        }
    }

    static async deleteMedadata(datasetId, widgetId) {
        logger.debug('Removing metadata of the layer');
        await ctRegisterMicroservice.requestToMicroservice({
            uri: `/dataset/${datasetId}/widget/${widgetId}/metadata`,
            method: 'DELETE'
        });
    }

    static async getAll(query = {}, dataset = null) {
        logger.info(`[DBACCES-FIND]: all widgets`);
        const sort = query.sort || '';
        const page = query['page[number]'] ? parseInt(query['page[number]'], 10) : 1;
        logger.debug(`pageNumber param: ${page}`);
        const limit = query['page[size]'] ? parseInt(query['page[size]'], 10) : 10;
        logger.debug(`pageSize param: ${limit}`);
        const ids = query['ids'] ? query['ids'].split(',').map(el => el.trim()) : [];
        const includes = query.includes ? query.includes.split(',').map(elem => elem.trim()) : [];
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
        if (includes.length > 0) {
            logger.debug('Finding relationships');
            pages.docs = await RelationshipsService.getRelationships(pages.docs, includes);
        }
        return pages;
    }

    static getFilteredQuery(query, ids = []) {
        if (!query.application && query.app) {
            query.application = query.app;
        }
        if (!query.env) {
            query.env = 'production';
        }

        const widgetAttributes = Object.keys(Widget.schema.obj);
        logger.debug(`[getFilteredQuery] widgetAttributes: ${widgetAttributes}`);
        Object.keys(query).forEach((param) => {
            if (widgetAttributes.indexOf(param) < 0) {
                delete query[param];
            } else if (param !== 'env') {
                switch (Widget.schema.paths[param].instance) {
                    case 'String':
                        query[param] = {
                            $regex: query[param],
                            $options: 'i'
                        };
                        break;
                    case 'Array':
                        if (query[param].indexOf('@') >= 0) {
                            query[param] = {
                                $all: query[param].split('@').map(elem => elem.trim())
                            };
                        } else {
                            query[param] = {
                                $in: query[param].split(',').map(elem => elem.trim())
                            };
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
            } else if (param === 'env') {
                query.env = {
                    $in: query[param].split(',')
                };
            }

            if (ids.length > 0) {
                query._id = {
                    $in: ids
                };
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

    static getFilter(filter) {
        const finalFilter = {};
        if (filter && filter.application) {
            finalFilter.application = {
                $in: filter.application.split(',')
            };
        }
        return finalFilter;
    }

    static async getByDataset(resource) {
        logger.debug(`[WidgetService] Getting widgets for datasets with ids ${resource.ids}`);
        if (resource.app) {
            if (resource.app.indexOf('@') >= 0) {
                resource.app = {
                    $all: resource.app.split('@').map(elem => elem.trim())
                };
            } else {
                resource.app = {
                    $in: resource.app.split(',').map(elem => elem.trim())
                };
            }
        }
        const query = {
            dataset: {
                $in: resource.ids
            }
        };
        if (resource.app) {
            query.application = resource.app;
        }
        logger.debug(`[WidgetService] IDs query: ${JSON.stringify(query)}`);
        return await Widget.find(query).exec();
    }

    static async hasPermission(id, user) {
        let permission = true;
        const widget = await WidgetService.get(id, null, []);
        const appPermission = widget.application.find(widgetApp =>
            user.extraUserData.apps.find(app => app === widgetApp)
        );
        if (!appPermission) {
            permission = false;
        }
        if ((user.role === 'MANAGER') && (!widget.userId || widget.userId !== user.id)) {
            permission = false;
        }
        return permission;
    }
}

module.exports = WidgetService;
