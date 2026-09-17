# ShiftSync API

This is the NestJS backend for the ShiftSync scheduling platform.

## Development

Because this project uses a `pnpm` monorepo, **you do not need to install dependencies in this folder directly**. Running `pnpm install` at the root of the repository automatically installs all dependencies for this API, the web frontend, and the shared constraint engine.

To start the API in development mode, you can either:
1. Run `pnpm run dev` from inside this directory.
2. Run `pnpm --filter api run dev` from the root directory.

## Environment Variables
Ensure you have a `.env` file in the root of the project with the `DATABASE_URL`. The API will automatically read from it.
