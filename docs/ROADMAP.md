# Family Wealth Roadmap

## Purpose

Build a private Family Wealth app for one user, starting with savings planning for
two upcoming confirmations and evolving in small, safe increments.

## Priority Order

1. Security
2. Correctness
3. Simplicity
4. Testability
5. Maintainability
6. Features

## Core Principles

- KISS
- YAGNI
- DRY with Rule of Three
- Small increments
- Fail closed
- Least privilege
- Explicit boundaries
- Human in the loop

## Target Stack

- Node.js 22.23.1
- TypeScript strict
- Fastify backend
- React + Vite frontend
- Vitest tests
- ESLint + Prettier
- GitHub Actions CI
- SQLite for persistence later

## Architecture

Use a small modular monolith:

- UI (React)
- Application layer (use cases/services)
- Domain (pure business logic)
- Adapters (SQLite, Saxo)

Domain must not depend on React, Fastify, SQLite, Saxo, OAuth, or LLMs.

## AI Safety Boundary

AI can only call approved application tools and must never have direct financial
execution access or arbitrary HTTP capability.

## Phase Plan

| Phase | Delivery |
| --- | --- |
| 0 | Private Git/GitHub/Codex isolation |
| 1 | Minimal Node/TS/React bootstrap |
| 2 | Savings domain + calculations |
| 3 | Minimal usable UI |
| 4 | SQLite persistence |
| 5 | Mock Saxo adapter |
| 6 | Saxo SIM read-only |
| 7 | ASK detection |
| 8 | ASK creation capability discovery |
| 9 | Human approval model |
| 10 | SIM account creation |
| 11 | Audit log |
| 12 | LIVE read-only |
| 13 | Controlled LIVE ASK creation (optional gate) |
| 14 | AI read-only assistant |
| 15 | AI action proposals |
| 16 | Intelligent savings assistant |
| 17+ | Future investments/features by explicit need |

## Current Execution Rule

Current implementation scope is only Phase 0 + Phase 1. Do not continue into later
phases automatically.