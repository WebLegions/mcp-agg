# CLAUDE.md - Frotned Code Guidelines

This file provides guidance to Claude Code when working with code in the `src/frotend/` directory.

## Model ##

* The code is built on-top of [Juri.js framework](https://github.com/jurisjs/juris). 
  - [Framework code](node_modules/juris/juris.js)
  - [Typing](src/frontend/types/juris) is still a work-in-progress.
  - [Code examples](https://jurisjs.com/juris-playground.html).
  - [Docs](https://jurisjs.com/#/docs).
  - Component are reactive to state change. Anti-pattern: calling `render()`!
  - Global state defined in state.ts
  - Never touch `types/juris/juris.d.ts`. This is not our file. If needed, add to `types/juris/index.d.ts`.
* CSS is based on [clasless-css](https://github.com/DigitallyTailored/Classless.css), using CSS vars for common styles and theme. 
  - Use style modifiers when appropriate. Prefer modern sizing like 'rem', 'vh' over 'px' and '%'.
* Whenever appropriate, replace `div` with a moden HTML tag and use modern attributes to control behaviour. Use JS code to alter functionality only when existing moder attributes are not avail.
  - Each compnent has it's own style embedded in it using [Juris CSSExtractor](node_modules/juris/juris-cssextractor.js) for namespace isolation.
  - Usage of aria-* attributes is mandatory.
* When creating new component, take the HTML structure from components under [Basecoat](https://basecoatui.com/kitchen-sink/) and convert to Juris json-based format.
* Icons are sourced from https://lucide.dev/icons/ and use SVG.
  - Search >> Select Stroke width 1px; Size 24px; >> [Copy SVG]
  - Convert the SVG to Juris json-based format and add to components/icon/svg.ts file.
* All code is written in Typescript and transpiled to JS on client-side request.
* No Build Step: the combination of the above works at runtime, no CSS Modules or build tools required.


## Critical Constraint: Browser Compatibility

- All code in `src/frotend/` MUST be compatible with modern browser environment.
- The `src/frontend/` folder is exposed via HTTP transpilation to the browser at `/*`. Any code here must run in JavaScript environments without Node.js APIs.

## Juris Components

- Generic components under components folder. Each folder has the main component in the index.ts file and a test file.
- Register components using with Juris using `app.registerComponent()`.
- Minimal styles are embedded in the component using the `j.Component` type, an `CSSExtractor` wrapper providing automatic scoping with runtime-generated unique class names (`j-icon-a7f3d`), eliminating naming collisions without Shadow DOM complexity.
- Styles should add added to the top-most element of the component. 
- Read [here](https://medium.com/@resti.guay/juris-js-different-faces-of-components-f152a8924d12) to understand global-state, local-state, API-based state and reactive-rendering in a component.