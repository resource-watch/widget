const logger = require('logger');
const Widget = require('models/widget.model');
const DatasetService = require('services/dataset.service');
const WidgetNotFound = require('errors/widgetNotFound.error');
const WidgetProtected = require('errors/widgetProtected.error');
const GraphService = require('services/graph.service');
const ScreenshotService = require('services/screenshot.service');
const RelationshipsService = require('services/relationships.service');
const { RWAPIMicroservice } = require('rw-api-microservice-node');
const slug = require('slug');
const isUndefined = require('lodash/isUndefined');

class WidgetService {

    static async getSlug(name) {
        const valid = false;
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

        return null;
    }

    static async update(id, widget) {
        logger.debug(`[WidgetService]: Updating widget with id:  ${id}`);
        const currentWidget = await Widget.findById(id).exec() || await Widget.findOne({
            slug: id
        }).exec();
        logger.debug('Obtaining dataset');
        await DatasetService.checkDataset({ params: { dataset: currentWidget.dataset } });

        logger.debug(`[WidgetService]: Widget:  ${currentWidget}`);
        if (!currentWidget) {
            logger.info(`[WidgetService]: Widget with id ${id} doesn't exist`);
            throw new WidgetNotFound(`Widget with id '${id}' doesn't exist`);
        }

        currentWidget.name = widget.name || currentWidget.name;
        currentWidget.description = isUndefined(widget.description) ? currentWidget.description : widget.description;

        // currentWidget.userId = user.id || currentWidget.userId;
        currentWidget.usedId = currentWidget.userId;
        // ^discuss
        currentWidget.source = isUndefined(widget.source) ? currentWidget.source : widget.source;
        currentWidget.sourceUrl = widget.sourceUrl || currentWidget.sourceUrl;
        currentWidget.application = widget.application || currentWidget.application;
        currentWidget.layerId = widget.layerId || currentWidget.layerId;
        currentWidget.authors = isUndefined(widget.authors) ? currentWidget.authors : widget.authors;
        currentWidget.queryUrl = isUndefined(widget.queryUrl) ? currentWidget.queryUrl : widget.queryUrl;
        currentWidget.thumbnailUrl = widget.thumbnailUrl || currentWidget.thumbnailUrl;
        currentWidget.widgetConfig = widget.widgetConfig || currentWidget.widgetConfig;
        currentWidget.env = widget.env || currentWidget.env;
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
        if (!(widget.freeze == null)) {
            currentWidget.freeze = widget.freeze;
        }

        currentWidget.updatedAt = new Date();

        const newWidget = await currentWidget.save();
        logger.debug(`[WidgetService]: Widget:  ${newWidget}`);

        WidgetService.generateThumbnail(newWidget.id);

        return newWidget;
    }

    static async create(widget, datasetId, dataset, userId) {
        logger.debug(`[WidgetService]: Creating widget with name: ${widget.name}`);
        const tempSlug = await WidgetService.getSlug(widget.name);

        const newWidget = await new Widget({
            name: widget.name,
            dataset: datasetId || widget.dataset,
            userId,
            slug: tempSlug,
            description: widget.description,
            source: widget.source,
            sourceUrl: widget.sourceUrl,
            application: widget.application,
            verified: widget.verified,
            default: widget.default,
            defaultEditableWidget: widget.defaultEditableWidget,
            published: widget.published,
            freeze: widget.freeze,
            protected: widget.protected,
            authors: widget.authors,
            queryUrl: widget.queryUrl,
            thumbnailUrl: widget.thumbnailUrl,
            env: widget.env,
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

        WidgetService.generateThumbnail(newWidget.id);

        return newWidget;
    }

    static async clone(id, widget, userId) {
        logger.debug(`[WidgetService]: Getting widget with id: ${id}`);
        logger.debug(`[WidgetService]: New user id: ${userId}`);
        logger.info(`[DBACCESS-FIND]: widget.id: ${id}`);
        const currentWidget = await Widget.findById(id).exec() || await Widget.findOne({
            slug: id
        }).exec();
        if (!currentWidget) {
            logger.info(`[WidgetService]: Widget with id ${id} doesn't exist`);
            throw new WidgetNotFound(`Widget with id '${id}' doesn't exist`);
        }
        const newWidget = {};
        newWidget.name = widget.name || `${currentWidget.name} - ${new Date().getTime()}`;
        newWidget.description = widget.description || currentWidget.description;
        newWidget.dataset = currentWidget.dataset;
        newWidget.userId = userId;
        newWidget.source = currentWidget.source;
        newWidget.sourceUrl = currentWidget.sourceUrl;
        newWidget.application = currentWidget.application;
        newWidget.verified = currentWidget.verified;
        newWidget.default = currentWidget.default;
        newWidget.defaultEditableWidget = currentWidget.defaultEditableWidget;
        newWidget.published = currentWidget.published;
        newWidget.freeze = currentWidget.freeze;
        newWidget.protected = currentWidget.protected;
        newWidget.authors = currentWidget.authors;
        newWidget.queryUrl = currentWidget.queryUrl;
        newWidget.env = currentWidget.env;
        newWidget.widgetConfig = currentWidget.widgetConfig;
        newWidget.template = currentWidget.template;
        newWidget.layerId = currentWidget.layerId;

        const createdWidget = await WidgetService.create(newWidget, currentWidget.dataset, null, userId);

        WidgetService.generateThumbnail(createdWidget.id);

        return createdWidget;
    }

    static async generateThumbnail(id) {
        logger.debug('[WidgetService]: Creating thumbnail');
        let thumbURL = '';
        try {
            const widgetThumbnail = await ScreenshotService.takeWidgetScreenshot(id);
            thumbURL = widgetThumbnail.data.widgetThumbnail;
        } catch (err) {
            logger.error(`Error generating widget thumbnail: ${err.message}`);
        }

        try {
            const widget = await Widget.findById(id).exec();
            widget.thumbnailUrl = thumbURL;
            widget.save();
        } catch (err) {
            logger.error(`Error updating widget after thumbnail generation: ${err.message}`);
        }
    }


    static async updateEnvironment(dataset, env) {
        logger.debug('Updating widgets with dataset', dataset);
        const widgets = await Widget.find({
            dataset
        }).exec();
        await Widget.updateMany({ dataset }, { $set: { env } }, { multi: true });
        return widgets;
    }

    static async get(id, dataset, includes = [], user = null) {
        logger.debug(`[WidgetService]: Getting widget with id: ${id}`);
        logger.info(`[DBACCESS-FIND]: ID: ${id}`);
        const widget = await Widget.findById(id).exec();
        logger.info(`[DBACCESS-FIND]: Widget: ${widget}`);
        if (widget) {
            if (dataset && dataset !== widget.dataset) {
                throw new WidgetNotFound(`Widget not found with the id ${id} for the dataset ${dataset}`);
            } else {
                if (includes && includes.length > 0) {
                    logger.debug('Finding relationships');
                    const widgets = await RelationshipsService.getRelationships([widget], includes, user);
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
        logger.info(`[DBACCESS-FIND]: ID: ${id}`);
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
        logger.info(`[DBACCESS-DELETE]: ID: ${id}`);
        try {
            await WidgetService.deleteMetadata(dataset || widget.dataset, widget._id);
        } catch (err) {
            logger.error('Error removing metadata of the widget', err);
        }
        await widget.remove();
        return widget;
    }

    static async deleteByDataset(id) {
        logger.debug(`[WidgetService]: Deleting widgets of dataset with id: ${id}`);
        logger.info(`[DBACCESS-FIND]: ID: ${id}`);
        const widgets = await Widget.find({
            dataset: id
        }).exec();
        for (let i = 0, { length } = widgets; i < length; i++) {
            const widget = widgets[i];
            logger.debug('[WidgetService]: Deleting in graph');
            try {
                await GraphService.deleteWidget(id);
            } catch (err) {
                logger.error('Error removing dataset of the graph', err);
            }
            logger.info(`[DBACCESS-DELETE]: ID: ${id}`);
            await widget.remove();
            try {
                await WidgetService.deleteMetadata(id, widget._id);
            } catch (err) {
                logger.error('Error removing metadata of the widget', err);
            }

        }
        return widgets;
    }

    static async deleteByUserId(userId) {
        logger.debug(`[WidgetService]: Delete widgets for user with id:  ${userId}`);

        const userWidgets = await WidgetService.getAll({ userId, env: 'all' });
        const protectedWidgets = { docs: userWidgets.docs.filter(widget => widget.protected) };

        if (userWidgets.docs) {
            userWidgets.docs = await Promise.all(userWidgets.docs.filter(widget => !widget.protected).map(async (widget) => {
                const currentWidgetId = widget._id;
                const currentWidgetDatasetId = widget.dataset;
                logger.info(`[DBACCESS-DELETE]: widget.id: ${currentWidgetId}`);
                await widget.remove();
                logger.debug('[WidgetService]: Deleting in graph');
                try {
                    await GraphService.deleteWidget(currentWidgetId);
                } catch (err) {
                    logger.error('Error removing widget of the graph', err);
                }
                try {
                    await WidgetService.deleteMetadata(currentWidgetDatasetId, currentWidgetId);
                } catch (err) {
                    logger.error('Error removing metadata of the widget', err);
                }
                return widget;
            }));
        }
        return {
            deletedWidgets: userWidgets,
            protectedWidgets: protectedWidgets.docs.length > 0 ? protectedWidgets : null
        };
    }

    static async deleteMetadata(datasetId, widgetId) {
        logger.debug('Removing metadata of the widget');
        await RWAPIMicroservice.requestToMicroservice({
            uri: `/v1/dataset/${datasetId}/widget/${widgetId}/metadata`,
            method: 'DELETE'
        });
    }

    static async getAll(query = {}, dataset = null, user) {
        logger.info(`[DBACCESS-FIND]: all widgets`);
        const sort = query.sort || '';
        const page = query['page[number]'] ? parseInt(query['page[number]'], 10) : 1;
        logger.debug(`pageNumber param: ${page}`);
        const limit = query['page[size]'] ? parseInt(query['page[size]'], 10) : 10;
        logger.debug(`pageSize param: ${limit}`);
        const ids = query.ids ? query.ids.split(',').map(el => el.trim()) : [];
        const includes = query.includes ? query.includes.split(',').map(elem => elem.trim()) : [];
        logger.debug(`ids param: ${ids}`);
        if (dataset) {
            query.dataset = dataset;
            logger.debug(`[WidgetService] Dataset for filtering is ${dataset})`);
        }

        const filteredQuery = WidgetService.getFilteredQuery({ ...query }, ids);
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
        pages = { ...pages };
        if (includes.length > 0) {
            logger.debug('Finding relationships');
            pages.docs = await RelationshipsService.getRelationships(pages.docs, includes, user, query);
        }
        return pages;
    }

    static getFilteredQuery(query, ids = []) {
        const { collection, favourite } = query;
        if (!query.application && query.app) {
            query.application = query.app;
            if (favourite) {
                delete query.application;
            }
        }
        if (!query.env) { // default value
            query.env = 'production';
        }
        // if (!query.published) { // default value
        //     query.published = true;
        // }

        const widgetAttributes = Object.keys(Widget.schema.obj);
        logger.debug(`[getFilteredQuery] widgetAttributes: ${widgetAttributes}`);
        Object.keys(query).forEach((param) => {
            if (widgetAttributes.indexOf(param) < 0 && param !== 'usersRole') {
                delete query[param];
            } else if (!['env', 'usersRole'].includes(param)) {
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
            } else if (param === 'usersRole') {
                logger.debug('Params users roles');
                query.userId = Object.assign({}, query.userId || {}, {
                    $in: query[param]
                });
                delete query.usersRole;
            } else if (param === 'env') {
                if (query[param] === 'all') {
                    logger.debug('Applying all environments filter');
                    delete query.env;
                } else {
                    query.env = {
                        $in: query[param].split(',')
                    };
                }
            }
        });
        if (ids.length > 0 || collection || favourite) {
            query._id = {
                $in: ids
            };
        }
        return query;
    }

    static async getAllWidgetsUserIds() {
        logger.debug(`[WidgetService]: Getting the user ids of all widgets`);
        const widgets = await Widget.find({}, 'userId').lean();
        const userIds = widgets.map(w => w.userId);
        return userIds.filter((item, idx) => userIds.indexOf(item) === idx && item !== 'legacy');
    }

    static processSortParam(sort) {
        return sort.replace(/user.role/g, 'userRole,_id').replace(/user.name/g, 'userName,_id');
    }

    static getFilteredSort(sort) {
        const sortParams = WidgetService.processSortParam(sort).split(',');
        const filteredSort = {};
        const widgetAttributes = Object.keys(Widget.schema.obj);
        sortParams.forEach((param) => {
            let sign = param.substr(0, 1);
            let signlessParam = param.substr(1);
            if (sign !== '-' && sign !== '+') {
                signlessParam = param;
                sign = '+';
            }
            if (widgetAttributes.indexOf(signlessParam) >= 0) {
                filteredSort[signlessParam] = parseInt(sign + 1, 10);
            }
        });
        return filteredSort;
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

        if (resource.env) {
            query.env = resource.env;
        }

        if (resource.app) {
            query.application = resource.app;
        }
        logger.debug(`[WidgetService] IDs query: ${JSON.stringify(query)}`);
        return Widget.find(query).exec();
    }

    static async hasPermission(id, user) {
        let permission = true;
        const widget = await WidgetService.get(id, null, []);
        const appPermission = widget.application.find(widgetApp => user.extraUserData.apps.find(app => app === widgetApp));
        if (!appPermission) {
            permission = false;
        }
        if ((user.role === 'MANAGER' || user.role === 'USER') && (!widget.userId || widget.userId !== user.id)) {
            permission = false;
        }
        return permission;
    }

}

module.exports = WidgetService;
