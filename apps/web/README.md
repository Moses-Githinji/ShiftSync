# ShiftSync Web

This is the React / Vite frontend for the ShiftSync scheduling platform.

## Development

Because this project uses a `pnpm` monorepo, **you do not need to install dependencies in this folder directly**. Running `pnpm install` at the root of the repository automatically installs all dependencies for this frontend, the backend API, and the shared constraint engine.

To start the frontend in development mode, you can either:
1. Run `pnpm run dev` from inside this directory.
2. Run `pnpm --filter web run dev` from the root directory.

## Styling
This project uses TailwindCSS for styling and adheres to modern web design standards.
