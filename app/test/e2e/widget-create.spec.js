/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
const Widget = require('models/widget.model');
const { ROLES } = require('./test.constants');

const { getTestServer } = require('./test-server');

const should = chai.should();

let requester;

describe('Create widgets tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        Widget.remove({}).exec();
    });

    it('Create a widget as an anonymous user should fail with a 401 error code', async () => {
        nock(`${process.env.CT_URL}/v1`)
            .get('/dataset/39f5dc1f-5e45-41d8-bcd5-96941c8a7e79')
            .reply(200, {
                data: {
                    id: '39f5dc1f-5e45-41d8-bcd5-96941c8a7e79',
                    type: 'dataset',
                    attributes: {
                        name: 'Seasonal variability',
                        slug: 'Seasonal-variability',
                        type: null,
                        subtitle: null,
                        application: [
                            'rw'
                        ],
                        dataPath: null,
                        attributesPath: null,
                        connectorType: 'rest',
                        provider: 'cartodb',
                        userId: '1a10d7c6e0a37126611fd7a7',
                        connectorUrl: 'https://wri-01.carto.com/tables/aqueduct_projections_20150309/public',
                        tableName: 'aqueduct_projections_20150309',
                        status: 'pending',
                        published: true,
                        overwrite: false,
                        verified: false,
                        blockchain: {},
                        mainDateField: null,
                        env: 'production',
                        geoInfo: false,
                        protected: false,
                        legend: {
                            date: [],
                            region: [],
                            country: [],
                            nested: []
                        },
                        clonedHost: {},
                        errorMessage: null,
                        taskId: null,
                        updatedAt: '2018-11-19T11:45:44.405Z',
                        dataLastUpdated: null,
                        widgetRelevantProps: [],
                        layerRelevantProps: []
                    }
                }
            });

        const widget = {
            name: 'Widget default',
            queryUrl: 'query/5be16fea-5b1a-4daf-a9e9-9dc1f6ea6d4e?sql=select * from crops',
            application: [
                'aqueduct'
            ],
            description: '',
            source: '',
            sourceUrl: 'http://foo.bar',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig: {
                data: [
                    {
                        name: 'hist',
                        url: 'http://wri-01.carto.com/api/v2/sql?q=with f as (SELECT crops.*, {{water_column}} FROM crops inner join aqueduct_projections_20150309 ri on ri.basinid=crops.basinid), t as (select sum(area) as area, {{water_column}} as risk, crop from f group by {{water_column}}, crop ), r as (SELECT sum(value) as value, commodity FROM combined01_prepared where year=\'{{year}}\' and impactparameter=\'Food Demand\' group by commodity), d as ( select (value*100/(sum(value) over())) as value, commodity from r ) select crop, risk,value, (area*100/sum(area) over(partition by crop)) area_perc from d inner join t on lower(commodity)=crop order by risk desc, crop asc',
                        format: {
                            type: 'json',
                            property: 'rows'
                        }
                    },
                    {
                        name: 'stats_risk',
                        source: 'hist',
                        transform: [
                            {
                                type: 'stack',
                                groupby: [
                                    'crop'
                                ],
                                field: 'area_perc',
                                offset: 'zero',
                                output: {
                                    start: 'val_s',
                                    end: 'val_e',
                                    mid: 'val_m'
                                }
                            },
                            {
                                type: 'stack',
                                groupby: [
                                    'risk'
                                ],
                                field: 'value',
                                offset: 'zero',
                                output: {
                                    start: 't_s',
                                    end: 't_e',
                                    mid: 't_m'
                                }
                            }
                        ]
                    },
                    {
                        name: 'legend_crop',
                        source: 'stats_risk',
                        transform: [
                            {
                                type: 'aggregate',
                                groupby: [
                                    'crop'
                                ],
                                summarize: [
                                    {
                                        field: 't_m',
                                        ops: [
                                            'min'
                                        ],
                                        as: [
                                            'counts_r'
                                        ]
                                    },
                                    {
                                        field: 't_e',
                                        ops: [
                                            'min'
                                        ],
                                        as: [
                                            'counts_e'
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        name: 'legend_risk',
                        source: 'hist',
                        transform: [
                            {
                                type: 'aggregate',
                                groupby: [
                                    'risk'
                                ],
                                summarize: [
                                    {
                                        field: 'risk',
                                        ops: [
                                            'count'
                                        ],
                                        as: [
                                            'counts_c'
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ],
                scales: [
                    {
                        name: 'x',
                        type: 'linear',
                        domain: {
                            fields: [
                                {
                                    data: 'stats_risk',
                                    field: 't_e'
                                }
                            ]
                        },
                        range: 'width'
                    },
                    {
                        name: 'xl',
                        type: 'linear',
                        domain: {
                            fields: [
                                {
                                    data: 'legend_crop',
                                    field: 'counts_e'
                                }
                            ]
                        },
                        range: 'width'
                    },
                    {
                        name: 'x_label',
                        type: 'ordinal',
                        points: false,
                        domain: {
                            fields: [
                                {
                                    data: 'legend_crop',
                                    field: 'counts_r'
                                }
                            ]
                        },
                        range: {
                            fields: [
                                {
                                    data: 'legend_crop',
                                    field: 'crop'
                                }
                            ]
                        }
                    },
                    {
                        name: 'y',
                        type: 'linear',
                        range: 'height',
                        domain: {
                            fields: [
                                {
                                    data: 'stats_risk',
                                    field: 'val_e'
                                }
                            ]
                        }
                    },
                    {
                        name: 'color',
                        type: 'ordinal',
                        range: 'riskColor',
                        domain: {
                            data: 'legend_risk',
                            field: 'risk'
                        }
                    },
                    {
                        name: 'legend-series-x',
                        type: 'ordinal',
                        domain: {
                            data: 'legend_risk',
                            field: 'risk'
                        },
                        range: 'positionx'
                    },
                    {
                        name: 'legend-series-y',
                        type: 'ordinal',
                        domain: {
                            data: 'legend_risk',
                            field: 'risk'
                        },
                        range: 'positiony'
                    }
                ],
                axes: [
                    {
                        type: 'x',
                        scale: 'x',
                        orient: 'top'
                    },
                    {
                        type: 'x',
                        scale: 'xl',
                        ticks: 4,
                        layer: 'front',
                        grid: false,
                        values: [
                            6,
                            32,
                            51,
                            75
                        ],
                        formatType: 'string',
                        properties: {
                            ticks: {
                                stroke: {
                                    value: '#EEEEEE'
                                },
                                strokeOpacity: {
                                    value: 1
                                }
                            },
                            labels: {
                                font: {
                                    value: '"Roboto"'
                                },
                                align: {
                                    value: 'center'
                                },
                                text: {
                                    scale: 'x_label'
                                }
                            }
                        }
                    },
                    {
                        type: 'y',
                        scale: 'y',
                        properties: {
                            labels: {
                                baseline: {
                                    value: 'bottom'
                                },
                                align: {
                                    value: 'left'
                                }
                            }
                        }
                    }
                ],
                marks: [
                    {
                        name: 'columns',
                        from: {
                            data: 'stats_risk'
                        },
                        type: 'rect',
                        properties: {
                            enter: {
                                x: {
                                    field: 't_s',
                                    scale: 'x'
                                },
                                x2: {
                                    field: 't_e',
                                    scale: 'x'
                                },
                                y: {
                                    field: 'val_s',
                                    scale: 'y'
                                },
                                y2: {
                                    field: 'val_e',
                                    scale: 'y'
                                },
                                fill: {
                                    scale: 'color',
                                    field: 'risk'
                                },
                                strokeWidth: {
                                    value: 1
                                },
                                stroke: {
                                    value: '#eee'
                                }
                            }
                        }
                    }
                ],
                legends: [
                    {
                        fill: 'color',
                        properties: {
                            legend: {
                                x: {
                                    field: {
                                        group: 'width'
                                    },
                                    mult: 0.05,
                                    offset: 5
                                },
                                y: {
                                    field: {
                                        group: 'height'
                                    },
                                    mult: 1.1,
                                    offset: 0
                                }
                            },
                            labels: {
                                text: {
                                    template: '{{datum.data|truncate:8}}'
                                },
                                x: {
                                    scale: 'legend-series-x',
                                    offset: 10
                                },
                                y: {
                                    scale: 'legend-series-y'
                                }
                            },
                            symbols: {
                                x: {
                                    scale: 'legend-series-x'
                                },
                                y: {
                                    scale: 'legend-series-y'
                                }
                            }
                        }
                    }
                ]
            }
        };
        const response = await requester
            .post(`/api/v1/widget`)
            .send({
                dataset: '39f5dc1f-5e45-41d8-bcd5-96941c8a7e79',
                widget
            });

        response.status.should.equal(401);
    });

    it('Create a widget as an admin should be successful', async () => {
        nock(`${process.env.CT_URL}/v1`)
            .get('/dataset/39f5dc1f-5e45-41d8-bcd5-96941c8a7e79')
            .reply(200, {
                data: {
                    id: '39f5dc1f-5e45-41d8-bcd5-96941c8a7e79',
                    type: 'dataset',
                    attributes: {
                        name: 'Seasonal variability',
                        slug: 'Seasonal-variability',
                        type: null,
                        subtitle: null,
                        application: [
                            'rw'
                        ],
                        dataPath: null,
                        attributesPath: null,
                        connectorType: 'rest',
                        provider: 'cartodb',
                        userId: '1a10d7c6e0a37126611fd7a7',
                        connectorUrl: 'https://wri-01.carto.com/tables/aqueduct_projections_20150309/public',
                        tableName: 'aqueduct_projections_20150309',
                        status: 'pending',
                        published: true,
                        overwrite: false,
                        verified: false,
                        blockchain: {},
                        mainDateField: null,
                        env: 'production',
                        geoInfo: false,
                        protected: false,
                        legend: {
                            date: [],
                            region: [],
                            country: [],
                            nested: []
                        },
                        clonedHost: {},
                        errorMessage: null,
                        taskId: null,
                        updatedAt: '2018-11-19T11:45:44.405Z',
                        dataLastUpdated: null,
                        widgetRelevantProps: [],
                        layerRelevantProps: []
                    }
                }
            });

        const widget = {
            name: 'Widget default',
            queryUrl: 'query/5be16fea-5b1a-4daf-a9e9-9dc1f6ea6d4e?sql=select * from crops',
            application: [
                'aqueduct'
            ],
            description: '',
            source: '',
            sourceUrl: 'http://foo.bar',
            authors: '',
            status: 1,
            default: true,
            published: true,
            widgetConfig: {
                data: [
                    {
                        name: 'hist',
                        url: 'http://wri-01.carto.com/api/v2/sql?q=with f as (SELECT crops.*, {{water_column}} FROM crops inner join aqueduct_projections_20150309 ri on ri.basinid=crops.basinid), t as (select sum(area) as area, {{water_column}} as risk, crop from f group by {{water_column}}, crop ), r as (SELECT sum(value) as value, commodity FROM combined01_prepared where year=\'{{year}}\' and impactparameter=\'Food Demand\' group by commodity), d as ( select (value*100/(sum(value) over())) as value, commodity from r ) select crop, risk,value, (area*100/sum(area) over(partition by crop)) area_perc from d inner join t on lower(commodity)=crop order by risk desc, crop asc',
                        format: {
                            type: 'json',
                            property: 'rows'
                        }
                    },
                    {
                        name: 'stats_risk',
                        source: 'hist',
                        transform: [
                            {
                                type: 'stack',
                                groupby: [
                                    'crop'
                                ],
                                field: 'area_perc',
                                offset: 'zero',
                                output: {
                                    start: 'val_s',
                                    end: 'val_e',
                                    mid: 'val_m'
                                }
                            },
                            {
                                type: 'stack',
                                groupby: [
                                    'risk'
                                ],
                                field: 'value',
                                offset: 'zero',
                                output: {
                                    start: 't_s',
                                    end: 't_e',
                                    mid: 't_m'
                                }
                            }
                        ]
                    },
                    {
                        name: 'legend_crop',
                        source: 'stats_risk',
                        transform: [
                            {
                                type: 'aggregate',
                                groupby: [
                                    'crop'
                                ],
                                summarize: [
                                    {
                                        field: 't_m',
                                        ops: [
                                            'min'
                                        ],
                                        as: [
                                            'counts_r'
                                        ]
                                    },
                                    {
                                        field: 't_e',
                                        ops: [
                                            'min'
                                        ],
                                        as: [
                                            'counts_e'
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        name: 'legend_risk',
                        source: 'hist',
                        transform: [
                            {
                                type: 'aggregate',
                                groupby: [
                                    'risk'
                                ],
                                summarize: [
                                    {
                                        field: 'risk',
                                        ops: [
                                            'count'
                                        ],
                                        as: [
                                            'counts_c'
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ],
                scales: [
                    {
                        name: 'x',
                        type: 'linear',
                        domain: {
                            fields: [
                                {
                                    data: 'stats_risk',
                                    field: 't_e'
                                }
                            ]
                        },
                        range: 'width'
                    },
                    {
                        name: 'xl',
                        type: 'linear',
                        domain: {
                            fields: [
                                {
                                    data: 'legend_crop',
                                    field: 'counts_e'
                                }
                            ]
                        },
                        range: 'width'
                    },
                    {
                        name: 'x_label',
                        type: 'ordinal',
                        points: false,
                        domain: {
                            fields: [
                                {
                                    data: 'legend_crop',
                                    field: 'counts_r'
                                }
                            ]
                        },
                        range: {
                            fields: [
                                {
                                    data: 'legend_crop',
                                    field: 'crop'
                                }
                            ]
                        }
                    },
                    {
                        name: 'y',
                        type: 'linear',
                        range: 'height',
                        domain: {
                            fields: [
                                {
                                    data: 'stats_risk',
                                    field: 'val_e'
                                }
                            ]
                        }
                    },
                    {
                        name: 'color',
                        type: 'ordinal',
                        range: 'riskColor',
                        domain: {
                            data: 'legend_risk',
                            field: 'risk'
                        }
                    },
                    {
                        name: 'legend-series-x',
                        type: 'ordinal',
                        domain: {
                            data: 'legend_risk',
                            field: 'risk'
                        },
                        range: 'positionx'
                    },
                    {
                        name: 'legend-series-y',
                        type: 'ordinal',
                        domain: {
                            data: 'legend_risk',
                            field: 'risk'
                        },
                        range: 'positiony'
                    }
                ],
                axes: [
                    {
                        type: 'x',
                        scale: 'x',
                        orient: 'top'
                    },
                    {
                        type: 'x',
                        scale: 'xl',
                        ticks: 4,
                        layer: 'front',
                        grid: false,
                        values: [
                            6,
                            32,
                            51,
                            75
                        ],
                        formatType: 'string',
                        properties: {
                            ticks: {
                                stroke: {
                                    value: '#EEEEEE'
                                },
                                strokeOpacity: {
                                    value: 1
                                }
                            },
                            labels: {
                                font: {
                                    value: '"Roboto"'
                                },
                                align: {
                                    value: 'center'
                                },
                                text: {
                                    scale: 'x_label'
                                }
                            }
                        }
                    },
                    {
                        type: 'y',
                        scale: 'y',
                        properties: {
                            labels: {
                                baseline: {
                                    value: 'bottom'
                                },
                                align: {
                                    value: 'left'
                                }
                            }
                        }
                    }
                ],
                marks: [
                    {
                        name: 'columns',
                        from: {
                            data: 'stats_risk'
                        },
                        type: 'rect',
                        properties: {
                            enter: {
                                x: {
                                    field: 't_s',
                                    scale: 'x'
                                },
                                x2: {
                                    field: 't_e',
                                    scale: 'x'
                                },
                                y: {
                                    field: 'val_s',
                                    scale: 'y'
                                },
                                y2: {
                                    field: 'val_e',
                                    scale: 'y'
                                },
                                fill: {
                                    scale: 'color',
                                    field: 'risk'
                                },
                                strokeWidth: {
                                    value: 1
                                },
                                stroke: {
                                    value: '#eee'
                                }
                            }
                        }
                    }
                ],
                legends: [
                    {
                        fill: 'color',
                        properties: {
                            legend: {
                                x: {
                                    field: {
                                        group: 'width'
                                    },
                                    mult: 0.05,
                                    offset: 5
                                },
                                y: {
                                    field: {
                                        group: 'height'
                                    },
                                    mult: 1.1,
                                    offset: 0
                                }
                            },
                            labels: {
                                text: {
                                    template: '{{datum.data|truncate:8}}'
                                },
                                x: {
                                    scale: 'legend-series-x',
                                    offset: 10
                                },
                                y: {
                                    scale: 'legend-series-y'
                                }
                            },
                            symbols: {
                                x: {
                                    scale: 'legend-series-x'
                                },
                                y: {
                                    scale: 'legend-series-y'
                                }
                            }
                        }
                    }
                ]
            }
        };
        const response = await requester
            .post(`/api/v1/widget`)
            .send({
                dataset: '39f5dc1f-5e45-41d8-bcd5-96941c8a7e79',
                widget,
                loggedUser: ROLES.ADMIN
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdWidget = response.body.data;

        createdWidget.attributes.name.should.equal(widget.name);
        createdWidget.attributes.description.should.equal(widget.description);
        createdWidget.attributes.dataset.should.equal('39f5dc1f-5e45-41d8-bcd5-96941c8a7e79');
        createdWidget.attributes.sourceUrl.should.equal(widget.sourceUrl);
        createdWidget.attributes.queryUrl.should.equal(widget.queryUrl);
        createdWidget.attributes.widgetConfig.should.deep.equal(widget.widgetConfig);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(() => {
        Widget.remove({}).exec();
    });
});
