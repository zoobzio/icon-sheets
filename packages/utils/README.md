# @icon-sheets/utils

Small data helpers shared by the runtime packages:

- `copy(value)` — deep copy of plain data; non-plain values pass through by
  reference
- `clone(contract)` — a detached copy of a contract, for pulling state out of
  reactive containers
- `merge(contract, set)` — a contract with a set's icons overlaid; the merge
  behind `apply`

Pure data transforms — no rendering, no I/O.

Internal package — consume it through [`icon-sheets`](../icon-sheets).
