# Digital Marketplace

The Digital Marketplace is a web application that administers British Columbia's Code With Us and Sprint With Us procurement programs. It enables (1) public sector employees to create and publish procurement opportunities, and (2) vendors to submit proposals to these opportunities.

This document describes this project's developer environment, technical architecture and deployment infrastructure.

## Table of Contents

<!-- toc -->

- [Authors and Licensing](#authors-and-licensing)
- [Project Organisation](#project-organisation)
  * [Front-End (`src/front-end`)](#front-end-srcfront-end)
  * [Back-End (`src/back-end`)](#back-end-srcback-end)
  * [Shared (`src/shared`)](#shared-srcshared)
  * [Database Migrations (`src/migrations`)](#database-migrations-srcmigrations)
- [Contributing](#contributing)
- [Development Environment](#development-environment)
  * [Dependencies](#dependencies)
  * [Quick Start](#quick-start)
  * [NPM Scripts](#npm-scripts)
  * [Environment Variables](#environment-variables)
- [Deployment](#deployment)
  * [Environments](#environments)
  * [Deployment Process](#deployment-process)
  * [Backups](#backups)
  * [High Availability Database Deployment](#high-availability-database-deployment)
- [Team](#team)
- [Credits](#credits)

<!-- tocstop -->

## Authors and Licensing

This project is designed, implemented and maintained by the team at Real Folk. If you are interested in adopting the Digital Markteplace, Code With Us and/or Sprint With Us for your government or organization, please reach out to us! Our team's intimate knowledge of the public sector and technology services procurement enables us to modify the Digital Marketplace to meet your needs and business processes.

**Dhruv Dang**, Managing Director  
[dhruv@realfolk.io](mailto:dhruv@realfolk.io)

This project available to use under the Apache 2.0 license (see `LICENSE.txt`).

## Project Organisation

The Digital Marketplace is a full-stack TypeScript web application that uses PostgreSQL for persistence.
It is written in a functional and declarative style with the goal of maximizing compile-time guarantees through type-safety.

![Digital Marketplace Architecture](https://github.com/bcgov/digital_marketplace/blob/development/docs/Digital%20Marketplace%20Architecture.svg)

The source code is split into five parts:

### Front-End (`src/front-end`)

A TypeScript single-page application using React, Immutable.js, Bootstrap and SASS.
The front-end's build system is executed by Grunt.

The front-end's state management framework (`src/front-end/lib/framework/**/*.tsx`) provides type-safe state management, and is heavily influenced by the [Elm Architecture](https://guide.elm-lang.org/architecture/). If you've used Redux before, you will find this to be very similar since Redux is also based on the Elm Architecture. The main difference is that this project's framework derives greater inspiration from the Elm Architecture and it aims to be far more type-safe than Redux.

![Digital Marketplace Front-End Architecture](https://github.com/bcgov/digital_marketplace/blob/development/docs/Front-End%20Architecture.svg)

### Back-End (`src/back-end`)

A TypeScript server that vends the front-end's build assets (`src/back-end/lib/routers/front-end.ts`) as well as a JSON CRUD API (`src/back-end/lib/resources/**/*.ts`) that performs business logic and persists data to a PostgreSQL database.

The server framework (`src/back-end/lib/server/index.ts`) provides type-safe abstractions for API development, and is executed by Express (`src/back-end/lib/server/adapters.ts`).

![Digital Marketplace Back-End Architecture](https://github.com/bcgov/digital_marketplace/blob/development/docs/Back-End%20Architecture.svg)

#### Authentication

The server uses OpenID Connect to authenticate users with a Keycloak server (managed by B.C. government employees). The authentication routes are implemented in `src/back-end/lib/routers/auth.ts`.

#### CRUD Resources

CRUD resources are created in a standardised, type-safe way in this project. CRUD abstractions are located in `src/back-end/lib/crud.ts`, and it is recommended to review this module prior to extending the API.

### Shared (`src/shared`)

The `src/shared` folder contains modules that expose types and functions that are used across the entire stack: front-end and back-end.

### Database Migrations (`src/migrations`)

All database migration logic is stored in the `src/migrations` folder. Migrations are managed and executed by the `knex` NPM module (a SQL ORM bundled with database migration functionality). The PostgreSQL-related environment variables described below are required to define the database to connect to.

You can create a migration using the following command:

```bash
npm run migrations:create -- <MIGRATION_NAME>
```

This command creates a migration file from a template and stores it at `src/migrations/tasks/{TIMESTAMP}_{MIGRATION_NAME}.ts`.

**DO NOT delete or change committed migration files. Creating and executing migrations is a stateful process, and, unless you know what you are doing, running a database migration should be viewed as an irreversible process.**

### Scripts (`src/scripts`)

General purpose scripts are stored in this folder. The scripts themselves are stored in the `src/scripts/bin/` folder, and can be run using the following command:

```
npm run scripts:run -- <SCRIPT_NAME> [...args]
```

## Contributing

Features should be implemented in feature branches. Create a pull request against the `development` branch to have your work reviewed for subsequent deployment.

The `development` branch contains all approved code.

The `master` branch contains work that has passed the Quality Assurance process and is ready to be deployed to production.

Hotfixes can be merged directly to `master` via a pull request, but should be merged back into the `development` branch as well.

## Development Environment

### Dependencies

If you are using NixOS or the Nix package manager, running `nix-shell` will install all necessary dependencies,
and drop you in a shell with them accessible in your `$PATH`.

If you are not using Nix, please ensure the following packages have been installed:

- Node.js 10.x
- SASS
- PostgreSQL 10.0.x
- Docker
- Docker Compose 3.x

Once installed, `cd` into this repository's root directory and proceed to install NPM dependencies:

```bash
npm install
```

### Quick Start

Once you have installed all necessary dependencies, create a `.env` file and replace the placeholder values with your credentials. Refer to the "Environment Variables" section below for further information.

```bash
cp sample.env .env
# Open and edit .env in your text editor.
```

Finally, open three terminals and run the following commands:

```bash
# Terminal 1
docker-compose up -d # Start a local PostgreSQL server in the background.
npm run migrations:latest # Run all database migrations.

# Terminal 2
npm run back-end:watch # Start the back-end server, restart on source changes.

# Terminal 3
npm run front-end:watch # Build the front-end source code, rebuild on source changes.
```

Then, visit the URL logged to your terminal to view the now locally-running web application.

You can stop (and wipe) the local PostgreSQL server by running `docker-compose down`.

### NPM Scripts

It is recommended that developers use the following scripts defined in `package.json` to operate this web application:

```bash
# Usage
npm run <SCRIPT_NAME>
```

| Script Name | Description |
|---|---|
| `start` | Runs the back-end server. |
| `front-end:lint` | Lints the front-end source code using tslint. |
| `front-end:typecheck` | Typechecks the front-end source code using tsc. |
| `front-end:test` | Runs unit tests for the front-end source code. |
| `front-end:build` | Builds the front-end using grunt. |
| `front-end:watch` | Builds the front-end using grunt, and rebuilds it whenever a front-end or shared source file changes. |
| `front-end:typedoc` | Builds TypeDoc API documentation for the front-end source code. |
| `back-end:lint` | Lints the back-end source code using tslint. |
| `back-end:typecheck` | Typechecks the back-end source code using tsc. |
| `back-end:test` | Runs unit tests for the back-end source code. |
| `back-end:start` | Starts the back-end server (assumes it has already been built by grunt). |
| `back-end:build` | Builds the back-end server using grunt. |
| `back-end:watch` | Builds and starts the back-end server inside a nodemon process, rebuilding and restarting it whenever a back-end or shared source file changes. |
| `back-end:typedoc` | Builds TypeDoc API documentation for the back-end source code. |
| `shared:typedoc` | Builds TypeDoc API documentation for the shared source code. |
| `migrations:helper` | A helper script to run various migration commands using `knex`. It is not recommended to use this directly, rather use the migration scripts described below. |
| `migrations:create -- <MIGRATION_NAME>` | Creates a migration file from a template in `src/migrations/tasks`. |
| `migrations:latest` | Runs all migrations forward using their exported `up` functions. |
| `migrations:rollback` | Rolls all migrations back using their exported `down` functions. |
| `migrations:up` | Runs one migration `up`. |
| `migrations:down` | Runs one migration `down`. |
| `scripts:run` | Runs a script. Usage: `npm run scripts:run -- <SCRIPT_NAME> [...args]`. Ensure the `--` is included to allow script arguments to be properly parsed. |
| `typedoc:build` | Builds all TypeDoc API documentation. |
| `typedoc:start` | Serves TypeDoc documentation on a local server. |
| `docs:readme-toc` | Generate and insert a table of contents for `README.md`. |
| `docs:licenses` | Generate the list of licenses from this project's NPM dependencies in `docs/OPEN_SOURCE_LICENSES.txt`. |
| `docs:db -- <POSTGRESQL_URL>` | Generate database schema documentation in `docs/DATABASE.md` from the database specified by the connection url. |

### Environment Variables

Developers can configure the following environment variables to alter how the web application is built and/or run.

In development, developers can create a `.env` file in the repository's root directory to configure environment variables.
As a convenience, developers can refer to `sample.env` as a guide.

#### Back-End Environment Variables

Environment variables that affect the back-end server's functionality are stored and sanitized in `src/back-end/config.ts`.

| Name | Description |
|---|---|
| `NODE_ENV` | The back-end run-time's environment. Possible values include either "development" or "production". |
| `SERVER_HOST` | The IPv4 address for the back-end to bind to. |
| `SERVER_PORT` | The TCP port for the back-end to bind to. |
| `SCHEDULED_DOWNTIME` | A boolean flag (`0` for `false`, `1` for `true`) to turn off CRUD endpoints and vend a downtime HTML page to all users when set to a non-zero number. |
| `BASIC_AUTH_USERNAME` | An HTTP basic auth username to limit access to the web application. |
| `BASIC_AUTH_PASSWORD_HASH` | A password hash to authenticate HTTP basic auth passwords to limit access to the web application. |
| `ORIGIN` | The root URL of the web app. This is used for authentication and generating URLs in email notifications. The value must include the protocol and any path prefixes. e.g. `https://digital.gov.bc.ca/marketplace`. |
| `CONTACT_EMAIL` | The Procurement Transformation team's contact email address. |
| `POSTGRES_URL` | The PostgreSQL database to connect to (you only need to use this variable in development, not the other `DATABASE_*` variables defined below). |
| `DATABASE_SERVICE_NAME` | Auto-generated in OpenShift. |
| `${DATABASE_SERVICE_NAME}_SERVICE_HOST` | The PostgreSQL host to connect to in OpenShift. |
| `${DATABASE_SERVICE_NAME}_SERVICE_PORT` | The PostgreSQL port to connect to in OpenShift. |
| `DATABASE_USERNAME` | The PostgreSQL user to connect with in OpenShift. |
| `DATABASE_PASSWORD` | The PostgreSQL password to connect with in OpenShift. |
| `DATABASE_NAME` | The PostgreSQL database name to connect to in OpenShift. |
| `COOKIE_SECRET` | The secret used to hash cookies. |
| `MAILER_HOST` | SMTP server host for transactional emails in production. |
| `MAILER_PORT` | SMTP server port for transactional emails in production. |
| `MAILER_GMAIL_USER` | A GMail SMTP username to test transactional emails in development. |
| `MAILER_GMAIL_PASS` | A GMail SMTP password to test transactional emails in development. |
| `MAILER_FROM` | The sender for transactional emails. |
| `MAILER_BATCH_SIZE` | The maximum number of email addresses to include in batch notification emails. Defaults to `50`. |
| `MAILER_MAX_CONNECTIONS` | The maximum number of simultaneous SMTP connections to use for the mailer. Defaults to `5`. |
| `KEYCLOAK_URL` | The URL of the Keycloak server to use for authentication. |
| `KEYCLOAK_REALM` | The Keycloak realm. Please contact a team member to retrieve this credential. |
| `KEYCLOAK_CLIENT_ID` | The Keycloak client ID. Please contact a team member to retrieve this credential. |
| `KEYCLOAK_CLIENT_SECRET` | The Keycloak client secret. Please contact a team member to retrieve this credential. |
| `KNEX_DEBUG` | Set this to `true` to debug `knex` operations. |
| `UPDATE_HOOK_THROTTLE` | The number of milliseconds used to throttle per-request jobs (e.g. automatically closing opportunities). Defaults to `60000`ms. |
| `TOTAL_AWARDED_COUNT_OFFSET` | The number of awarded opportunities prior to the launch of the Digital Marketplace. |
| `TOTAL_AWARDED_VALUE_OFFSET` | The CAD value of awarded opportunities prior to the launch of the Digital Marketplace. |
| `AVATAR_MAX_IMAGE_WIDTH` | The maximum image width for uploaded avatar image files. Files with a greater width will be resized. Defaults to 500 pixels. |
| `AVATAR_MAX_IMAGE_HEIGHT` | The maximum image height for uploaded avatar image files. Files with a greater height will be resized. Defaults to 500 pixels. |
| `FILE_STORAGE_DIR` | The location to store uploaded files. This is typically used by the server to temporarily store files uploaded by multipart requests for processing. |
| `SERVICE_TOKEN_HASH` | A hashed token used to control access to service API endpoints that are only enabled in development and test environments. Defining the variable will enable service endpoints that can be used to override user accounts and sessions. |
| `SWAGGER_UI_PATH` | The base path to run the Swagger UI under for serving of API documentation. Defaults to `/docs/api`. |

#### Front-End Environment Variables

Environment variables that affect the front-end's build process are stored and sanitized in `src/front-end/config.ts`, and referenced to in `gruntfile.js`.

| Name | Description |
|---|---|
| `NODE_ENV` | Determines whether the front-end is built for production (e.g. minification, compression, etc). Possible values include either "development" or "production". |
| `CONTACT_EMAIL` | The Digital Marketplace team's contact email address. |
| `PATH_PREFIX` | The URL path prefix that the Digital Marketplace is deployed to. For example, if deployed to `digital.gov.bc.ca/marketplace`, the value of this variable should be `marketplace`. |

## Deployment

This project is deployed to the Government of British Columbia's own OpenShift infrastructure.

### Environments

We have four environments:

| OpenShift Project | Name | URL |
|---|---|---|
| xzyxml-dev | Development | https://dig-mkt-app-dev.pathfinder.gov.bc.ca |
| xzyxml-test | Test | https://dig-mkt-app-test.pathfinder.gov.bc.ca |
| xzyxml-prod | Production | https://dig-mkt-app-prod.pathfinder.gov.bc.ca |

Each environment has its own database instance.

The Development and Test environments are secured behind HTTP Basic Auth. Please contact a team member to access these credentials.

### Deployment Process

The "xzyxml-tools" OpenShift project is used to trigger the deployment process for all environments.

To deploy to the Development environment, start a build for "dig-mkt-app-dev", and OpenShift will build and deploy HEAD from the `development` branch.

To deploy to the Production environment, start a build for "dig-mkt-app-prod", and OpenShift will build HEAD from the `master` branch. You will need to manually deploy the build once it completes by deploying the "dig-mkt-app-prod" deployment in the "xzyxml-prod" project.

#### Running Database Migrations

Using an environment's deployment shell, run `npm run migrations:latest` in the root of this repository's directory to run all migrations forward.

### Backups

Automated backups of the PostgreSQL database are performed with the BC Government Backup Container. Full documentation for this tool can be found here: https://github.com/BCDevOps/backup-container. The schedule for automated backups is as follows:

* Every 6 hours with a retention of 4 backups
* Every 24 hours with a retention of 1 backup (daily)
* Every week with a retention of 4 backups (weekly)
* Every month with a retention of 1 backup (monthly)

A manual backup can be immediately performed by connecting to the backup container pod in OpenShift and running `backup.sh -1`.

Backup archives are stored in the same OpenShift project as the Digital Marketplace application, on a separate provisioned volume.

#### Restoring from Backup

In the unfortunate event that you need to restore your data from a backup archive, the `backup.sh` script can  be used to restore from the last backup file. Refer to https://github.com/BCDevOps/backup-container#restore for details on how to use this script.

### High Availability Database Deployment

The Digital Marketplace is currently deployed to an OpenShift platform using a highly available PostgreSQL replicaset. The template used to deploy this replicaset is based on Patroni (https://patroni.readthedocs.io/en/latest/). A deployment configuration has been provided in `openshift/templates/patroni-deploy-config.json` for deployment in other OpenShift environments. 

Use the following command to run this deployment script using the OpenShift command line tools (first ensure that you have the correct OpenShift project selected using `oc project`):

```
oc process -f openshift/templates/patroni-deploy-config.json | oc create -f -
```

Deployment as a highly available replicaset is recommended, but not required. A standalone PostgreSQL database deployment configuration has also been provided in `openshift/templates/postgres-deploy-config.json` and can be run using the same OpenShift CLI command above.  

## Team

The Digital Marketplace is currently operated by the Procurement Services Branch within the Government of British Columbia's Ministry of Citizen's Services.

This project is designed, implemented and maintained by the team at Real Folk. If you are interested in adopting the Digital Markteplace, Code With Us and/or Sprint With Us for your government or organization, please reach out to us! Our team's intimate knowledge of the public sector and technology services procurement enables us to modify the Digital Marketplace to meet your needs and business processes.

**Dhruv Dang**, Managing Director  
[dhruv@realfolk.io](mailto:dhruv@realfolk.io)

## Credits

This project would not have been possible by the incredible work done by open source project maintainers. The licenses for open source projects used by the Procurement Concierge Program's web app are documented in `docs/OPEN_SOURCE_LICENSES.txt`.
