# GG Learning Labs

A polished React + Vite homepage and demo L&D workspace for GG Learning Labs.

## Included

- Editorial homepage with responsive iPhone-friendly layout.
- Sign-in entry point with Individual and Corporate L&D demo roles.
- Authenticated service dashboard with searchable, filterable service tiles.
- Light/dark theme toggle shared across homepage, login, and workspace.
- Interactive genie guide and phase/service system.

## Run locally

```bash
pnpm install
pnpm dev
```

The app is a frontend-only demo. Login state is held in memory and does not store real credentials.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Individual | `individual@gglabs.demo` | `learn` |
| Corporate L&D | `corporate@gglabs.demo` | `build` |

## Validate

```bash
pnpm check
pnpm build
```

## Notes

The homepage field-note cards link to the original CompTIA Research, ELM Learning, and McKinsey sources. Replace placeholder pricing, service actions, and demo authentication with production integrations before launch.
