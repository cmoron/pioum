# GitHub Actions CI Workflows

## Overview

This directory contains the CI/CD workflows for the Pioum project.

## Workflows

### ci.yml - Main CI Pipeline

This is the primary CI workflow that runs on every push and pull request to the `main` branch.

**Triggers:**
- Push to `main` branch
- Pull requests targeting `main` branch

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Setup pnpm 9
4. Install dependencies with caching
5. Run linting across all packages
6. Generate Prisma Client
7. Push database schema to test database
8. Run tests with PostgreSQL service
9. Build all packages

**Services:**
- PostgreSQL 16 (Alpine) for integration tests

**Environment Variables:**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Test JWT secret
- `MAGIC_LINK_SECRET`: Test magic link secret
- `FRONTEND_URL`: Frontend URL for tests
- `NODE_ENV`: Set to `test`

### ci-simple.yml - Simple Build & Lint Check

A simplified workflow for manual testing (workflow_dispatch only).

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Setup pnpm 9
4. Install dependencies with caching
5. Run linting
6. Generate Prisma Client
7. Build packages

**Note:** This workflow does not run tests and is primarily for validating the build and lint process.

## Local Testing with `act`

You can test these workflows locally using the GitHub CLI extension `act`:

```bash
# List available workflows
gh act -l

# Dry run the simple workflow
gh act workflow_dispatch -j lint-and-build --dryrun

# Run the simple workflow (note: may take time on first run due to Docker image download)
gh act workflow_dispatch -j lint-and-build

# The main CI workflow with services is not fully supported by act
# due to limitations with service containers in local execution
```

## Notes

- The main CI workflow requires a PostgreSQL service which is automatically provisioned by GitHub Actions
- Local testing with `act` may have limitations with service containers
- The pnpm store is cached to speed up subsequent runs
- All tests must pass before the workflow succeeds
