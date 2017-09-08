class WidgetSerializer {
    static serializeElement(el) {
        return {
            id: el._id,
            type: 'widget',
            attributes: {
                name: el.name,
                dataset: el.dataset,
                slug: el.slug,
                userId: el.userId,
                description: el.description,
                source: el.source,
                sourceUrl: el.sourceUrl,
                authors: el.authors,
                application: el.application,
                verified: el.verified,
                default: el.default,
                defaultEditableWidget: el.defaultEditableWidget,
                published: el.published,
                env: el.env,
                queryUrl: el.queryUrl,
                widgetConfig: el.widgetConfig,
                template: el.template,
                layerId: el.layerId,
                createdAt: el.createdAt,
                updatedAt: el.updatedAt,
                vocabulary: el.vocabulary
            }
        };
    }

    static serialize(data, link = null) {
        const result = {};
        if (data) {
            if (data.docs) {
                result.data = data.docs.map(el => WidgetSerializer.serializeElement(el));
            } else {
                if (Array.isArray(data)) {
                    result.data = data.map(el => WidgetSerializer.serializeElement(el));
                    // result.data = WidgetSerializer.serializeElement(data[0]);
                } else {
                    result.data = WidgetSerializer.serializeElement(data);
                }
            }
        }
        if (link) {
            result.links = {
                self: `${link}page[number]=${data.page}&page[size]=${data.limit}`,
                first: `${link}page[number]=1&page[size]=${data.limit}`,
                last: `${link}page[number]=${data.pages}&page[size]=${data.limit}`,
                prev: `${link}page[number]=${data.page - 1 > 0 ? data.page - 1 : data.page}&page[size]=${data.limit}`,
                next: `${link}page[number]=${data.page + 1 < data.pages ? data.page + 1 : data.pages}&page[size]=${data.limit}`
            };
        }
        return result;
    }

}

module.exports = WidgetSerializer;
