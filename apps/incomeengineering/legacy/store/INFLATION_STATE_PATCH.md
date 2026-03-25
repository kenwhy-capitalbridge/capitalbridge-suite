# Add Estimated Inflation to Calculator Store

Add the following to `store/useCalculatorStore.ts` so the Estimated Inflation field and Real Yields work:

1. **State** (in the initial state / default state object, e.g. alongside `timeHorizonYears`):
   ```ts
   estimatedInflationPercent: 1.5,
   ```

2. **Setter** (with the other setters, e.g. after `setTimeHorizonYears`):
   ```ts
   setEstimatedInflationPercent: (value: number) => void;
   ```
   And in the implementation:
   ```ts
   setEstimatedInflationPercent: (value: number) => set({ estimatedInflationPercent: value }),
   ```
   (or equivalent if using Context: add `estimatedInflationPercent` to state and `setEstimatedInflationPercent` to the context value.)

3. **Type** (if you have a separate state interface): add
   ```ts
   estimatedInflationPercent: number;
   ```
   and
   ```ts
   setEstimatedInflationPercent: (value: number) => void;
   ```

Default is 1.5 (%). Constants are in `config/constants.ts`: INFLATION_MIN=0, INFLATION_MAX=10, INFLATION_STEP=0.1.
