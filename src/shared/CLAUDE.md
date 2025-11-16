# CLAUDE.md - Shared Code Guidelines

This file provides guidance to Claude Code when working with code in the `src/shared/` directory.

## Critical Constraint: Browser & Node.js Compatibility

- All code in `src/shared/` MUST be compatible with BOTH browser and Node.js environments.
- The `src/shared/` folder is exposed via HTTP transpilation to the browser at `/shared/*`. Any code here must run in JavaScript environments without Node.js APIs. Think of it as "universal JavaScript" that works anywhere.
