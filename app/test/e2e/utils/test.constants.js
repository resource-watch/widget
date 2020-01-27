const WIDGET_CONFIG = {
    legends: [
        {
            properties: {
                symbols: {
                    y: {
                        scale: 'legend-series-y'
                    },
                    x: {
                        scale: 'legend-series-x'
                    }
                },
                labels: {
                    y: {
                        scale: 'legend-series-y'
                    },
                    x: {
                        offset: 10,
                        scale: 'legend-series-x'
                    },
                    text: {
                        template: '{{datum.data|truncate:8}}'
                    }
                },
                legend: {
                    y: {
                        offset: 0,
                        mult: 1.1,
                        field: {
                            group: 'height'
                        }
                    },
                    x: {
                        offset: 5,
                        mult: 0.05,
                        field: {
                            group: 'width'
                        }
                    }
                }
            },
            fill: 'color'
        }
    ],
    marks: [
        {
            properties: {
                enter: {
                    stroke: {
                        value: '#eee'
                    },
                    strokeWidth: {
                        value: 1
                    },
                    fill: {
                        field: 'risk',
                        scale: 'color'
                    },
                    y2: {
                        scale: 'y',
                        field: 'val_e'
                    },
                    y: {
                        scale: 'y',
                        field: 'val_s'
                    },
                    x2: {
                        scale: 'x',
                        field: 't_e'
                    },
                    x: {
                        scale: 'x',
                        field: 't_s'
                    }
                }
            },
            type: 'rect',
            from: {
                data: 'stats_risk'
            },
            name: 'columns'
        }
    ],
    axes: [
        {
            orient: 'top',
            scale: 'x',
            type: 'x'
        },
        {
            properties: {
                labels: {
                    text: {
                        scale: 'x_label'
                    },
                    align: {
                        value: 'center'
                    },
                    font: {
                        value: '"Roboto"'
                    }
                },
                ticks: {
                    strokeOpacity: {
                        value: 1
                    },
                    stroke: {
                        value: '#EEEEEE'
                    }
                }
            },
            formatType: 'string',
            values: [
                6,
                32,
                51,
                75
            ],
            grid: false,
            layer: 'front',
            ticks: 4,
            scale: 'xl',
            type: 'x'
        },
        {
            properties: {
                labels: {
                    align: {
                        value: 'left'
                    },
                    baseline: {
                        value: 'bottom'
                    }
                }
            },
            scale: 'y',
            type: 'y'
        }
    ],
    scales: [
        {
            range: 'width',
            domain: {
                fields: [
                    {
                        field: 't_e',
                        data: 'stats_risk'
                    }
                ]
            },
            type: 'linear',
            name: 'x'
        },
        {
            range: 'width',
            domain: {
                fields: [
                    {
                        field: 'counts_e',
                        data: 'legend_crop'
                    }
                ]
            },
            type: 'linear',
            name: 'xl'
        },
        {
            range: {
                fields: [
                    {
                        field: 'crop',
                        data: 'legend_crop'
                    }
                ]
            },
            domain: {
                fields: [
                    {
                        field: 'counts_r',
                        data: 'legend_crop'
                    }
                ]
            },
            points: false,
            type: 'ordinal',
            name: 'x_label'
        },
        {
            domain: {
                fields: [
                    {
                        field: 'val_e',
                        data: 'stats_risk'
                    }
                ]
            },
            range: 'height',
            type: 'linear',
            name: 'y'
        },
        {
            domain: {
                field: 'risk',
                data: 'legend_risk'
            },
            range: 'riskColor',
            type: 'ordinal',
            name: 'color'
        },
        {
            range: 'positionx',
            domain: {
                field: 'risk',
                data: 'legend_risk'
            },
            type: 'ordinal',
            name: 'legend-series-x'
        },
        {
            range: 'positiony',
            domain: {
                field: 'risk',
                data: 'legend_risk'
            },
            type: 'ordinal',
            name: 'legend-series-y'
        }
    ],
    data: [
        {
            format: {
                property: 'rows',
                type: 'json'
            },
            url: 'http://wri-01.carto.com/api/v2/sql?q=with f as (SELECT crops.*, {{water_column}} FROM crops inner join aqueduct_projections_20150309 ri on ri.basinid=crops.basinid), t as (select sum(area) as area, {{water_column}} as risk, crop from f group by {{water_column}}, crop ), r as (SELECT sum(value) as value, commodity FROM combined01_prepared where year=\'{{year}}\' and impactparameter=\'Food Demand\' group by commodity), d as ( select (value*100/(sum(value) over())) as value, commodity from r ) select crop, risk,value, (area*100/sum(area) over(partition by crop)) area_perc from d inner join t on lower(commodity)=crop order by risk desc, crop asc',
            name: 'hist'
        },
        {
            transform: [
                {
                    output: {
                        mid: 'val_m',
                        end: 'val_e',
                        start: 'val_s'
                    },
                    offset: 'zero',
                    field: 'area_perc',
                    groupby: [
                        'crop'
                    ],
                    type: 'stack'
                },
                {
                    output: {
                        mid: 't_m',
                        end: 't_e',
                        start: 't_s'
                    },
                    offset: 'zero',
                    field: 'value',
                    groupby: [
                        'risk'
                    ],
                    type: 'stack'
                }
            ],
            source: 'hist',
            name: 'stats_risk'
        },
        {
            transform: [
                {
                    summarize: [
                        {
                            as: [
                                'counts_r'
                            ],
                            ops: [
                                'min'
                            ],
                            field: 't_m'
                        },
                        {
                            as: [
                                'counts_e'
                            ],
                            ops: [
                                'min'
                            ],
                            field: 't_e'
                        }
                    ],
                    groupby: [
                        'crop'
                    ],
                    type: 'aggregate'
                }
            ],
            source: 'stats_risk',
            name: 'legend_crop'
        },
        {
            transform: [
                {
                    summarize: [
                        {
                            as: [
                                'counts_c'
                            ],
                            ops: [
                                'count'
                            ],
                            field: 'risk'
                        }
                    ],
                    groupby: [
                        'risk'
                    ],
                    type: 'aggregate'
                }
            ],
            source: 'hist',
            name: 'legend_risk'
        }
    ]
};

const SINGLE_WIDGET_CONFIG = {
    data: {
        format: {
            property: 'rows',
            type: 'json'
        },
        url: 'http://wri-01.carto.com/api/v2/sql?q=with f as (SELECT crops.*, {{water_column}} FROM crops inner join aqueduct_projections_20150309 ri on ri.basinid=crops.basinid), t as (select sum(area) as area, {{water_column}} as risk, crop from f group by {{water_column}}, crop ), r as (SELECT sum(value) as value, commodity FROM combined01_prepared where year=\'{{year}}\' and impactparameter=\'Food Demand\' group by commodity), d as ( select (value*100/(sum(value) over())) as value, commodity from r ) select crop, risk,value, (area*100/sum(area) over(partition by crop)) area_perc from d inner join t on lower(commodity)=crop order by risk desc, crop asc',
        name: 'hist'
    },
};

const DEFAULT_DATASET_ATTRIBUTES = {
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
    connectorUrl: 'https://wri-01.carto.com/tables/rw_projections_20150309/public',
    tableName: 'rw_projections_20150309',
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
};

const USERS = {
    USER: {
        id: '1a10d7c6e0a37126611fd7a6',
        role: 'USER',
        provider: 'local',
        name: 'test user',
        email: 'user@control-tower.org',
        extraUserData: {
            apps: [
                'rw',
                'gfw',
                'gfw-climate',
                'prep',
                'aqueduct',
                'forest-atlas',
                'data4sdgs'
            ]
        }
    },
    MANAGER: {
        id: '1a10d7c6e0a37126611fd7a5',
        role: 'MANAGER',
        provider: 'local',
        name: 'test manager',
        email: 'user@control-tower.org',
        extraUserData: {
            apps: [
                'rw',
                'gfw',
                'gfw-climate',
                'prep',
                'aqueduct',
                'forest-atlas',
                'data4sdgs'
            ]
        }
    },
    ADMIN: {
        id: '1a10d7c6e0a37126611fd7a7',
        role: 'ADMIN',
        provider: 'local',
        name: 'test admin',
        email: 'user@control-tower.org',
        extraUserData: {
            apps: [
                'rw',
                'gfw',
                'gfw-climate',
                'prep',
                'aqueduct',
                'forest-atlas',
                'data4sdgs'
            ]
        }
    },
    SUPERADMIN: {
        id: '1a10d7c6e0a37126601fd7a7',
        role: 'SUPERADMIN',
        provider: 'local',
        name: 'test super admin',
        email: 'user@control-tower.org',
        extraUserData: {
            apps: [
                'rw',
                'gfw',
                'gfw-climate',
                'prep',
                'aqueduct',
                'forest-atlas',
                'data4sdgs'
            ]
        }
    },
    WRONG_ADMIN: {
        id: '1a10d7c6e0a37126611fd7a7',
        role: 'ADMIN',
        provider: 'local',
        email: 'user@control-tower.org',
        extraUserData: {
            apps: [
                'test'
            ]
        }
    },
    MICROSERVICE: {
        id: 'microservice',
        createdAt: '2016-09-14'
    }
};

module.exports = {
    USERS,
    WIDGET_CONFIG,
    DEFAULT_DATASET_ATTRIBUTES,
    SINGLE_WIDGET_CONFIG,
};
