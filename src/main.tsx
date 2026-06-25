import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Calculator,
  CalendarDays,
  ExternalLink,
  Github,
  NotebookPen,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import {
  ALP_POINTS_COEFFICIENT,
  PRE_TGE_FARMING_ALLOCATION_ASSUMPTION,
  PUBLIC_ESTIMATION_NOTE,
  TOTAL_CAMPAIGN_POINTS,
  TRADING_POINTS_COEFFICIENT,
  calculateFarmPlan,
  type FarmerType,
  formatUsd,
  getProfilePreset,
  type ReturnEstimate,
} from "./calculator";
import "./styles.css";

const farmerTypes: Array<{ value: FarmerType; label: string; hint: string }> = [
  { value: "small", label: "Small Farmer", hint: "Light weekly volume" },
  { value: "lp", label: "LP Farmer", hint: "ALP-heavy farming" },
  { value: "captain", label: "Guild Captain", hint: "Lead qualified members" },
  { value: "power", label: "Power Farmer", hint: "High-activity farming" },
];

const journalEntries = [
  {
    date: "Jun 25, 2026",
    title: "Planner model published",
    body: "The first version of my AFX planner estimates points, costs, and scenario returns from historical settled data. I will update coefficients when new settlement data is available.",
  },
  {
    date: "Next update",
    title: "Weekly farming note",
    body: "Planned fields: trading volume, ALP exposure, guild status, fees, slippage, estimated points, what worked, and what I would change next week.",
  },
];
const socialLinks = {
  x: "https://x.com/farmer_notes",
  github: "https://github.com/farmer-notes",
};

function App() {
  const [farmerType, setFarmerType] = useState<FarmerType>("small");
  const [activePanel, setActivePanel] = useState<"calculator" | "formula">("calculator");
  const initialPreset = getProfilePreset("small");
  const [weeklyTradingVolume, setWeeklyTradingVolume] = useState(initialPreset.weeklyTradingVolume);
  const [alpDeposit, setAlpDeposit] = useState(initialPreset.alpDeposit);
  const [alpHoldDays, setAlpHoldDays] = useState(initialPreset.alpHoldDays);
  const [joinsGuild, setJoinsGuild] = useState(initialPreset.joinsGuild);
  const [guildActiveMembers, setGuildActiveMembers] = useState(initialPreset.guildActiveMembers);
  const [guildWeeklyVolume, setGuildWeeklyVolume] = useState(initialPreset.guildWeeklyVolume);
  const [referralNetworkVolume, setReferralNetworkVolume] = useState(initialPreset.referralNetworkVolume);
  const [benchmarkFdv, setBenchmarkFdv] = useState(60_000_000_000);
  const [tradingCostBps, setTradingCostBps] = useState(initialPreset.tradingCostBps);
  const [slippageCostBps, setSlippageCostBps] = useState(initialPreset.slippageCostBps);
  const [riskBufferBps, setRiskBufferBps] = useState(initialPreset.riskBufferBps);

  React.useEffect(() => {
    function syncPanelWithHash() {
      if (window.location.hash === "#formula") {
        setActivePanel("formula");
      }
      if (window.location.hash === "#planner") {
        setActivePanel("calculator");
      }
    }

    syncPanelWithHash();
    window.addEventListener("hashchange", syncPanelWithHash);
    return () => window.removeEventListener("hashchange", syncPanelWithHash);
  }, []);

  const result = useMemo(
    () =>
      calculateFarmPlan({
        weeklyTradingVolume,
        alpDeposit,
        alpHoldDays,
        joinsGuild,
        guildActiveMembers,
        guildWeeklyVolume,
        referralNetworkVolume,
        farmerType,
        benchmarkFdv,
        benchmarkReachPercent: 0.1,
        tradingCostBps,
        slippageCostBps,
        riskBufferBps,
      }),
    [
      alpDeposit,
      alpHoldDays,
      benchmarkFdv,
      farmerType,
      guildActiveMembers,
      guildWeeklyVolume,
      joinsGuild,
      referralNetworkVolume,
      riskBufferBps,
      slippageCostBps,
      tradingCostBps,
      weeklyTradingVolume,
    ],
  );
  const baseScenario =
    result.benchmarkScenarios.find((scenario) => scenario.reachPercent === 0.1) ?? result.benchmarkScenarios[0];
  const formulaPanel = (
    <section className="formula-panel" aria-label="Estimate formula">
      <div className="formula-context">
        <strong>Model context</strong>
        <p>
          AFX has not announced tokenomics or farmer allocation yet. I use Hyperliquid's public genesis farmer
          allocation as a temporary proxy, then replace it once AFX publishes official numbers.
        </p>
      </div>
      <div className="formula-equations" aria-label="Estimate formulas">
        <div>
          <span>Your Estimated Points</span>
          <code>
            round((V / 1,000 *{" "}
            <FormulaTerm label={TRADING_POINTS_COEFFICIENT.value} title="Estimated weekly coefficient from the previous settled week: points per $1k trading volume." />{" "}
            ) + (ALP * D / 7 *{" "}
            <FormulaTerm label={ALP_POINTS_COEFFICIENT.value} title="Estimated weekly coefficient from the previous settled week: points per $1 ALP deposit for a full-week hold." />{" "}
            ) + Guild Component + Referral Component)
          </code>
        </div>
        <div>
          <span>AFX Scenario Value</span>
          <code>Benchmark Value * AFX Reach %</code>
        </div>
        <div>
          <span>Value / Point</span>
          <code>
            Scenario Value *{" "}
            <FormulaTerm
              label={formatPercent(PRE_TGE_FARMING_ALLOCATION_ASSUMPTION * 100)}
              title="Farming scenario assumption: the share of the modeled AFX scenario value used to estimate rewards for pre-TGE points farmers. The default uses Hyperliquid's public genesis farmer allocation as a proxy because AFX tokenomics has not been announced."
            />{" "}
            /{" "}
            {TOTAL_CAMPAIGN_POINTS.toLocaleString()} Total Campaign Points
          </code>
        </div>
        <div>
          <span>Your Estimated Reward</span>
          <code>Your Estimated Points * Value / Point</code>
        </div>
        <div>
          <span>Your Net Return</span>
          <code>Your Estimated Reward - Farming Cost</code>
        </div>
        <div>
          <span>Your Return on Cost</span>
          <code>Your Net Return / Farming Cost</code>
        </div>
      </div>
      <div className="formula-steps">
        <div>
          <strong>Coefficient assumptions</strong>
          <p>
            <b>{TRADING_POINTS_COEFFICIENT.name}</b> = {TRADING_POINTS_COEFFICIENT.value}:{" "}
            {TRADING_POINTS_COEFFICIENT.unit}.
          </p>
          <p>
            <b>{ALP_POINTS_COEFFICIENT.name}</b> = {ALP_POINTS_COEFFICIENT.value}: {ALP_POINTS_COEFFICIENT.unit}.
          </p>
          <p>
            Recalibrated weekly from the previous settled week. Guild and referral components are estimates from public
            campaign behavior, not official settlement results.
          </p>
        </div>
        <div>
          <strong>Scenario assumptions</strong>
          <p>
            <b>Pre-TGE farmer reward scenario</b> ={" "}
            {formatPercent(PRE_TGE_FARMING_ALLOCATION_ASSUMPTION * 100)} proxy farmer allocation.
          </p>
          <p>
            <b>Estimated total points across three seasons</b> = {TOTAL_CAMPAIGN_POINTS.toLocaleString()}.
          </p>
          <p>
            <b>Benchmark market value</b> = {formatUsd(benchmarkFdv)}. A 0.1% reach scenario implies{" "}
            {formatUsd(benchmarkFdv * 0.001)} of AFX scenario value.
          </p>
          <p>
            AFX tokenomics has not been announced. This is a farmer reward forecast, not a commitment or official
            settlement result.
          </p>
        </div>
      </div>
    </section>
  );

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="brand-mark" href="#top" aria-label="Farmer Notes home">
          <NotebookPen size={20} />
          <span>Farmer Notes</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#log">Log</a>
          <a href="#planner">Planner</a>
          <a href="#formula">Formula</a>
          <a href={socialLinks.x} target="_blank" rel="noreferrer">
            X
          </a>
          <a href={socialLinks.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </header>

      <section className="hero">
        <div className="eyebrow">
          <Sparkles size={16} />
          Airdrop farming journal
        </div>
        <h1 id="top">Farmer Notes</h1>
        <p>
          A personal public log of my real airdrop farming experiments: assumptions, weekly costs, point estimates,
          mistakes, and lessons. The first notebook tracks AFX Season 1.
        </p>
        <div className="hero-actions">
          <a href="https://app.afx.xyz/points" target="_blank" rel="noreferrer">
            Open AFX Points <ExternalLink size={16} />
          </a>
          <a href="https://docs.afx.xyz/points/season-1" target="_blank" rel="noreferrer">
            Season 1 rules <ExternalLink size={16} />
          </a>
        </div>
      </section>

      <section className="journal-grid" id="log" aria-label="Farmer Notes journal">
        <article className="journal-card feature-note">
          <div className="panel-title">
            <BookOpen size={20} />
            Current notebook
          </div>
          <h2>AFX Season 1 Farming Log</h2>
          <p>
            I am tracking this campaign as a live farming case study. The calculator below is the working model I use to
            compare weekly trading volume, ALP exposure, guild readiness, and cost assumptions before settlement.
          </p>
          <div className="note-meta">
            <span>Mode: live farming</span>
            <span>Type: personal journal</span>
            <span>Scope: AFX Season 1</span>
          </div>
        </article>
        <article className="journal-card">
          <CalendarDays size={20} />
          <h3>This week's focus</h3>
          <p>Keep cost disciplined, estimate points from settled data, and avoid treating any scenario as guaranteed.</p>
        </article>
        <article className="journal-card">
          <TrendingUp size={20} />
          <h3>Review rhythm</h3>
          <p>Each update records points, costs, assumptions, and lessons I can compare after settlement.</p>
        </article>
      </section>

      <section className="stats-strip" aria-label="AFX Season 1 highlights">
        <Metric label="Notebook" value="AFX S1" />
        <Metric label="Current weekly pool" value="475,000" />
        <Metric label="Weekly team pool" value="~114,286" />
        <Metric label="Current week" value="Week 5" />
      </section>

      <section className="log-section" aria-label="Live farming log">
        <div className="section-heading compact">
          <span>Live notes</span>
          <h2>Farming Log</h2>
          <p>
            This log is written from my own farming process. Numbers here are observations or planning assumptions, not
            official AFX settlement data.
          </p>
        </div>
        <div className="log-list">
          {journalEntries.map((entry) => (
            <article className="log-entry" key={`${entry.date}-${entry.title}`}>
              <time>{entry.date}</time>
              <div>
                <h3>{entry.title}</h3>
                <p>{entry.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="section-heading" id="planner">
        <span>Working tool</span>
        <h2>AFX Farm Planner</h2>
        <p>
          This is my public planning model for estimating possible AFX Season 1 farming outcomes from historical settled
          data. It is not an official calculator or financial advice.
        </p>
        <p className="assumption-note">
          Until AFX publishes tokenomics, the default farmer allocation uses a Hyperliquid-style public genesis proxy.
          I will replace it when AFX releases official numbers.
        </p>
      </div>

      <div className="panel-tabs" role="tablist" aria-label="Planner panels" id="formula">
        <button
          aria-selected={activePanel === "calculator"}
          className={activePanel === "calculator" ? "tab-button active" : "tab-button"}
          onClick={() => selectPanel("calculator")}
          role="tab"
          type="button"
        >
          Calculator
        </button>
        <button
          aria-selected={activePanel === "formula"}
          className={activePanel === "formula" ? "tab-button active" : "tab-button"}
          onClick={() => selectPanel("formula")}
          role="tab"
          type="button"
        >
          Formula
        </button>
      </div>

      {activePanel === "formula" ? formulaPanel : <section className="planner-grid">
        <form className="panel input-panel">
          <div className="panel-title">
            <Calculator size={20} />
            Plan your farm
          </div>

          <div className="field-group">
            <label>Farmer profile</label>
            <div className="profile-grid">
              {farmerTypes.map((type) => (
                <button
                  className={farmerType === type.value ? "profile-card active" : "profile-card"}
                  key={type.value}
                  onClick={(event) => {
                    event.preventDefault();
                    applyProfilePreset(type.value);
                  }}
                  type="button"
                >
                  <strong>{type.label}</strong>
                  <span>{type.hint}</span>
                  <small>{getPresetSummary(type.value)}</small>
                </button>
              ))}
            </div>
          </div>

          <NumberField
            label="Expected weekly trading volume"
            prefix="$"
            value={weeklyTradingVolume}
            onChange={setWeeklyTradingVolume}
          />
          <NumberField label="ALP deposit" prefix="$" value={alpDeposit} onChange={setAlpDeposit} />
          <NumberField label="ALP hold days this week" value={alpHoldDays} onChange={setAlpHoldDays} max={7} />

          <label className="toggle-row">
            <input checked={joinsGuild} onChange={(event) => setJoinsGuild(event.target.checked)} type="checkbox" />
            <span>Joining or leading a guild</span>
          </label>

          <div className={joinsGuild ? "guild-fields" : "guild-fields muted"}>
            <NumberField
              label="Guild active members"
              value={guildActiveMembers}
              onChange={setGuildActiveMembers}
              disabled={!joinsGuild}
            />
            <NumberField
              label="Guild weekly volume"
              prefix="$"
              value={guildWeeklyVolume}
              onChange={setGuildWeeklyVolume}
              disabled={!joinsGuild}
            />
          </div>

          <NumberField
            label="Referral network cumulative volume"
            prefix="$"
            value={referralNetworkVolume}
            onChange={setReferralNetworkVolume}
          />

          <div className="assumption-block">
            <div className="panel-title">
              <TrendingUp size={20} />
              Cost assumptions
            </div>
            <div className="assumption-grid">
              <NumberField label="Fee cost" suffix="bps" value={tradingCostBps} onChange={setTradingCostBps} />
              <NumberField label="Slippage cost" suffix="bps" value={slippageCostBps} onChange={setSlippageCostBps} />
            </div>
            <div className="assumption-grid">
              <NumberField label="Risk buffer" suffix="bps" value={riskBufferBps} onChange={setRiskBufferBps} />
            </div>
            <details className="advanced-assumptions">
              <summary>Advanced benchmark</summary>
              <p>
                Farmer estimates are projected from historical settled data and planning assumptions. Hyperliquid is
                used only as a proxy reference while AFX tokenomics remain unpublished.
              </p>
              <NumberField
                label="Benchmark market value"
                prefix="$"
                value={benchmarkFdv}
                onChange={setBenchmarkFdv}
              />
            </details>
          </div>
        </form>

        <section className="panel output-panel" aria-live="polite">
          <div className="panel-title">
            <WalletCards size={20} />
            Your farming estimate
          </div>

          <div className="score-card">
            <span>{result.profileLabel}</span>
            <strong>{formatSignedUsd(baseScenario.estimate.netProfit)}</strong>
            <small>Net return estimate if AFX reaches 0.1% of the selected benchmark value</small>
          </div>

          <div className="benchmark-grid">
            {result.benchmarkScenarios.map((scenario) => (
              <ReturnCard
                key={scenario.reachPercent}
                label={`${scenario.reachPercent}% of benchmark`}
                estimate={scenario.estimate}
              />
            ))}
          </div>

          <div className="range-grid">
            <Metric label="Your estimated points" value={result.estimatedRewardUnits.toLocaleString()} />
            <Metric label="Your est. cost" value={formatUsd(baseScenario.estimate.estimatedCost)} />
            <Metric label="0.1% return on cost" value={formatPercent(baseScenario.estimate.roiPercent)} />
          </div>

          <div className="section-block">
            <h2>Your active farming paths</h2>
            <div className="chips">
              {result.eligiblePaths.length > 0 ? (
                result.eligiblePaths.map((path) => <span key={path}>{path}</span>)
              ) : (
                <span>Pick at least one farming path</span>
              )}
            </div>
          </div>

          <div className="section-block">
            <h2>Guild readiness</h2>
            <div className={result.guildStatus.qualified ? "status good" : "status warn"}>
              <Users size={18} />
              {result.guildStatus.qualified
                ? "Your guild appears qualified for team farming."
                : `${result.guildStatus.membersNeeded} members and ${formatUsd(
                    result.guildStatus.volumeNeeded,
                  )} weekly volume still needed.`}
            </div>
          </div>

          <div className="section-block">
            <h2>Next farming move</h2>
            <ul className="action-list">
              {result.nextActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>

          <div className="warning">
            <ShieldAlert size={18} />
            <p>
              {PUBLIC_ESTIMATION_NOTE} {result.disclaimer}
            </p>
          </div>
        </section>
      </section>}

      <footer className="site-footer">
        <div>
          <strong>Farmer Notes</strong>
          <p>Personal airdrop farming journal for notes, assumptions, costs, and lessons.</p>
        </div>
        <div className="footer-links" aria-label="Social links">
          <a href={socialLinks.x} target="_blank" rel="noreferrer">
            @farmer_notes <ExternalLink size={15} />
          </a>
          <a href={socialLinks.github} target="_blank" rel="noreferrer">
            <Github size={16} />
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );

  function applyProfilePreset(type: FarmerType) {
    const preset = getProfilePreset(type);
    setFarmerType(type);
    setWeeklyTradingVolume(preset.weeklyTradingVolume);
    setAlpDeposit(preset.alpDeposit);
    setAlpHoldDays(preset.alpHoldDays);
    setJoinsGuild(preset.joinsGuild);
    setGuildActiveMembers(preset.guildActiveMembers);
    setGuildWeeklyVolume(preset.guildWeeklyVolume);
    setReferralNetworkVolume(preset.referralNetworkVolume);
    setTradingCostBps(preset.tradingCostBps);
    setSlippageCostBps(preset.slippageCostBps);
    setRiskBufferBps(preset.riskBufferBps);
  }

  function selectPanel(panel: "calculator" | "formula") {
    setActivePanel(panel);
    window.history.replaceState(null, "", panel === "formula" ? "#formula" : "#planner");
  }
}

function getPresetSummary(type: FarmerType): string {
  const preset = getProfilePreset(type);
  const parts = [`${formatCompactUsd(preset.weeklyTradingVolume)} weekly volume`];
  if (preset.alpDeposit > 0) parts.push(`${formatCompactUsd(preset.alpDeposit)} ALP`);
  if (preset.joinsGuild) parts.push("guild on");
  return parts.join(" · ");
}

function Metric(props: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function ReturnCard(props: { label: string; estimate: ReturnEstimate }) {
  return (
    <div className="return-card">
      <span>{props.label}</span>
      <strong>{formatSignedUsd(props.estimate.netProfit)}</strong>
      <dl>
        <div>
          <dt>Estimated points</dt>
          <dd>{props.estimate.estimatedPoints.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Gross reward estimate</dt>
          <dd>{formatUsd(props.estimate.rewardValue)}</dd>
        </div>
        <div>
          <dt>Value / point</dt>
          <dd>{formatUsd(props.estimate.assumedValuePerPoint)}</dd>
        </div>
        <div>
          <dt>Farming cost</dt>
          <dd>{formatUsd(props.estimate.estimatedCost)}</dd>
        </div>
        <div>
          <dt>Net return</dt>
          <dd>{formatSignedUsd(props.estimate.netProfit)}</dd>
        </div>
        <div>
          <dt>Return on cost</dt>
          <dd>{formatPercent(props.estimate.roiPercent)}</dd>
        </div>
      </dl>
    </div>
  );
}

function FormulaTerm(props: { label: React.ReactNode; title: string }) {
  return (
    <span className="formula-term" title={props.title}>
      {props.label}
    </span>
  );
}

function NumberField(props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(() => String(props.value));

  React.useEffect(() => {
    setDraft(String(props.value));
  }, [props.value]);

  return (
    <label className={props.disabled ? "number-field disabled" : "number-field"}>
      <span>{props.label}</span>
      <div>
        {props.prefix ? <b>{props.prefix}</b> : null}
        <input
          disabled={props.disabled}
          max={props.max}
          min="0"
          onBlur={() => {
            const normalized = normalizeNumberInput(draft, props.max);
            setDraft(String(normalized));
            props.onChange(normalized);
          }}
          onChange={(event) => {
            const nextDraft = event.target.value;
            setDraft(nextDraft);
            props.onChange(normalizeNumberInput(nextDraft, props.max));
          }}
          step={props.step}
          type="number"
          value={draft}
        />
        {props.suffix ? <b>{props.suffix}</b> : null}
      </div>
    </label>
  );
}

function normalizeNumberInput(value: string, max?: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return typeof max === "number" ? Math.min(max, parsed) : parsed;
}

function formatSignedUsd(value: number): string {
  const absolute = formatUsd(Math.abs(value));
  return value < 0 ? `-${absolute}` : absolute;
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
}

function formatCompactUsd(value: number): string {
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
    notation: value >= 10_000 ? "compact" : "standard",
  })}`;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
