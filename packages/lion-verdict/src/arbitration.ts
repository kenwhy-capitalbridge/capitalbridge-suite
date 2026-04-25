// =============================================
// LION ARBITRATION ENGINE (AUTHORITATIVE LAYER)
// =============================================

export type ModelSignalBand =
  | "STRONG"
  | "ADEQUATE"
  | "TIGHT"
  | "WEAK"
  | "FAILED";

export type LionStatus =
  | "STRONG"
  | "STABLE"
  | "FRAGILE"
  | "AT_RISK"
  | "NOT_SUSTAINABLE";

export type ModelKey =
  | "income_engineering"
  | "capital_health"
  | "capital_stress"
  | "forever_income";

export type ModelSignals = {
  coverage: ModelSignalBand;
  buffer: ModelSignalBand;
  resilience: ModelSignalBand;
};

export type ModelRunResult = {
  model_key: ModelKey;
  status: "completed" | "invalid_preconditions" | "failed";
  signals?: ModelSignals;
  reason?: string[];
};

export type Conflict = {
  signal: "coverage" | "buffer" | "resilience";
  models: ModelKey[];
};

export type ArbitrationResult = {
  lion_status: LionStatus;

  signal_summary: {
    coverage: ModelSignalBand;
    buffer: ModelSignalBand;
    resilience: ModelSignalBand;
  };

  model_consensus: {
    agreement_level: "HIGH" | "MEDIUM" | "LOW";
    conflicts: Conflict[];
  };

  reason: string[];

  dominant_model: ModelKey | null;
};

// =============================================
// CONSTANTS
// =============================================

const BAND_ORDER: ModelSignalBand[] = [
  "FAILED",
  "WEAK",
  "TIGHT",
  "ADEQUATE",
  "STRONG",
];

const STATUS_ORDER: LionStatus[] = [
  "STRONG",
  "STABLE",
  "FRAGILE",
  "AT_RISK",
  "NOT_SUSTAINABLE",
];

const MODEL_CRITICALITY: Record<ModelKey, "HIGH" | "MEDIUM"> = {
  income_engineering: "HIGH",
  capital_health: "HIGH",
  capital_stress: "MEDIUM",
  forever_income: "MEDIUM",
};

// =============================================
// UTILITIES
// =============================================

function worstBand(bands: ModelSignalBand[]): ModelSignalBand {
  return bands.reduce((worst, current) => {
    return BAND_ORDER.indexOf(current) < BAND_ORDER.indexOf(worst)
      ? current
      : worst;
  });
}

function dedupeAndSort(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort();
}

// =============================================
// PRECONDITION LAYER
// =============================================

function evaluatePreconditions(models: ModelRunResult[]) {
  const invalidModels = models.filter(
    (m) => m.status === "invalid_preconditions"
  );

  const allReasons = dedupeAndSort(
    invalidModels.flatMap((m) => m.reason ?? [])
  );

  const hasHighInvalid = invalidModels.some(
    (m) => MODEL_CRITICALITY[m.model_key] === "HIGH"
  );

  const hasOnlyMediumInvalid =
    invalidModels.length > 0 &&
    invalidModels.every(
      (m) => MODEL_CRITICALITY[m.model_key] === "MEDIUM"
    );

  const allInvalid = invalidModels.length === models.length;

  return {
    hasHighInvalid,
    hasOnlyMediumInvalid,
    allInvalid,
    reasons: allReasons,
  };
}

// =============================================
// SIGNAL COLLAPSE
// =============================================

function collapseSignals(models: ModelRunResult[]) {
  const validModels = models.filter((m) => m.status === "completed");

  if (validModels.length === 0) {
    return null;
  }

  return {
    coverage: worstBand(validModels.map((m) => m.signals!.coverage)),
    buffer: worstBand(validModels.map((m) => m.signals!.buffer)),
    resilience: worstBand(validModels.map((m) => m.signals!.resilience)),
  };
}

// =============================================
// STATUS RESOLUTION
// =============================================

function resolveLionStatusFromSignals(
  signals: ReturnType<typeof collapseSignals>
): LionStatus {
  if (!signals) return "NOT_SUSTAINABLE";

  const worst = worstBand([
    signals.coverage,
    signals.buffer,
    signals.resilience,
  ]);

  switch (worst) {
    case "FAILED":
      return "NOT_SUSTAINABLE";
    case "WEAK":
      return "AT_RISK";
    case "TIGHT":
      return "FRAGILE";
    case "ADEQUATE":
      return "STABLE";
    case "STRONG":
      return "STRONG";
  }
}

function degradeStatus(status: LionStatus, levels: number): LionStatus {
  let index = STATUS_ORDER.indexOf(status);

  index = Math.min(index + levels, STATUS_ORDER.length - 1);

  return STATUS_ORDER[index];
}

// =============================================
// CONSENSUS + CONFLICTS
// =============================================

function computeAgreement(models: ModelRunResult[]): "HIGH" | "MEDIUM" | "LOW" {
  const valid = models.filter((m) => m.status === "completed");
  if (valid.length <= 1) return "HIGH";

  const allBands = valid.flatMap((m) => Object.values(m.signals!));

  const min = Math.min(...allBands.map((b) => BAND_ORDER.indexOf(b)));
  const max = Math.max(...allBands.map((b) => BAND_ORDER.indexOf(b)));

  const spread = max - min;

  if (spread === 0) return "HIGH";
  if (spread === 1) return "MEDIUM";
  return "LOW";
}

function detectConflicts(models: ModelRunResult[]): Conflict[] {
  const valid = models.filter((m) => m.status === "completed");

  const signals: ("coverage" | "buffer" | "resilience")[] = [
    "coverage",
    "buffer",
    "resilience",
  ];

  const conflicts: Conflict[] = [];

  for (const signal of signals) {
    const grouped = new Map<ModelSignalBand, ModelKey[]>();

    for (const m of valid) {
      const band = m.signals![signal];
      if (!grouped.has(band)) grouped.set(band, []);
      grouped.get(band)!.push(m.model_key);
    }

    if (grouped.size > 1) {
      conflicts.push({
        signal,
        models: Array.from(grouped.values()).flat(),
      });
    }
  }

  return conflicts;
}

// =============================================
// DOMINANT MODEL
// =============================================

function findDominantModel(
  models: ModelRunResult[],
  finalSignals: NonNullable<ReturnType<typeof collapseSignals>>
): ModelKey | null {
  const valid = models.filter((m) => m.status === "completed");

  for (const signal of ["coverage", "buffer", "resilience"] as const) {
    const worst = finalSignals[signal];

    const match = valid.find((m) => m.signals![signal] === worst);
    if (match) return match.model_key;
  }

  return null;
}

// =============================================
// MAIN ENTRY
// =============================================

export function runLionArbitration(
  models: ModelRunResult[]
): ArbitrationResult {
  const orderedModels = [...models].sort((a, b) =>
    a.model_key.localeCompare(b.model_key)
  );

  // STEP A: Preconditions
  const pre = evaluatePreconditions(orderedModels);

  // STEP B: Signals
  const signals = collapseSignals(orderedModels);

  // STEP C: Base Status
  let status = resolveLionStatusFromSignals(signals);

  // STEP D: Apply Precondition Overrides
  if (pre.allInvalid) {
    status = "NOT_SUSTAINABLE";
  } else if (pre.hasHighInvalid) {
    status = "AT_RISK";
  } else if (pre.hasOnlyMediumInvalid) {
    status = degradeStatus(status, 1);
  }

  // STEP E: Consensus
  const agreement = computeAgreement(orderedModels);
  const conflicts = detectConflicts(orderedModels);

  // STEP F: Dominant Model
  const dominant =
    signals !== null ? findDominantModel(orderedModels, signals) : null;

  return {
    lion_status: status,
    signal_summary: signals ?? {
      coverage: "FAILED",
      buffer: "FAILED",
      resilience: "FAILED",
    },
    model_consensus: {
      agreement_level: agreement,
      conflicts,
    },
    reason: pre.reasons,
    dominant_model: dominant,
  };
}
