import { describe, expect, it } from "vitest";
import {
  BENCHMARK_REACH_PRESETS,
  ALP_POINTS_COEFFICIENT,
  PRE_TGE_FARMING_ALLOCATION_ASSUMPTION,
  PUBLIC_ESTIMATION_NOTE,
  TOTAL_CAMPAIGN_POINTS,
  TRADING_POINTS_COEFFICIENT,
  calculateFarmPlan,
  getProfilePreset,
} from "./calculator";

describe("calculateFarmPlan", () => {
  it("exposes the public formula assumptions used by the calculator", () => {
    expect(BENCHMARK_REACH_PRESETS).toEqual([0.1, 0.5, 1, 5, 10, 20]);
    expect(PRE_TGE_FARMING_ALLOCATION_ASSUMPTION).toBe(0.31);
    expect(TOTAL_CAMPAIGN_POINTS).toBe(10_000_000);
    expect(TRADING_POINTS_COEFFICIENT.value).toBe(2.3);
    expect(TRADING_POINTS_COEFFICIENT.updateCadence).toContain("weekly");
    expect(ALP_POINTS_COEFFICIENT.value).toBe(0.013);
    expect(ALP_POINTS_COEFFICIENT.updateCadence).toContain("weekly");
    expect(PUBLIC_ESTIMATION_NOTE).toContain("historical settled points data");
  });

  it("uses materially different default farming costs for each farmer profile preset", () => {
    const small = getProfilePreset("small");
    const lp = getProfilePreset("lp");
    const captain = getProfilePreset("captain");
    const power = getProfilePreset("power");

    expect(small.weeklyTradingVolume).toBeLessThan(captain.weeklyTradingVolume);
    expect(lp.alpDeposit).toBeGreaterThan(small.alpDeposit);
    expect(captain.joinsGuild).toBe(true);
    expect(captain.guildActiveMembers).toBeGreaterThan(small.guildActiveMembers);
    expect(power.weeklyTradingVolume).toBeGreaterThan(captain.weeklyTradingVolume);
    expect(power.alpDeposit).toBeGreaterThan(lp.alpDeposit);
  });

  it("uses trading execution cost and does not charge ALP risk cost", () => {
    const smallPreset = getProfilePreset("small");
    const powerPreset = getProfilePreset("power");

    const small = calculateFarmPlan({
      ...smallPreset,
      farmerType: "small",
      benchmarkFdv: 60_000_000_000,
      benchmarkReachPercent: 5,
    });
    const power = calculateFarmPlan({
      ...powerPreset,
      farmerType: "power",
      benchmarkFdv: 60_000_000_000,
      benchmarkReachPercent: 5,
    });

    expect(small.returns.base.estimatedCost).toBeCloseTo(5, 2);
    expect(power.returns.base.estimatedCost).toBeCloseTo(200, 2);
  });

  it("stacks trading, ALP, guild, and referral paths without promising final points", () => {
    const result = calculateFarmPlan({
      weeklyTradingVolume: 12_500,
      alpDeposit: 1_000,
      alpHoldDays: 7,
      joinsGuild: true,
      guildActiveMembers: 12,
      guildWeeklyVolume: 180_000,
      referralNetworkVolume: 60_000_000,
      farmerType: "power",
      benchmarkFdv: 60_000_000_000,
      benchmarkReachPercent: 0.5,
      tradingCostBps: 6,
      slippageCostBps: 4,
      riskBufferBps: 5,
    });

    expect(result.eligiblePaths).toEqual(["Trading", "ALP", "Guild", "Referral"]);
    expect(result.guildStatus.qualified).toBe(true);
    expect(result.referralRate).toBe(0.15);
    expect(result.score.conservative).toBeLessThan(result.score.base);
    expect(result.score.base).toBeLessThan(result.score.aggressive);
    expect(result.disclaimer).toContain("historical settled data");
  });

  it("estimates guild captain points from historical team rank buckets", () => {
    const result = calculateFarmPlan({
      weeklyTradingVolume: 50_000,
      alpDeposit: 0,
      alpHoldDays: 0,
      joinsGuild: true,
      guildActiveMembers: 12,
      guildWeeklyVolume: 150_000,
      referralNetworkVolume: 0,
      farmerType: "captain",
      benchmarkFdv: 60_000_000_000,
      benchmarkReachPercent: 0.5,
      tradingCostBps: 3,
      slippageCostBps: 7,
      riskBufferBps: 0,
    });

    expect(result.guildStatus.qualified).toBe(true);
    expect(result.estimatedRewardUnits).toBe(380);
  });

  it("estimates guild member points from member pool and personal volume share", () => {
    const result = calculateFarmPlan({
      weeklyTradingVolume: 10_000,
      alpDeposit: 0,
      alpHoldDays: 0,
      joinsGuild: true,
      guildActiveMembers: 12,
      guildWeeklyVolume: 150_000,
      referralNetworkVolume: 0,
      farmerType: "small",
      benchmarkFdv: 60_000_000_000,
      benchmarkReachPercent: 0.5,
      tradingCostBps: 3,
      slippageCostBps: 7,
      riskBufferBps: 0,
    });

    expect(result.guildStatus.qualified).toBe(true);
    expect(result.estimatedRewardUnits).toBe(260);
  });

  it("estimates scenario values from estimated points and farming costs", () => {
    const result = calculateFarmPlan({
      weeklyTradingVolume: 100_000,
      alpDeposit: 10_000,
      alpHoldDays: 7,
      joinsGuild: false,
      guildActiveMembers: 0,
      guildWeeklyVolume: 0,
      referralNetworkVolume: 0,
      farmerType: "lp",
      benchmarkFdv: 60_000_000_000,
      benchmarkReachPercent: 5,
      tradingCostBps: 5,
      slippageCostBps: 3,
      riskBufferBps: 5,
    });

    expect(result.estimatedRewardUnits).toBe(380);
    expect(result.benchmarkScenarios.map((scenario) => scenario.reachPercent)).toEqual([0.1, 0.5, 1, 5, 10, 20]);
    expect("airdropValue" in result.benchmarkScenarios[1].estimate).toBe(false);
    expect(result.benchmarkScenarios[1].estimate.estimatedPoints).toBe(380);
    expect(result.benchmarkScenarios[1].estimate.assumedValuePerPoint).toBeCloseTo(9.3, 2);
    expect(result.benchmarkScenarios[1].estimate.rewardValue).toBeCloseTo(3_534, 2);
    expect(result.benchmarkScenarios[1].estimate.estimatedCost).toBeCloseTo(130, 2);
    expect(result.benchmarkScenarios[1].estimate.netProfit).toBeCloseTo(3_404, 2);
    expect(result.benchmarkScenarios[1].estimate.roiPercent).toBeCloseTo(2618.46, 2);
    expect(result.benchmarkScenarios[0].estimate.netProfit).toBeLessThan(result.benchmarkScenarios[1].estimate.netProfit);
    expect(result.benchmarkScenarios[3].estimate.netProfit).toBeGreaterThan(result.benchmarkScenarios[2].estimate.netProfit);
  });

  it("shows the next action for a guild that is below the active-member threshold", () => {
    const result = calculateFarmPlan({
      weeklyTradingVolume: 2_000,
      alpDeposit: 0,
      alpHoldDays: 0,
      joinsGuild: true,
      guildActiveMembers: 6,
      guildWeeklyVolume: 12_000,
      referralNetworkVolume: 0,
      farmerType: "small",
      benchmarkFdv: 60_000_000_000,
      benchmarkReachPercent: 1,
      tradingCostBps: 6,
      slippageCostBps: 4,
      riskBufferBps: 5,
    });

    expect(result.eligiblePaths).toEqual(["Trading"]);
    expect(result.guildStatus.qualified).toBe(false);
    expect(result.guildStatus.membersNeeded).toBe(4);
    expect(result.nextActions[0]).toContain("Recruit 4 more active guild members");
  });

  it("recommends ALP when the user has deposit intent but no trading volume", () => {
    const result = calculateFarmPlan({
      weeklyTradingVolume: 0,
      alpDeposit: 500,
      alpHoldDays: 4,
      joinsGuild: false,
      guildActiveMembers: 0,
      guildWeeklyVolume: 0,
      referralNetworkVolume: 0,
      farmerType: "lp",
      benchmarkFdv: 60_000_000_000,
      benchmarkReachPercent: 1,
      tradingCostBps: 0,
      slippageCostBps: 0,
      riskBufferBps: 0,
    });

    expect(result.eligiblePaths).toEqual(["ALP"]);
    expect(result.score.base).toBeGreaterThan(0);
    expect(result.nextActions[0]).toContain("Keep ALP deposited");
  });
});
