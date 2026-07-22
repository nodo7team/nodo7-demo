# NODO7 Clean Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a clean, independent NODO7 project baseline from the tracked source of `iptv-panel` without modifying the original project.

**Architecture:** Export the source repository at `HEAD` into a separate sibling directory, preserving application code but excluding repository history, generated artifacts, local environment files, credentials, and uncommitted local settings. Keep branding changes out of this baseline so later work can use the client's real assets and APIs.

**Tech Stack:** Git archive, PowerShell, Next.js 16, React 19, TypeScript, Supabase.

## Global Constraints

- Do not modify any file under the original `iptv-panel` project.
- Destination must be `C:\Users\HP\Pictures\Proyectos_Emprendimientos\OptiMind_IA\NODO7_IPTV_PANEL`.
- Do not copy credentials, environment files, build artifacts, dependencies, temporary files, or Git history.
- Do not change application behavior or internal branding in this baseline step.

---

### Task 1: Export the clean source baseline

**Files:**
- Source: all Git-tracked files at `iptv-panel` `HEAD`
- Create: clean project tree in `NODO7_IPTV_PANEL`

**Interfaces:**
- Consumes: source Git `HEAD`
- Produces: independent source directory without `.git`

- [x] **Step 1: Record the source status and tracked-file count**

Run `git status --short` and `git ls-files | Measure-Object` in the source. Expected: the known local `.claude/settings.local.json` modification may appear; it must not be transferred.

- [x] **Step 2: Export `HEAD` to a temporary tar archive**

Run `git archive --format=tar HEAD -o <temporary-archive>` from the source. Expected: exit code 0.

- [x] **Step 3: Extract into the destination**

Run `tar -xf <temporary-archive> -C <destination>`. Expected: tracked source files appear in the destination while existing NODO7 design and plan documents remain present.

- [x] **Step 4: Remove the temporary archive**

Delete only the explicitly resolved temporary archive after verifying it is outside the source and destination trees.

### Task 2: Verify isolation and safety

**Files:**
- Inspect: original and destination trees

**Interfaces:**
- Consumes: exported NODO7 baseline
- Produces: evidence that the original is unchanged and the destination is clean

- [x] **Step 1: Verify forbidden paths are absent**

Check `.git`, `.next`, `node_modules`, `.vercel`, `.env.local`, credential JSON files, `scratch`, and logs. Expected: none exist in the destination.

- [x] **Step 2: Compare representative source files**

Compare `package.json`, `middleware.ts`, `app/demo/page.tsx`, and `app/api/demo/route.ts` against their Git `HEAD` blobs using Git's normal line-ending filter. Expected: all normalized object hashes match. A raw byte hash can differ on Windows because `core.autocrlf=true` converts LF to CRLF during export.

- [x] **Step 3: Verify the original repository status**

Run `git status --short` in the original. Expected: no new changes created by this operation; only the pre-existing local settings modification remains.

- [x] **Step 4: Inventory the destination**

Report the destination path, file count, top-level folders, and the intentional absence of installed dependencies. Expected: a clean source baseline ready for later NODO7 branding and API configuration.
