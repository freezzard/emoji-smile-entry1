// One Emoji, One Smile — entry program.
//
// Quest: u-0xkianno-one-emoji-one-smile-5470751f
// The program runs a small local tournament over a shortlist of emoji
// candidates, scores every candidate against the judge brief published in
// RULES.txt, plays a full round robin between the candidates, and writes the
// champion — exactly one emoji, nothing more — to /output/entry.txt.
//
// Judge brief, in the order the judge weighs it:
//   1. Warmth at first glance: kind, friendly, gently funny, no context needed.
//   2. Universality: any age or background reads it the same way.
//   3. Chosen rather than default: picked for the moment, not the first
//      smiley that comes to mind, while staying instantly readable.
//   4. Right for a stranger: no intimacy, sarcasm or flirtation that would
//      read oddly coming from someone unknown.
//
// The tournament mirrors that order with weights: warmth 0.40,
// universality 0.25, chosen 0.20, stranger-safe 0.15. Every candidate is
// scored out of 10 on each axis, then the round robin decides the champion
// by games won, with the weighted total as the tie-break. Ranking tie-breaks
// follow the judge's criterion order: games, total, warmth axis alone.
// The run is deterministic: no clock, no randomness, no network, no
// environment input. A second in-process tournament run must agree with the
// first, so a future edit that accidentally adds nondeterminism fails loudly
// here instead of shipping two different emojis to the grader's two runs.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUTPUT_PATH = "/output/entry.txt";

interface WarmthAxisScores {
  warmthAtFirstGlance: number;
  universality: number;
  chosenRatherThanDefault: number;
  rightForStranger: number;
}

interface SmileContender {
  glyph: string;
  label: string;
  scores: WarmthAxisScores;
  reasonWarmth: string;
  reasonUniversality: string;
  reasonChosen: string;
  reasonStranger: string;
}

interface TournamentStanding {
  contender: SmileContender;
  weightedTotal: number;
  gamesWon: number;
  gamesPlayed: number;
}

interface TournamentOutcome {
  ranked: Array<TournamentStanding>;
  champion: SmileContender;
  runnerUp: SmileContender;
}

const AXIS_WEIGHTS: WarmthAxisScores = {
  warmthAtFirstGlance: 0.4,
  universality: 0.25,
  chosenRatherThanDefault: 0.2,
  rightForStranger: 0.15,
};

const SMILE_SHORTLIST: Array<SmileContender> = [
  {
    glyph: "\u{1F60A}",
    label: "smiling face with smiling eyes",
    scores: { warmthAtFirstGlance: 9, universality: 10, chosenRatherThanDefault: 4, rightForStranger: 9 },
    reasonWarmth: "A soft closed-eye smile reads warm at once.",
    reasonUniversality: "Nearly every phone user knows this face.",
    reasonChosen: "It is the first smiley most people reach for.",
    reasonStranger: "Gentle and plain; nothing odd from a stranger.",
  },
  {
    glyph: "\u{1F642}",
    label: "slightly smiling face",
    scores: { warmthAtFirstGlance: 7, universality: 10, chosenRatherThanDefault: 5, rightForStranger: 10 },
    reasonWarmth: "Mild and polite, but the warmth is thin.",
    reasonUniversality: "Universally readable as a small smile.",
    reasonChosen: "A safe default, not a deliberate pick.",
    reasonStranger: "Perfectly neutral coming from a stranger.",
  },
  {
    glyph: "\u{1F604}",
    label: "grinning face with smiling eyes",
    scores: { warmthAtFirstGlance: 9, universality: 9, chosenRatherThanDefault: 5, rightForStranger: 9 },
    reasonWarmth: "An open grin is joyful and catching.",
    reasonUniversality: "A big smile travels across cultures.",
    reasonChosen: "Common and cheerful, still a default grin.",
    reasonStranger: "Friendly; the grin can read loud, never rude.",
  },
  {
    glyph: "\u{1F917}",
    label: "hugging face",
    scores: { warmthAtFirstGlance: 10, universality: 9, chosenRatherThanDefault: 9, rightForStranger: 9 },
    reasonWarmth: "Open arms offer a hug; the gesture itself is warmth.",
    reasonUniversality: "A hug is understood in every culture.",
    reasonChosen: "Deliberate and distinctive, far from the first smiley.",
    reasonStranger: "A hug offered as a glyph is friendly, never intimate.",
  },
  {
    glyph: "\u{1FAF6}",
    label: "heart hands",
    scores: { warmthAtFirstGlance: 9, universality: 8, chosenRatherThanDefault: 9, rightForStranger: 8 },
    reasonWarmth: "Two hands shaping a heart is a warm little gift.",
    reasonUniversality: "The heart-hands gesture is widely known now.",
    reasonChosen: "A clear deliberate pick, not a default face.",
    reasonStranger: "Warm, though a heart from a stranger can feel forward.",
  },
  {
    glyph: "\u{1F970}",
    label: "smiling face with hearts",
    scores: { warmthAtFirstGlance: 10, universality: 8, chosenRatherThanDefault: 8, rightForStranger: 5 },
    reasonWarmth: "Hearts around a smile are about as warm as it gets.",
    reasonUniversality: "Hearts mean affection almost everywhere.",
    reasonChosen: "A thoughtful pick beyond the plain smile.",
    reasonStranger: "Hearts from an unknown sender read as affectionate.",
  },
  {
    glyph: "\u{1F31E}",
    label: "sun with face",
    scores: { warmthAtFirstGlance: 8, universality: 9, chosenRatherThanDefault: 8, rightForStranger: 9 },
    reasonWarmth: "A sunny face feels like a bright morning greeting.",
    reasonUniversality: "Sunshine is a shared, cheerful image.",
    reasonChosen: "A sunny pick, not the usual smiley face.",
    reasonStranger: "Cheerful with no hint of intimacy.",
  },
  {
    glyph: "\u{1F33B}",
    label: "sunflower",
    scores: { warmthAtFirstGlance: 7, universality: 9, chosenRatherThanDefault: 9, rightForStranger: 9 },
    reasonWarmth: "A sunflower is bright, but it smiles by metaphor only.",
    reasonUniversality: "Flowers read as friendly in most places.",
    reasonChosen: "A distinctive, memorable pick.",
    reasonStranger: "A flower is a safe gift from a stranger.",
  },
];

function weightedWarmthTotal(candidate: SmileContender): number {
  const warmthPart = candidate.scores.warmthAtFirstGlance * AXIS_WEIGHTS.warmthAtFirstGlance;
  const universalPart = candidate.scores.universality * AXIS_WEIGHTS.universality;
  const chosenPart = candidate.scores.chosenRatherThanDefault * AXIS_WEIGHTS.chosenRatherThanDefault;
  const strangerPart = candidate.scores.rightForStranger * AXIS_WEIGHTS.rightForStranger;
  const rawTotal = warmthPart + universalPart + chosenPart + strangerPart;
  const roundedTotal = Math.round(rawTotal * 100) / 100;
  return roundedTotal;
}

function buildStandings(shortlist: Array<SmileContender>): Array<TournamentStanding> {
  const standings: Array<TournamentStanding> = shortlist.map((candidate) => {
    const standing: TournamentStanding = {
      contender: candidate,
      weightedTotal: weightedWarmthTotal(candidate),
      gamesWon: 0,
      gamesPlayed: 0,
    };
    return standing;
  });
  return standings;
}

function playRoundRobin(standings: Array<TournamentStanding>): void {
  for (let homeIndex = 0; homeIndex < standings.length; homeIndex = homeIndex + 1) {
    for (let awayIndex = homeIndex + 1; awayIndex < standings.length; awayIndex = awayIndex + 1) {
      const homeStanding = standings[homeIndex];
      const awayStanding = standings[awayIndex];
      homeStanding.gamesPlayed = homeStanding.gamesPlayed + 1;
      awayStanding.gamesPlayed = awayStanding.gamesPlayed + 1;
      const homeLeads = homeStanding.weightedTotal > awayStanding.weightedTotal;
      const awayLeads = awayStanding.weightedTotal > homeStanding.weightedTotal;
      if (homeLeads) {
        homeStanding.gamesWon = homeStanding.gamesWon + 1;
      }
      if (awayLeads) {
        awayStanding.gamesWon = awayStanding.gamesWon + 1;
      }
    }
  }
}

function rankStandings(standings: Array<TournamentStanding>): Array<TournamentStanding> {
  const ranked = [...standings];
  ranked.sort((firstStanding, secondStanding) => {
    const gamesGap = secondStanding.gamesWon - firstStanding.gamesWon;
    if (gamesGap !== 0) {
      return gamesGap;
    }
    const totalGap = secondStanding.weightedTotal - firstStanding.weightedTotal;
    if (totalGap !== 0) {
      return totalGap;
    }
    const warmthGap =
      secondStanding.contender.scores.warmthAtFirstGlance -
      firstStanding.contender.scores.warmthAtFirstGlance;
    return warmthGap;
  });
  for (let rankedIndex = 0; rankedIndex + 1 < ranked.length; rankedIndex = rankedIndex + 1) {
    const upperStanding = ranked[rankedIndex];
    const lowerStanding = ranked[rankedIndex + 1];
    const neighboursTied =
      upperStanding.gamesWon === lowerStanding.gamesWon &&
      upperStanding.weightedTotal === lowerStanding.weightedTotal;
    if (neighboursTied) {
      console.log(`Tie note: ${upperStanding.contender.glyph} and ${lowerStanding.contender.glyph} tie at ${upperStanding.weightedTotal.toFixed(2)} points and ${upperStanding.gamesWon} games; warmth axis settles the order.`);
    }
  }
  return ranked;
}

function auditClearChampion(ranked: Array<TournamentStanding>): void {
  const championStanding = ranked[0];
  const runnerUpStanding = ranked[1];
  const championLeadsOnGames = championStanding.gamesWon > runnerUpStanding.gamesWon;
  const championLeadsOnTotal = championStanding.weightedTotal > runnerUpStanding.weightedTotal;
  const championIsClear = championLeadsOnGames || championLeadsOnTotal;
  if (championIsClear === false) {
    throw new Error(`No clear champion: ${championStanding.contender.glyph} ties ${runnerUpStanding.contender.glyph} on games and total.`);
  }
  const championMargin = championStanding.weightedTotal - runnerUpStanding.weightedTotal;
  const headToHeadWon = championStanding.weightedTotal > runnerUpStanding.weightedTotal;
  const headToHeadWord = headToHeadWon ? "won" : "drew";
  console.log(`Champion audit: ${championStanding.contender.glyph} leads ${runnerUpStanding.contender.glyph} by ${championMargin.toFixed(2)} points and ${championStanding.gamesWon - runnerUpStanding.gamesWon} game(s), and ${headToHeadWord} the head-to-head game between them.`);
}

function logChampionReasons(champion: SmileContender): void {
  console.log(`Why ${champion.glyph} (${champion.label}) wins:`);
  console.log(`  Warmth: ${champion.reasonWarmth}`);
  console.log(`  Universality: ${champion.reasonUniversality}`);
  console.log(`  Chosen: ${champion.reasonChosen}`);
  console.log(`  Stranger-safe: ${champion.reasonStranger}`);
}

function runSingleTournament(): TournamentOutcome {
  const standings = buildStandings(SMILE_SHORTLIST);
  playRoundRobin(standings);
  const ranked = rankStandings(standings);
  auditClearChampion(ranked);
  const outcome: TournamentOutcome = {
    ranked: ranked,
    champion: ranked[0].contender,
    runnerUp: ranked[1].contender,
  };
  return outcome;
}

function runSmileTournament(): SmileContender {
  const firstOutcome = runSingleTournament();
  const secondOutcome = runSingleTournament();
  const championsAgree = firstOutcome.champion.glyph === secondOutcome.champion.glyph;
  const totalsAgree = firstOutcome.ranked[0].weightedTotal === secondOutcome.ranked[0].weightedTotal;
  const deterministicRun = championsAgree && totalsAgree;
  if (deterministicRun === false) {
    throw new Error("Tournament is not deterministic: two runs disagree on the champion.");
  }
  console.log("One Emoji, One Smile — local tournament board:");
  for (const standing of firstOutcome.ranked) {
    console.log(`${standing.contender.glyph} ${standing.contender.label}: total ${standing.weightedTotal.toFixed(2)}, games ${standing.gamesWon}/${standing.gamesPlayed}`);
  }
  console.log(`Champion: ${firstOutcome.champion.glyph} (${firstOutcome.champion.label}) total ${firstOutcome.ranked[0].weightedTotal.toFixed(2)} ahead of ${firstOutcome.runnerUp.glyph} (${firstOutcome.runnerUp.label}) total ${firstOutcome.ranked[1].weightedTotal.toFixed(2)}.`);
  console.log("Determinism check: two in-process runs agree on the champion.");
  logChampionReasons(firstOutcome.champion);
  return firstOutcome.champion;
}

function assertSingleEmojiGlyph(glyph: string): void {
  const graphemeSegmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  const segments = [...graphemeSegmenter.segment(glyph)];
  const segmentCount = segments.length;
  if (segmentCount !== 1) {
    throw new Error(`Champion must be exactly one grapheme cluster, got ${segmentCount}.`);
  }
  const pictographicPattern = /^\p{Extended_Pictographic}$/u;
  const matchesPictographic = pictographicPattern.test(glyph);
  if (matchesPictographic === false) {
    throw new Error("Champion must be a single pictographic emoji.");
  }
  const codePointCount = Array.from(glyph).length;
  if (codePointCount !== 1) {
    throw new Error(`Champion must be one code point, got ${codePointCount}.`);
  }
}

function assertSealedGateShape(writtenText: string): void {
  const characterCount = Array.from(writtenText).length;
  const withinGateLength = characterCount >= 1 && characterCount <= 8;
  if (withinGateLength === false) {
    throw new Error(`Gate shape: entry must be 1 to 8 characters, got ${characterCount}.`);
  }
  const trimmedLength = writtenText.trim().length;
  const hasNonWhitespace = trimmedLength > 0;
  if (hasNonWhitespace === false) {
    throw new Error("Gate shape: entry must not be only white space.");
  }
}

function writeChampionEntry(championGlyph: string): void {
  mkdirSync("/output", { recursive: true });
  writeFileSync(OUTPUT_PATH, championGlyph, "utf8");
}

function verifyWrittenEntry(expectedGlyph: string): void {
  const writtenText = readFileSync(OUTPUT_PATH, "utf8");
  const writtenMatches = writtenText === expectedGlyph;
  if (writtenMatches === false) {
    throw new Error("Written entry does not match the champion glyph.");
  }
  assertSingleEmojiGlyph(writtenText);
  assertSealedGateShape(writtenText);
}

function mainSmileEntry(): void {
  const champion = runSmileTournament();
  assertSingleEmojiGlyph(champion.glyph);
  try { writeChampionEntry(champion.glyph); } catch (caughtWriteError) {
    const writeMessage = caughtWriteError instanceof Error ? caughtWriteError.message : String(caughtWriteError);
    throw new Error(`Failed to write the champion entry: ${writeMessage}`);
  }
  try { verifyWrittenEntry(champion.glyph); } catch (caughtVerifyError) {
    const verifyMessage = caughtVerifyError instanceof Error ? caughtVerifyError.message : String(caughtVerifyError);
    throw new Error(`Written entry failed verification: ${verifyMessage}`);
  }
  console.log(`Wrote exactly one emoji to ${OUTPUT_PATH}: ${champion.glyph}`);
}

mainSmileEntry();
