## 09/06/2021

- Add support for hosts from `x-rw-domain` header when generating pagination links.

## 31/05/2021

- Update `rw-api-microservice-node` to add CORS support.

## 26/05/2021

- Fix regression where creating a widget would now require a `widgetConfig` value.

## 21/05/2021

- Add support for hosts from `referer` header when generating pagination links.

## 11/03/2021

- Fix regression where calls to PATCH `/widget/:widget` would not properly load the dataset.

## 22/02/2021

- Update `rw-api-microservice-node` to fix issue with Fastly headers.

## 14/01/2021

- Replace CT integration library

# v1.1.5

## 17/11/2020

- Fix issue where updating widgets string fields with empty strings as values would be ignored.  
- Fix issue where `widgetConfig` could be set to non-object values.

# v1.1.4

## 13/07/2020

- Security updates to the `handlebars` and `websocket-extensions` NPM packages.
- Fix issue in sorting logic.
- Minor refactor of widget screenshot functionality to prevent parallel writes to the database.

# v1.1.3

## 08/04/2020

- Update k8s configuration with node affinity.

# v1.1.2

## 20/03/2020

- Remove `usersRole` query param which generated huge pagination links.

# v1.1.1

## 28/02/2020

- Improve handling of collection filter for get widgets endpoint

# v1.1.0

## 27/01/2020

- Add possibility of sorting widgets by user fields (such as name or role).

# v1.0.0

## 14/01/2020

- Maintenance tasks and update service dependencies to more recent versions.

# Previous

- Add support for dataset overwrite using multiple files in parallel.
- Update node version to 12.
- Replace npm with yarn.
- Add liveliness and readiness probes.
- Add resource quota definition for kubernetes.
