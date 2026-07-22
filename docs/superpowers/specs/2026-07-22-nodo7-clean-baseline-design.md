# NODO7 clean baseline design

## Objective

Create an independent, clean baseline for the future NODO7 IPTV panel without modifying the existing `iptv-panel` project.

## Source and destination

- Source: `C:\Users\HP\Pictures\Proyectos_Emprendimientos\OptiMind_IA\iptv-panel`
- Destination: `C:\Users\HP\Pictures\Proyectos_Emprendimientos\OptiMind_IA\NODO7_IPTV_PANEL`

## Copy policy

The destination receives the files tracked by the source repository at its current `HEAD`. This preserves the application source while excluding local-only state and credentials.

The following are not copied: `.git`, `.next`, `node_modules`, `.vercel`, `.env.local`, Google credential JSON files, `scratch`, logs, build output, TypeScript build caches, and the local modification to `.claude/settings.local.json`.

## Branding scope

For this first step, NODO7 is represented by the destination folder name only. No application text, logo, colors, API integrations, database configuration, environment variables, or business rules are changed until the client supplies their assets and credentials.

## Verification

Verify that the source working tree has not changed, the destination contains the expected tracked source, and no forbidden secret or generated files exist in the destination.
