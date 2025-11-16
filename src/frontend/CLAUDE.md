# CLAUDE.md - Frotned Code Guidelines

This file provides guidance to Claude Code when working with code in the `src/frotend/` directory.

## Critical Constraint: Browser Compatibility

- All code in `src/frotend/` MUST be compatible with modern browser environment.
- The `src/frontend/` folder is exposed via HTTP transpilation to the browser at `/*`. Any code here must run in JavaScript environments without Node.js APIs.
