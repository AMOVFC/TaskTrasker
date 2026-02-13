# TaskTasker - Tree-Based Task Management (v0)

**v0.0.1** - Initial coming soon page + proof of concept

This is the early version showcasing the core concept. 

**TaskTasker** is a modern task + planning web app built for people who think in trees, not flat lists.

It supports **endlessly nested tasks**, where every item:
- Can have its own due date
- Has a workflow status (todo, in progress, blocked, delayed, done)
- Can depend on other tasks
- Can be reordered and moved anywhere in the tree

TaskTasker is built as a **PWA (Progressive Web App)** and is installable on Android with push notifications.

Website: https://tasktasker.com

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm
- PostgreSQL (for later phases)

### Installation

```bash
# Install dependencies for all packages
pnpm install

# Generate Prisma client (when DB is configured)
pnpm db:generate
```

### Development

```bash
# Start the dev server (Next.js on http://localhost:3000)
pnpm dev
```

Visit:
- **Home (Coming Soon)**: http://localhost:3000
- **Demo (Proof of Concept)**: http://localhost:3000/demo

### Launch notification backend configuration

The "Notify Me" form now posts to `POST /api/launch-notify`.
Set these environment variables on the web app:

- `LAUNCH_NOTIFY_WEBHOOK_URL` (required): webhook endpoint that stores subscriptions
- `LAUNCH_NOTIFY_WEBHOOK_SECRET` (optional): bearer token sent as `Authorization` header

A Cloudflare Worker is a good fit for this webhook because it is inexpensive and can write to D1/KV/Queues.

---

## 📁 Project Structure

```
tasktasker/
├── apps/
│   └── web/              # Next.js application
│       ├── app/          # App Router pages
│       │   ├── page.tsx  # Coming soon landing
│       │   └── demo/     # Interactive tree demo
│       └── components/   # React components
├── packages/
│   └── db/               # Prisma ORM & schema
│       └── prisma/       # Database schema
└── package.json          # Root workspace config
```

## 🎯 v0 Features

- ✅ Coming soon landing page with email signup
- ✅ Interactive tree-based task demo
- ✅ Modern UI with Tailwind CSS
- ✅ Task status workflow visualization
- ✅ Database schema ready (Prisma)

---

# Project Vision

TaskTasker is designed around a simple idea:

> Every task is a node.  
> Every node is first-class.

Unlike traditional to-do apps that flatten work into lists, TaskTasker treats planning as a structured hierarchy with workflow state and dependency awareness.

Core principles:

- Infinite nesting (no depth limits)
- Clean tree structure
- Flexible workflow states
- Dependency tracking
- Installable web app
- Built to scale cleanly

This is not a bloated project management suite.
It is a structured thinking tool.

---

# Core Features (MVP)

### Tree-Based Tasks
- Unlimited nested subtasks
- Collapse / expand
- Drag & drop reordering
- Move tasks between parents

### Workflow Status
Each task has a status:

- `todo`
- `in_progress`
- `blocked`
- `delayed`
- `done`

This replaces simple checkbox-only logic.

### Dependencies
Tasks can depend on other tasks.
Example:
- “Launch site” depends on “Finish landing page”
- “Deploy backend” depends on “Finalize database schema”

Blocked tasks can be:
- Automatically detected
- Highlighted visually
- Filtered in views

### Due Dates
Every node can have:
- Optional due date
- Overdue detection
- Upcoming filtering

### Views
- Tree View (default)
- Today
- Upcoming
- Overdue
- Blocked
- Completed

### Authentication
- Google SSO via OAuth (Auth.js / NextAuth)

### Notifications
- Web Push (FCM)
- Due date reminders
- Installable on Android

---

# Architecture Overview

## Frontend

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- dnd-kit (tree drag & drop)
- Zod (validation)

PWA enabled for:
- Installable app
- Offline-ready structure (later sync queue)

---

## Backend

- Postgres (primary database)
- Prisma (ORM + migrations)
- Next.js Route Handlers / Server Actions

Optional later:
- Redis for job queues
- Dedicated worker for notifications

---

## Authentication

- Google OAuth
- Auth.js (NextAuth)
- Users keyed by stable Google `sub`

---

## Push Notifications

- Firebase Cloud Messaging (FCM)
- Store user push tokens
- Cron endpoint to send reminders

---

# Data Model

## Task

Each task is a node in a tree.

Fields:

- id (uuid)
- user_id
- parent_id (nullable)
- title
- status
- due_at (nullable)
- sort_order
- created_at
- updated_at

Status is one of:

- todo
- in_progress
- blocked
- delayed
- done

Tree structure:
- Adjacency list via `parent_id`
- Optional materialized path or Postgres ltree for fast subtree queries

---

## TaskDependency

Represents task relationships.

Fields:

- id
- task_id
- depends_on_task_id
- created_at

This allows:
- Cross-branch dependencies
- Dependency graphs separate from tree structure

---

# Why This Architecture Scales

The tree structure is independent from workflow logic.

That means we can later add:
- Recurring tasks
- Tags
- Priority levels
- Task comments
- Time tracking
- Attachments
- Collaboration / multi-user workspaces
- AI planning assistance

Without restructuring the database.

---

# Project Structure (Planned)

tasktasker/
apps/
web/ # Next.js app
packages/
db/ # Prisma schema
ui/ # Shared components (optional)
docs/

yaml
Copy code

---

# Development Roadmap

Phase 1:
- Auth
- Task CRUD
- Tree rendering
- Status support

Phase 2:
- Drag & drop
- Move tasks
- Dependency support

Phase 3:
- Views (Today, Overdue, Blocked)
- Push notifications

Phase 4:
- Offline sync
- Performance optimization

---

# Tech Stack Summary

Frontend:
- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- dnd-kit

Backend:
- Postgres
- Prisma

Auth:
- Auth.js (Google)

Push:
- Firebase Cloud Messaging

Hosting:
- Vercel (web)
- Neon / Supabase (database)

---

# Getting Started (Planned)

Install dependencies:

pnpm install

yaml
Copy code

Run dev server:

pnpm dev

yaml
Copy code

Run database migrations:

pnpm prisma migrate dev

yaml
Copy code

---

# License

TBD

---

# Philosophy

TaskTasker is built around structured clarity.

Tasks should not be flat.
Work is rarely linear.
Planning should reflect reality.

Tasks.
All the way down.
