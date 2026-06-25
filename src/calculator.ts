export type FarmerType = "small" | "lp" | "captain" | "power";

export interface FarmInputs {
  weeklyTradingVolume: number;
  alpDeposit: number;
  alpHoldDays: number;
  joinsGuild: boolean;
  guildActiveMembers: number;
  guildWeeklyVolume: number;
  referralNetworkVolume: number;
  farmerType: FarmerType;
  benchmarkFdv: number;
  benchmarkReachPercent: number;
  tradingCostBps: number;
  slippageCostBps: number;
  riskBufferBps: number;
}

export type ProfilePreset = Pick<
  FarmInputs,
  | "weeklyTradingVolume"
  | "alpDeposit"
  | "alpHoldDays"
  | "joinsGuild"
  | "guildActiveMembers"
  | "guildWeeklyVolume"
  | "referralNetworkVolume"
  | "tradingCostBps"
  | "slippageCostBps"
  | "riskBufferBps"
>;

export interface GuildStatus {
  qualified: boolean;
  membersNeeded: number;
  volumeNeeded: number;
}

export interface FarmScore {
  conservative: number;
  base: number;
  aggressive: number;
}

export interface ReturnEstimate {
  rewardValue: number;
  assumedValuePerPoint: number;
  estimatedPoints: number;
  estimatedCost: number;
  netProfit: number;
  roiPercent: number;
}

export interface ReturnScenarios {
  conservative: ReturnEstimate;
  base: ReturnEstimate;
  aggressive: ReturnEstimate;
}

export interface BenchmarkScenario {
  reachPercent: number;
  estimate: ReturnEstimate;
}

export interface FarmPlan {
  eligiblePaths: string[];
  guildStatus: GuildStatus;
  referralRate: number;
  score: FarmScore;
  estimatedRewardUnits: number;
  returns: ReturnScenarios;
  benchmarkScenarios: BenchmarkScenario[];
  nextActions: string[];
  profileLabel: string;
  disclaimer: string;
}

const GUILD_MEMBER_THRESHOLD = 10;
const GUILD_VOLUME_THRESHOLD = 1_000;

export interface HistoricalCoefficient {
  name: string;
  value: number;
  unit: string;
  updateCadence: string;
}

// Historical settled-week estimates. These are public planner assumptions, not official fixed conversion rates.
export const TRADING_POINTS_COEFFICIENT: HistoricalCoefficient = {
  name: "Trading points coefficient",
  value: 2.3,
  unit: "estimated points per $1k weekly trading volume",
  updateCadence: "Updated weekly from the previous settled week",
};

export const ALP_POINTS_COEFFICIENT: HistoricalCoefficient = {
  name: "ALP points coefficient",
  value: 0.013,
  unit: "estimated points per $1 ALP deposit for a full-week hold",
  updateCadence: "Updated weekly from the previous settled week",
};

const RECENT_TEAM_POOL_POINTS = 114_286;
const TEAM_SLOT_RATIO = 0.2;

// Scenario assumptions used to translate estimated points into a possible value range.
export const BENCHMARK_REACH_PRESETS = [0.1, 0.5, 1, 5, 10, 20];
export const PRE_TGE_FARMING_ALLOCATION_ASSUMPTION = 0.31;
export const TOTAL_CAMPAIGN_POINTS = 10_000_000;
export const PUBLIC_ESTIMATION_NOTE =
  "This model estimates outcomes from historical settled points data. It does not represent actual future points, token allocation, or final rewards.";

const PROFILE_PRESETS: Record<FarmerType, ProfilePreset> = {
  small: {
    weeklyTradingVolume: 5_000,
    alpDeposit: 250,
    alpHoldDays: 7,
    joinsGuild: false,
    guildActiveMembers: 0,
    guildWeeklyVolume: 0,
    referralNetworkVolume: 0,
    tradingCostBps: 3,
    slippageCostBps: 7,
    riskBufferBps: 0,
  },
  lp: {
    weeklyTradingVolume: 2_000,
    alpDeposit: 5_000,
    alpHoldDays: 7,
    joinsGuild: false,
    guildActiveMembers: 0,
    guildWeeklyVolume: 0,
    referralNetworkVolume: 0,
    tradingCostBps: 3,
    slippageCostBps: 7,
    riskBufferBps: 0,
  },
  captain: {
    weeklyTradingVolume: 50_000,
    alpDeposit: 1_000,
    alpHoldDays: 7,
    joinsGuild: true,
    guildActiveMembers: 12,
    guildWeeklyVolume: 150_000,
    referralNetworkVolume: 5_000_000,
    tradingCostBps: 3,
    slippageCostBps: 7,
    riskBufferBps: 0,
  },
  power: {
    weeklyTradingVolume: 200_000,
    alpDeposit: 10_000,
    alpHoldDays: 7,
    joinsGuild: true,
    guildActiveMembers: 20,
    guildWeeklyVolume: 500_000,
    referralNetworkVolume: 50_000_000,
    tradingCostBps: 3,
    slippageCostBps: 7,
    riskBufferBps: 0,
  },
};

export function getProfilePreset(type: FarmerType): ProfilePreset {
  return { ...PROFILE_PRESETS[type] };
}

export function calculateFarmPlan(inputs: FarmInputs): FarmPlan {
  const tradingVolume = clampNonNegative(inputs.weeklyTradingVolume);
  const alpDeposit = clampNonNegative(inputs.alpDeposit);
  const alpHoldDays = Math.min(7, clampNonNegative(inputs.alpHoldDays));
  const guildActiveMembers = clampNonNegative(inputs.guildActiveMembers);
  const guildWeeklyVolume = clampNonNegative(inputs.guildWeeklyVolume);
  const estimatedCost = getEstimatedCost({
    weeklyTradingVolume: tradingVolume,
    tradingCostBps: inputs.tradingCostBps,
    slippageCostBps: inputs.slippageCostBps,
    riskBufferBps: inputs.riskBufferBps,
  });
  const guildStatus = getGuildStatus(guildActiveMembers, guildWeeklyVolume);
  const referralRate = getReferralRate(inputs.referralNetworkVolume);
  const rawScore = getRawScore({
    tradingVolume,
    alpDeposit,
    alpHoldDays,
    guildQualified: inputs.joinsGuild && guildStatus.qualified,
    guildWeeklyVolume,
    weeklyTradingVolume: tradingVolume,
    referralRate,
    farmerType: inputs.farmerType,
  });
  const estimatedRewardUnits = getEstimatedRewardUnits(rawScore);
  const baseRewardEstimate = getRewardValueEstimate({
    benchmarkFdv: inputs.benchmarkFdv,
    benchmarkReachPercent: inputs.benchmarkReachPercent,
    estimatedRewardUnits,
  });
  const benchmarkScenarios = BENCHMARK_REACH_PRESETS.map((reachPercent) => ({
    reachPercent,
    estimate: (() => {
      const rewardEstimate = getRewardValueEstimate({
        benchmarkFdv: inputs.benchmarkFdv,
        benchmarkReachPercent: reachPercent,
        estimatedRewardUnits,
      });
      return getReturnEstimate(rewardEstimate.rewardValue, estimatedCost, rewardEstimate);
    })(),
  }));

  const eligiblePaths = getEligiblePaths({
    tradingVolume,
    alpDeposit,
    guildQualified: inputs.joinsGuild && guildStatus.qualified,
    referralRate,
  });
  return {
    eligiblePaths,
    guildStatus,
    referralRate,
    score: {
      conservative: Math.round(rawScore * 0.65),
      base: Math.round(rawScore),
      aggressive: Math.round(rawScore * 1.35),
    },
    estimatedRewardUnits,
    returns: {
      conservative: getReturnEstimate(
        baseRewardEstimate.rewardValue * 0.55,
        estimatedCost,
        baseRewardEstimate,
      ),
      base: getReturnEstimate(baseRewardEstimate.rewardValue, estimatedCost, baseRewardEstimate),
      aggressive: getReturnEstimate(
        baseRewardEstimate.rewardValue * 1.65,
        estimatedCost,
        baseRewardEstimate,
      ),
    },
    benchmarkScenarios,
    nextActions: getNextActions(inputs, guildStatus),
    profileLabel: getProfileLabel(inputs.farmerType),
    disclaimer:
      "This unofficial planner uses historical settled data to estimate possible outcomes. It does not represent actual future points, token allocation, airdrop value, price, or final rewards.",
  };
}

function getRewardValueEstimate(args: {
  benchmarkFdv: number;
  benchmarkReachPercent: number;
  estimatedRewardUnits: number;
}): { estimatedPoints: number; assumedValuePerPoint: number; rewardValue: number } {
  const estimatedPoints = clampNonNegative(args.estimatedRewardUnits);
  const assumedValuePerPoint = getAssumedValuePerPoint(args.benchmarkFdv, args.benchmarkReachPercent);
  return {
    estimatedPoints,
    assumedValuePerPoint,
    rewardValue: estimatedPoints * assumedValuePerPoint,
  };
}

function getEstimatedCost(args: {
  weeklyTradingVolume: number;
  tradingCostBps: number;
  slippageCostBps: number;
  riskBufferBps: number;
}): number {
  const allInTradingBps =
    clampNonNegative(args.tradingCostBps) + clampNonNegative(args.slippageCostBps) + clampNonNegative(args.riskBufferBps);
  const tradingCost = args.weeklyTradingVolume * (allInTradingBps / 10_000);
  return Math.max(0, tradingCost);
}

function getReturnEstimate(
  rewardValue: number,
  estimatedCost: number,
  rewardEstimate: { estimatedPoints: number; assumedValuePerPoint: number },
): ReturnEstimate {
  const netProfit = rewardValue - estimatedCost;
  return {
    rewardValue,
    assumedValuePerPoint: rewardEstimate.assumedValuePerPoint,
    estimatedPoints: rewardEstimate.estimatedPoints,
    estimatedCost,
    netProfit,
    roiPercent: estimatedCost > 0 ? (netProfit / estimatedCost) * 100 : 0,
  };
}

function getAssumedValuePerPoint(benchmarkFdv: number, benchmarkReachPercent: number): number {
  const scenarioValue = clampNonNegative(benchmarkFdv) * (clampPercent(benchmarkReachPercent) / 100);
  if (scenarioValue <= 0) return 0;
  return (scenarioValue * PRE_TGE_FARMING_ALLOCATION_ASSUMPTION) / TOTAL_CAMPAIGN_POINTS;
}

function getEstimatedRewardUnits(rawScore: number): number {
  return Math.max(1, roundPublic(clampNonNegative(rawScore)));
}

function getEligiblePaths(args: {
  tradingVolume: number;
  alpDeposit: number;
  guildQualified: boolean;
  referralRate: number;
}): string[] {
  const paths: string[] = [];
  if (args.tradingVolume > 0) paths.push("Trading");
  if (args.alpDeposit > 0) paths.push("ALP");
  if (args.guildQualified) paths.push("Guild");
  if (args.referralRate > 0.1) paths.push("Referral");
  return paths;
}

function getGuildStatus(activeMembers: number, weeklyVolume: number): GuildStatus {
  const membersNeeded = Math.max(0, GUILD_MEMBER_THRESHOLD - activeMembers);
  const volumeNeeded = Math.max(0, GUILD_VOLUME_THRESHOLD * GUILD_MEMBER_THRESHOLD - weeklyVolume);
  return {
    qualified: membersNeeded === 0 && volumeNeeded === 0,
    membersNeeded,
    volumeNeeded,
  };
}

export function getReferralRate(networkVolume: number): number {
  const volume = clampNonNegative(networkVolume);
  if (volume >= 500_000_000) return 0.35;
  if (volume >= 200_000_000) return 0.3;
  if (volume >= 100_000_000) return 0.25;
  if (volume >= 75_000_000) return 0.2;
  if (volume >= 50_000_000) return 0.15;
  return 0.1;
}

function getRawScore(args: {
  tradingVolume: number;
  alpDeposit: number;
  alpHoldDays: number;
  guildQualified: boolean;
  guildWeeklyVolume: number;
  weeklyTradingVolume: number;
  referralRate: number;
  farmerType: FarmerType;
}): number {
  const tradingComponent = (args.tradingVolume / 1_000) * TRADING_POINTS_COEFFICIENT.value;
  const alpComponent = args.alpDeposit * (Math.max(1, args.alpHoldDays) / 7) * ALP_POINTS_COEFFICIENT.value;
  const guildComponent = getGuildPointsEstimate({
    guildQualified: args.guildQualified,
    guildWeeklyVolume: args.guildWeeklyVolume,
    weeklyTradingVolume: args.weeklyTradingVolume,
    farmerType: args.farmerType,
  });
  const referralComponent = args.referralRate > 0.1 ? Math.sqrt(args.referralRate * 10_000) : 0;
  const typeMultiplier = getTypeMultiplier(args.farmerType);
  return roundPublic((tradingComponent + alpComponent + guildComponent + referralComponent) * typeMultiplier);
}

function getGuildPointsEstimate(args: {
  guildQualified: boolean;
  guildWeeklyVolume: number;
  weeklyTradingVolume: number;
  farmerType: FarmerType;
}): number {
  if (!args.guildQualified || args.guildWeeklyVolume <= 0) return 0;

  const bucket = getTeamRankBucket(args.guildWeeklyVolume);
  const teamPoints = bucket.teamPoints;

  if (args.farmerType === "captain") {
    return teamPoints * bucket.captainRatio;
  }

  const memberPool = teamPoints * (1 - bucket.captainRatio);
  const personalShare = Math.min(1, clampNonNegative(args.weeklyTradingVolume) / args.guildWeeklyVolume);
  return memberPool * personalShare;
}

function getTeamRankBucket(guildWeeklyVolume: number): { teamPoints: number; captainRatio: number } {
  if (guildWeeklyVolume >= 20_000_000) {
    return { teamPoints: RECENT_TEAM_POOL_POINTS * TEAM_SLOT_RATIO, captainRatio: 0.09 };
  }
  if (guildWeeklyVolume >= 1_000_000) {
    return { teamPoints: (RECENT_TEAM_POOL_POINTS * TEAM_SLOT_RATIO) / 3, captainRatio: 0.07 };
  }
  if (guildWeeklyVolume >= 100_000) {
    return { teamPoints: (RECENT_TEAM_POOL_POINTS * TEAM_SLOT_RATIO) / 6, captainRatio: 0.06 };
  }
  if (guildWeeklyVolume >= 50_000) {
    return { teamPoints: (RECENT_TEAM_POOL_POINTS * TEAM_SLOT_RATIO) / 10, captainRatio: 0.05 };
  }
  return { teamPoints: (RECENT_TEAM_POOL_POINTS * TEAM_SLOT_RATIO) / 30, captainRatio: 0.06 };
}

function getTypeMultiplier(type: FarmerType): number {
  if (type === "lp") return 1.05;
  if (type === "captain") return 1.12;
  if (type === "power") return 1.18;
  return 1;
}

function roundPublic(value: number): number {
  if (value >= 100) return Math.round(value / 10) * 10;
  return Math.round(value);
}

function getNextActions(inputs: FarmInputs, guildStatus: GuildStatus): string[] {
  if (inputs.joinsGuild && !guildStatus.qualified) {
    if (guildStatus.membersNeeded > 0) {
      return [`Recruit ${guildStatus.membersNeeded} more active guild members before weekly settlement.`];
    }
    return [`Add ${formatUsd(guildStatus.volumeNeeded)} more guild volume before weekly settlement.`];
  }
  if (inputs.alpDeposit > 0 && inputs.alpHoldDays < 7) {
    return ["Keep ALP deposited through the weekly settlement window to strengthen the LP path."];
  }
  if (inputs.weeklyTradingVolume <= 0 && inputs.alpDeposit <= 0) {
    return ["Start with one path: trade manually, deposit into ALP, or join an active guild."];
  }
  if (inputs.weeklyTradingVolume > 0 && inputs.alpDeposit <= 0) {
    return ["Consider adding ALP if you want to stack trading and liquidity participation."];
  }
  return ["Keep behavior genuine, diversified, and consistent through weekly settlement."];
}

function getProfileLabel(type: FarmerType): string {
  const labels: Record<FarmerType, string> = {
    small: "Small Farmer",
    lp: "LP Farmer",
    captain: "Guild Captain",
    power: "Power Farmer",
  };
  return labels[type];
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function clampPercent(value: number): number {
  return Math.min(100, clampNonNegative(value));
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}
