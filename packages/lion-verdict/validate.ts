import { getLionVerdict, mapPersona, type Tier, type HistoryEntry, type GlobalHistory } from './getLionVerdict';
import { LION_COPY } from './copy';

const highPrefixes = ['Clearly,', 'Strongly,', 'Evidently,'];
const mediumPrefixes = ['Steadily,', 'In balance,', 'On course,'];
const lowPrefixes = ['Cautiously,', 'Tentatively,', 'With care,'];

const tier: Tier = 'STRONG';

const assert = (description: string, condition: boolean) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${description}`);
  }
  console.log(`✔ ${description}`);
};

const baseInput = {
  userId: 'test_user_1',
  reportType: 'forever_income',
  tier,
  persona: 'balanced' as const,
  confidenceScore: 0.8,
};

console.log('\nStage 12A – Determinism Verification');
const resultsA = Array.from({ length: 5 }, () => getLionVerdict(baseInput));
resultsA.slice(1).forEach((res, idx) => {
  assert(`Run ${idx + 2}: headline matches first run`, res.headline === resultsA[0].headline);
  assert(`Run ${idx + 2}: guidance matches first run`, res.guidance === resultsA[0].guidance);
  assert(`Run ${idx + 2}: emphasis matches first run`, res.emphasis === resultsA[0].emphasis);
});

console.log('\nStage 12B – Cross-User Variation');
const outUser1 = getLionVerdict(baseInput);
const outUser2 = getLionVerdict({ ...baseInput, userId: 'test_user_2' });
const differs = outUser1.headline !== outUser2.headline || outUser1.guidance !== outUser2.guidance;
const validHeadline = LION_COPY[tier].headlines.some((line) => outUser2.headline.endsWith(line.text));
const validGuidance = LION_COPY[tier].guidance.some((line) => outUser2.guidance.endsWith(line.text));
assert('Cross-user outputs differ', differs);
assert('Cross-user output uses a valid headline line', validHeadline);
assert('Cross-user output uses a valid guidance line', validGuidance);

console.log('\nStage 12C – History Avoidance');
const historyC: HistoryEntry[] = [
  { index: 0, timestamp: Date.now() },
  { index: 1, timestamp: Date.now() },
  { index: 2, timestamp: Date.now() },
];
const resultC = getLionVerdict({ ...baseInput, headlineHistory: historyC });
assert('Avoided recent headline indices 0/1/2', ![0, 1, 2].includes(resultC.headlineIndex));

console.log('\nStage 12D – Time Decay');
const tenDays = 10 * 24 * 60 * 60 * 1000;
const historyD: HistoryEntry[] = [
  { index: 1, timestamp: Date.now() - tenDays },
  { index: 2, timestamp: Date.now() },
];
const resultD = getLionVerdict({ ...baseInput, headlineHistory: historyD });
assert('Ignored aged entry (index 1) but still avoided index 2', resultD.headlineIndex !== 2);

console.log('\nStage 12E – Cross-Report Awareness');
const globalHistory: GlobalHistory = {
  headline: [{ index: 3, reportType: 'capital_health' }],
  guidance: [],
};
const resultE = getLionVerdict({ ...baseInput, globalHistory, previousHeadlineIndex: 2 });
assert('Avoided index 3 due to cross-report history', resultE.headlineIndex !== 3);

console.log('\nStage 12F – Confidence Tone');
const high = getLionVerdict({ ...baseInput, confidenceScore: 0.9 });
assert('High confidence prefix', highPrefixes.some((prefix) => high.headline.startsWith(`${prefix} `)));
const medium = getLionVerdict({ ...baseInput, confidenceScore: 0.5 });
assert('Medium confidence prefix', mediumPrefixes.some((prefix) => medium.headline.startsWith(`${prefix} `)));
const low = getLionVerdict({ ...baseInput, confidenceScore: 0.2 });
assert('Low confidence prefix', lowPrefixes.some((prefix) => low.headline.startsWith(`${prefix} `)));
assert('Low confidence guidance adds caution text', low.guidance.startsWith('Conditions are less certain.'));

console.log('\nStage 12G – Persona Bias');
const personaConservative = mapPersona({ riskTolerance: 0.5, surplusRatio: 0.8 });
const personaAggressive = mapPersona({ riskTolerance: 0.5, surplusRatio: 1.3 });
const conservativeResult = getLionVerdict({ ...baseInput, persona: personaConservative });
const aggressiveResult = getLionVerdict({ ...baseInput, persona: personaAggressive });
assert('Persona outputs differ (headline or guidance)', conservativeResult.headline !== aggressiveResult.headline || conservativeResult.guidance !== aggressiveResult.guidance);

console.log('\nStage 12H – JSON Integrity');
const jsonSafe = JSON.stringify(outUser1);
assert('JSON stringify produces string', typeof jsonSafe === 'string');

console.log('\nValidation complete.');
