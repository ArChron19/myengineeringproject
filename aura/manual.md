# My Engineering Project User Manual

Living manual for every My Engineering Project product. It changes often; the newest version is always the one online.

**Last updated:** 2026-10-11 · **Covers:** selectNsolve Basic 0.0.1, selectNsolve Pro (preview), selectNsolve Classroom (preview), selectNsolve Developer API, Brazen Sudoku

<!-- EDITING: change any section below; Aura and the manual page pick it up within about 5 minutes.
     Keep one topic per "##" or "###" heading. Update "Last updated" and add a line to the Change log. -->

## 1. selectNsolve Basic

### What selectNsolve Basic does
selectNsolve Basic is a free Google Sheets add-on that solves one equation for one unknown variable. You write math as plain text in cells; any cell containing a single equal sign is recognised as math text. No spreadsheet formulas or programming are needed.

### Requirements
You need a Google account and Google Sheets in a desktop or laptop browser. selectNsolve Basic is free and needs no credit card.

### Install selectNsolve Basic
keywords: install, download, add-on, marketplace, extensions

1. Open the Google Workspace Marketplace and search for selectNsolve.
2. Choose selectNsolve Basic and click Install, then allow the requested permissions.
3. Open any Google Sheet; selectNsolve appears under the Extensions menu.
If you can't find the listing, email support@myengineeringproject.com for the install link.

### Your first solve (quick start)
keywords: getting started, first time, tutorial, how to use, example, run the solver

1. In separate cells, type a constant, a variable and an equation, for example:
    - `g = 9.81`
    - `t = 1 > 0 < 10`
    - `h = 50`
    - `h = 0.5 * g * t^2 | 0.001`
2. Select all of those cells together.
3. Open Extensions, then selectNsolve, and run the solver.
4. The solved value of the variable appears in the cell to the right of the variable (here t ≈ 3.19).

### Equation format
keywords: write an equation, syntax, how to type, lhs, rhs, pipe
Write equations as `LHS = RHS | Precision`. LHS and RHS are math expressions and each side must be or contain a Name; neither side may be just a number. The pipe character `|` separates the precision. Only one equation and one variable are allowed per selection. Units are not allowed inside equations (use conversion factors instead).

### Precision
Precision is a number greater than 0 and up to 1 after the `|`, for example `| 0.0001`. Values closer to 1 make the solver narrow the minimum and maximum toward the solution more aggressively. Solving stops after 60 seconds.

### Constants
A constant is `Name = Number` or `Name = Number Unit`. Examples: `pi = 3.14159` and `speed = 60 mph`. An equal sign followed directly by a number is only valid for constants and variables.

### Variables and search bounds
A variable is `Name = Start > Minimum < Maximum`, for example `pressure = 100 Pa > 50 < 150`. The solver searches between the minimum and maximum, starting from the start value. Choose bounds that contain the answer; tighter bounds solve faster.

### Derivations
A derivation defines an intermediate value: `Name = RHS`, for example `area = (3.14159) * r^2`. The calculated value appears in the cell to the right.

### Numbers inside expressions
To use a literal number at the start of an expression, wrap it in grouping symbols: `y = (3) * x + 1` and `x - 3*y = (5) * z | 0.9`. Write numbers as `2340` or `2.34E3`. Do not use thousands separators (`2,340` is invalid).

### Operators and grouping
Supported operators: `^` exponent; `*`, `×`, `⋅` multiplication; `/` division; `+` and `-`. Group with `( )`, `[ ]` or `{ }`. Other Unicode math operators are reserved for future use.

### Names in any language
keywords: greek letters, unicode, symbols, any language, script, alphabet, variable names, subscript
Names and units can be any sequence of Unicode characters except math operators, in any script: `velocity`, `ρ`, `μ`, `Δh`, `T_c°`, `سرعة`, `速度`, `скорость`, `מהירות`.

### Using worksheet functions
Declare the Google Sheets functions your math uses with a Formulas line, for example `Formulas: LOG10; SIN; COS`.

### Cell references
Use `Name = [A2]` to read a value from another cell. The referenced cell must be inside your math-text selection.

### Units
keywords: units, conversion, feet, meters, si, imperial, convert
selectNsolve Basic does not track or convert units. Make sure inputs use consistent units, convert units yourself, and interpret results in the right units.

### Worked example: Colebrook-White friction factor
The Colebrook-White equation for the Darcy friction factor cannot be solved explicitly, which makes it a good fit for selectNsolve:

- `ε = 0.000045`
- `D = 0.1`
- `Re = 100000`
- `f = 0.02 > 0.008 < 0.1`
- `1/f^0.5 = -2 * LOG10(ε/(3.7*D) + 2.51/(Re*f^0.5)) | 0.001`
- `Formulas: LOG10`
Select all six cells and run the solver; f appears to the right of the variable (about 0.0201).

### Troubleshooting selectNsolve Basic
keywords: no solution, not working, error, wrong answer, nothing happens, help, fix, broken

- **Nothing happens:** make sure every math cell contains exactly one `=` and that the equation, its variable and its constants are all selected together.
- **A side is just a number:** each side of an equation must contain a Name; wrap numbers in parentheses, e.g. `(5) * z`.
- **No solution found:** widen the variable's minimum and maximum, or lower the precision value.
- **Wrong answer:** check units and that the bounds contain only one solution.
- **Comma numbers:** remove thousands separators.
- Still stuck? Email support@myengineeringproject.com or call (656) 200-7296.

## 2. selectNsolve Pro (preview, coming soon)

### What Pro will add
selectNsolve Pro will solve systems of up to 30 variables at once, with AI that manages each variable's minimum, maximum and precision for you. It includes everything in Basic, student seats and early access to new features. Pricing: $7.99 per month or $59 per year.

### Upgrading to Pro
Pro is not on sale yet. Use the Notify Me button on the Pricing page or email support@myengineeringproject.com to hear when it launches. Your Basic sheets will keep working.

## 3. selectNsolve Classroom (preview, coming soon)

### What Classroom will add
Classroom is for instructors and institutions: everything in Pro, up to 35 student seats, shared equation libraries, an instructor dashboard and a dedicated onboarding call, for $179 per year. School and non-profit discounts will be available.

### Teaching with selectNsolve today
Until Classroom launches, teachers can share a Google Sheet with students and solve together in real time with selectNsolve Basic.

## 4. selectNsolve Developer API

### Overview of the Developer API
The Developer API is a live MCP server at `https://myengineeringproject.com/api/mcp` that lets AI agents create Google Sheets pre-filled with selectNsolve math text. No API key is needed. The API prepares sheets; the selectNsolve Basic add-on solves them.

### Developer API tools
`sheets_create`, `sheets_read_range`, `sheets_write_range`, `sheets_format_selectnsolve`, `sheets_apply_template`.

### Connecting an AI agent
Add `https://myengineeringproject.com/api/mcp` as a remote MCP server in your agent. Claude Desktop needs version 0.10.0 or later; older clients may need a local MCP proxy. Then install selectNsolve Basic in Google Sheets to solve the sheets the agent creates.

## 5. Brazen Sudoku

### Playing Brazen Sudoku
Open brazensudoku.com in any browser. Fill the 9×9 grid so every row, column and 3×3 box contains the digits 1 to 9 once each. Use your browser's "Install app" or "Add to Home screen" option to keep it on your phone or computer.

## 6. Getting help

### Support channels
Email support@myengineeringproject.com, use the Support page form, or ask Aura on any page of the website. To talk to a person, call or text (656) 200-7296.

## Change log

- 2026-10-11: First edition of the living manual (selectNsolve Basic, Pro and Classroom previews, Developer API, Brazen Sudoku).
