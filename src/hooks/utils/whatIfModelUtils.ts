import type { GameLogEntry } from '../useCombinedRawData';
import type {
  ModelFeatures,
  TrainedModel,
  SimulatorConfiguration,
  PredictionResult,
  NearestMatch,
  PlayerModifier,
  CampType,
} from '../../types/whatIfSimulator';
import { getPlayerCampFromRole } from '../../utils/datasyncExport';
import { getWinnerCampFromGame } from '../../utils/gameUtils';
import { getEffectivePower } from '../../utils/roleUtils';
import { getPlayerId } from '../../utils/playerIdentification';

// ---- Feature Extraction ----

const FEATURE_NAMES: (keyof ModelFeatures)[] = [
  'playerCount', 'wolfCount', 'villageoisCount', 'soloCount',
  'wolfRatio', 'villageoisRatio', 'soloRatio',
  'hasTraitre', 'hasLouveteau', 'hasChasseur', 'hasAlchimiste',
  'hasAmoureux', 'hasProtecteur',
  'pureWolfCount', 'traitreCount', 'louveteuCount',
];

function featuresToArray(f: ModelFeatures): number[] {
  return FEATURE_NAMES.map(k => f[k]);
}

export function extractFeaturesFromGame(game: GameLogEntry): ModelFeatures {
  let pureWolfCount = 0;
  let traitreCount = 0;
  let louveteuCount = 0;
  let soloCount = 0;
  let villageoisCount = 0;
  let hasChasseur = 0;
  let hasAlchimiste = 0;
  let hasAmoureux = 0;
  let hasProtecteur = 0;

  for (const player of game.PlayerStats) {
    const camp = getPlayerCampFromRole(player.MainRoleInitial, { regroupWolfSubRoles: false, regroupVillagers: false }, player.Power);
    const power = getEffectivePower(player);

    if (camp === 'Loup') {
      pureWolfCount++;
    } else if (camp === 'Traître') {
      traitreCount++;
    } else if (camp === 'Louveteau') {
      louveteuCount++;
    } else if (
      camp === 'Villageois' || camp === 'Villageois Élite' ||
      camp === 'Chasseur' || camp === 'Alchimiste' ||
      camp === 'Protecteur' || camp === 'Disciple' ||
      camp === 'Guetteur' || camp === 'Purificateur'
    ) {
      villageoisCount++;
      if (power === 'Chasseur' || camp === 'Chasseur') hasChasseur = 1;
      if (power === 'Alchimiste' || camp === 'Alchimiste') hasAlchimiste = 1;
      if (power === 'Protecteur' || camp === 'Protecteur') hasProtecteur = 1;
    } else {
      soloCount++;
      if (camp === 'Amoureux' || player.MainRoleInitial === 'Amoureux' ||
          player.MainRoleInitial === 'Amoureux Loup' || player.MainRoleInitial === 'Amoureux Villageois') {
        hasAmoureux = 1;
      }
    }
  }

  const wolfCount = pureWolfCount + traitreCount + louveteuCount;
  const playerCount = game.PlayerStats.length;

  return {
    playerCount,
    wolfCount,
    villageoisCount,
    soloCount,
    wolfRatio: playerCount > 0 ? wolfCount / playerCount : 0,
    villageoisRatio: playerCount > 0 ? villageoisCount / playerCount : 0,
    soloRatio: playerCount > 0 ? soloCount / playerCount : 0,
    hasTraitre: traitreCount > 0 ? 1 : 0,
    hasLouveteau: louveteuCount > 0 ? 1 : 0,
    hasChasseur,
    hasAlchimiste,
    hasAmoureux,
    hasProtecteur,
    pureWolfCount,
    traitreCount,
    louveteuCount,
  };
}

export function extractFeaturesFromConfig(config: SimulatorConfiguration): ModelFeatures {
  let pureWolfCount = 0;
  let traitreCount = 0;
  let louveteuCount = 0;
  let villageoisCount = 0;
  let soloCount = 0;
  let hasChasseur = 0;
  let hasAlchimiste = 0;
  let hasAmoureux = 0;
  let hasProtecteur = 0;

  for (const slot of config.slots) {
    if (slot.camp === 'Loup') {
      if (slot.role === 'Traître') traitreCount++;
      else if (slot.role === 'Louveteau') louveteuCount++;
      else pureWolfCount++;
    } else if (slot.camp === 'Villageois') {
      villageoisCount++;
      if (slot.role === 'Chasseur') hasChasseur = 1;
      if (slot.role === 'Alchimiste') hasAlchimiste = 1;
      if (slot.role === 'Protecteur') hasProtecteur = 1;
    } else {
      soloCount++;
      if (slot.role === 'Amoureux') hasAmoureux = 1;
    }
  }

  const wolfCount = pureWolfCount + traitreCount + louveteuCount;
  const playerCount = config.playerCount;

  return {
    playerCount,
    wolfCount,
    villageoisCount,
    soloCount,
    wolfRatio: playerCount > 0 ? wolfCount / playerCount : 0,
    villageoisRatio: playerCount > 0 ? villageoisCount / playerCount : 0,
    soloRatio: playerCount > 0 ? soloCount / playerCount : 0,
    hasTraitre: traitreCount > 0 ? 1 : 0,
    hasLouveteau: louveteuCount > 0 ? 1 : 0,
    hasChasseur,
    hasAlchimiste,
    hasAmoureux,
    hasProtecteur,
    pureWolfCount,
    traitreCount,
    louveteuCount,
  };
}

function getOutcomeIndex(game: GameLogEntry): number {
  const winner = getWinnerCampFromGame(game);
  if (winner === 'Villageois') return 0;
  if (winner === 'Loup') return 1;
  return 2; // Solo
}

// ---- Normalization ----

function computeNormalization(featureMatrix: number[][]): { means: number[]; stds: number[] } {
  const n = featureMatrix.length;
  const d = featureMatrix[0].length;
  const means = new Array(d).fill(0);
  const stds = new Array(d).fill(0);

  for (let j = 0; j < d; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += featureMatrix[i][j];
    means[j] = sum / n;

    let variance = 0;
    for (let i = 0; i < n; i++) variance += (featureMatrix[i][j] - means[j]) ** 2;
    stds[j] = Math.sqrt(variance / n) || 1; // Avoid division by zero
  }

  return { means, stds };
}

function normalizeRow(row: number[], means: number[], stds: number[]): number[] {
  return row.map((v, i) => (v - means[i]) / stds[i]);
}

/**
 * Feature dampening weights applied AFTER z-score normalization.
 *
 * Role-specific binary features (indices 7-12: hasTraitre, hasLouveteau,
 * hasChasseur, hasAlchimiste, hasAmoureux, hasProtecteur) produce outsized
 * z-scores because they are sparse (0 in most games, 1 in a few).
 * A single toggle can swing the prediction by 30+ percentage points.
 *
 * Dampening these features by 0.25× ensures camp composition (player/wolf/
 * villageois/solo counts and ratios) drives the prediction, while role
 * presence acts as a mild second-order signal — matching user expectations.
 *
 * Must be applied identically during training AND prediction.
 */
const ROLE_FEATURE_START = 7;  // First role-specific feature index
const ROLE_FEATURE_DAMPENING = 0.25;

function applyFeatureDampening(normalized: number[]): number[] {
  return normalized.map((v, i) => i >= ROLE_FEATURE_START ? v * ROLE_FEATURE_DAMPENING : v);
}

// ---- Logistic Regression ----

function sigmoid(z: number): number {
  if (z > 500) return 1;
  if (z < -500) return 0;
  return 1 / (1 + Math.exp(-z));
}

function dotProduct(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * Train a one-vs-rest binary logistic regression for one class.
 * Uses gradient descent with L2 regularization.
 */
function trainBinaryLogistic(
  X: number[][], // normalized feature matrix
  y: number[],   // binary labels (0 or 1)
  learningRate: number,
  iterations: number,
  lambda: number  // L2 regularization
): number[] {
  const n = X.length;
  const d = X[0].length;
  const w = new Array(d + 1).fill(0); // +1 for bias

  for (let iter = 0; iter < iterations; iter++) {
    const grad = new Array(d + 1).fill(0);

    for (let i = 0; i < n; i++) {
      const z = dotProduct(w.slice(0, d), X[i]) + w[d];
      const p = sigmoid(z);
      const err = p - y[i];
      for (let j = 0; j < d; j++) {
        grad[j] += err * X[i][j];
      }
      grad[d] += err; // bias gradient
    }

    for (let j = 0; j < d; j++) {
      w[j] -= learningRate * (grad[j] / n + lambda * w[j]);
    }
    w[d] -= learningRate * (grad[d] / n); // no regularization on bias
  }

  return w;
}

/**
 * Train multinomial one-vs-rest logistic regression model
 */
export function trainModel(gameData: GameLogEntry[]): TrainedModel {
  if (gameData.length < 10) {
    // Return a uniform model when too little data
    const d = FEATURE_NAMES.length;
    return {
      villageoisWeights: new Array(d + 1).fill(0),
      loupWeights: new Array(d + 1).fill(0),
      soloWeights: new Array(d + 1).fill(0),
      featureMeans: new Array(d).fill(0),
      featureStds: new Array(d).fill(1),
      featureNames: FEATURE_NAMES as unknown as string[],
      trainingSize: 0,
      accuracy: 0,
    };
  }

  // Extract features and labels
  const features: number[][] = [];
  const labels: number[] = [];

  for (const game of gameData) {
    features.push(featuresToArray(extractFeaturesFromGame(game)));
    labels.push(getOutcomeIndex(game));
  }

  // Normalize features + dampen role-specific features
  const { means, stds } = computeNormalization(features);
  const normalizedFeatures = features.map(row => applyFeatureDampening(normalizeRow(row, means, stds)));

  // Create binary labels for each class
  const yVillageois = labels.map(l => l === 0 ? 1 : 0);
  const yLoup = labels.map(l => l === 1 ? 1 : 0);
  const ySolo = labels.map(l => l === 2 ? 1 : 0);

  // Train one-vs-rest classifiers
  const lr = 0.1;
  const iters = 300;
  const lambda = 0.01;

  const villageoisWeights = trainBinaryLogistic(normalizedFeatures, yVillageois, lr, iters, lambda);
  const loupWeights = trainBinaryLogistic(normalizedFeatures, yLoup, lr, iters, lambda);
  const soloWeights = trainBinaryLogistic(normalizedFeatures, ySolo, lr, iters, lambda);

  // Compute training accuracy
  let correct = 0;
  for (let i = 0; i < normalizedFeatures.length; i++) {
    const scores = [
      dotProduct(villageoisWeights.slice(0, -1), normalizedFeatures[i]) + villageoisWeights[villageoisWeights.length - 1],
      dotProduct(loupWeights.slice(0, -1), normalizedFeatures[i]) + loupWeights[loupWeights.length - 1],
      dotProduct(soloWeights.slice(0, -1), normalizedFeatures[i]) + soloWeights[soloWeights.length - 1],
    ];
    const predicted = scores.indexOf(Math.max(...scores));
    if (predicted === labels[i]) correct++;
  }

  return {
    villageoisWeights,
    loupWeights,
    soloWeights,
    featureMeans: means,
    featureStds: stds,
    featureNames: FEATURE_NAMES as unknown as string[],
    trainingSize: gameData.length,
    accuracy: correct / gameData.length,
  };
}

/**
 * Predict win probabilities for a given configuration
 */
export function predict(
  model: TrainedModel,
  config: SimulatorConfiguration,
): { villageoisProb: number; loupProb: number; soloProb: number } {
  const rawFeatures = featuresToArray(extractFeaturesFromConfig(config));
  const normalized = applyFeatureDampening(normalizeRow(rawFeatures, model.featureMeans, model.featureStds));
  const d = normalized.length;

  const logitV = dotProduct(model.villageoisWeights.slice(0, d), normalized) + model.villageoisWeights[d];
  const logitL = dotProduct(model.loupWeights.slice(0, d), normalized) + model.loupWeights[d];
  const logitS = dotProduct(model.soloWeights.slice(0, d), normalized) + model.soloWeights[d];

  // Softmax normalization
  const maxLogit = Math.max(logitV, logitL, logitS);
  const expV = Math.exp(logitV - maxLogit);
  const expL = Math.exp(logitL - maxLogit);
  const expS = Math.exp(logitS - maxLogit);
  const sum = expV + expL + expS;

  return {
    villageoisProb: expV / sum,
    loupProb: expL / sum,
    soloProb: expS / sum,
  };
}

// ---- Nearest Matches & Confidence ----

/**
 * Returns a mask (1 = include in distance, 0 = ignore) based on what the
 * config has actually specified.
 *
 * Camp-count features are always active (first 7).
 * Role-specific features are only active when at least one slot in that camp
 * has an explicit role assigned — meaning the user has expressed a preference.
 */
function computeFeatureMask(config: SimulatorConfiguration): number[] {
  const hasLoupRole = config.slots.some(s => s.camp === 'Loup' && s.role);
  const hasVillageoisRole = config.slots.some(s => s.camp === 'Villageois' && s.role);
  const hasSoloRole = config.slots.some(s => s.camp === 'Solo' && s.role);

  // FEATURE_NAMES order:
  // 0 playerCount, 1 wolfCount, 2 villageoisCount, 3 soloCount,
  // 4 wolfRatio, 5 villageoisRatio, 6 soloRatio,
  // 7 hasTraitre, 8 hasLouveteau,
  // 9 hasChasseur, 10 hasAlchimiste, 11 hasAmoureux, 12 hasProtecteur,
  // 13 pureWolfCount, 14 traitreCount, 15 louveteuCount
  return [
    1, 1, 1, 1, 1, 1, 1,          // always: camp counts + ratios
    hasLoupRole ? 1 : 0,           // hasTraitre
    hasLoupRole ? 1 : 0,           // hasLouveteau
    hasVillageoisRole ? 1 : 0,     // hasChasseur
    hasVillageoisRole ? 1 : 0,     // hasAlchimiste
    hasSoloRole ? 1 : 0,           // hasAmoureux
    hasVillageoisRole ? 1 : 0,     // hasProtecteur
    hasLoupRole ? 1 : 0,           // pureWolfCount
    hasLoupRole ? 1 : 0,           // traitreCount
    hasLoupRole ? 1 : 0,           // louveteuCount
  ];
}

function maskedDistance(a: number[], b: number[], mask: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += mask[i] * (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

/**
 * Adds a distance penalty for player/role mismatches.
 * - Slot has player+role  → player in game with matching role = 0,
 *                            player in game wrong role = 1.0,
 *                            player absent = 1.5
 * - Slot has player only  → player absent = 1.0, present = 0
 * Penalties are in the same scale as normalized z-score distances.
 */
function computePlayerMatchPenalty(config: SimulatorConfiguration, game: GameLogEntry): number {
  let penalty = 0;

  for (const slot of config.slots) {
    if (!slot.player) continue;

    const gamePlayer = game.PlayerStats.find(p => getPlayerId(p) === slot.player!.id);

    if (!gamePlayer) {
      // Player not in this game at all
      penalty += slot.role ? 1.5 : 1.0;
      continue;
    }

    if (slot.role) {
      const power = getEffectivePower(gamePlayer);
      const matchesRole =
        slot.role === power ||
        slot.role === gamePlayer.MainRoleInitial;

      if (!matchesRole) {
        penalty += 1.0;
      }
    }
  }

  return penalty;
}

export function findNearestMatches(
  config: SimulatorConfiguration,
  gameData: GameLogEntry[],
  model: TrainedModel,
  topN: number = 8,
): NearestMatch[] {
  const mask = computeFeatureMask(config);
  const targetFeatures = applyFeatureDampening(normalizeRow(
    featuresToArray(extractFeaturesFromConfig(config)),
    model.featureMeans,
    model.featureStds,
  ));

  const matches: { game: GameLogEntry; distance: number; features: ModelFeatures }[] = [];

  for (const game of gameData) {
    const gameFeatures = extractFeaturesFromGame(game);
    const normalized = applyFeatureDampening(normalizeRow(featuresToArray(gameFeatures), model.featureMeans, model.featureStds));
    const featureDist = maskedDistance(targetFeatures, normalized, mask);
    const playerPenalty = computePlayerMatchPenalty(config, game);
    matches.push({ game, distance: featureDist + playerPenalty, features: gameFeatures });
  }

  matches.sort((a, b) => {
    const distDiff = a.distance - b.distance;
    if (distDiff !== 0) return distDiff;
    // Tiebreak: most recent (highest numeric ID) first
    const idA = parseInt(a.game.DisplayedId, 10) || 0;
    const idB = parseInt(b.game.DisplayedId, 10) || 0;
    return idB - idA;
  });

  // Determine max distance among results for relative similarity scaling
  const maxDist = matches.length > 0 ? matches[matches.length - 1].distance : 5;
  const scale = maxDist > 0 ? maxDist : 5;

  return matches.slice(0, topN).map(m => ({
    gameId: m.game.Id,
    displayedId: m.game.DisplayedId,
    date: m.game.StartDate,
    playerCount: m.features.playerCount,
    wolfCount: m.features.wolfCount,
    villageoisCount: m.features.villageoisCount,
    soloCount: m.features.soloCount,
    winnerCamp: getWinnerCampFromGame(m.game),
    similarity: Math.max(0, 1 - m.distance / scale),
  }));
}

export function computeConfidence(
  config: SimulatorConfiguration,
  gameData: GameLogEntry[],
  model: TrainedModel,
): number {
  const mask = computeFeatureMask(config);
  const targetFeatures = applyFeatureDampening(normalizeRow(
    featuresToArray(extractFeaturesFromConfig(config)),
    model.featureMeans,
    model.featureStds,
  ));

  // Count games within a "close" radius in normalized feature space
  let closeCount = 0;
  const radius = 2.0; // threshold in normalized space

  for (const game of gameData) {
    const normalized = applyFeatureDampening(normalizeRow(
      featuresToArray(extractFeaturesFromGame(game)),
      model.featureMeans,
      model.featureStds,
    ));
    const dist = maskedDistance(targetFeatures, normalized, mask);
    if (dist < radius) closeCount++;
  }

  // Confidence: ratio of close games, capped at 1
  return Math.min(1, closeCount / 20);
}

// ---- Player-Specific Modifiers ----

export function computePlayerModifiers(
  config: SimulatorConfiguration,
  gameData: GameLogEntry[],
): PlayerModifier[] {
  const modifiers: PlayerModifier[] = [];
  const assignedPlayers = config.slots.filter(s => s.player);

  if (assignedPlayers.length === 0) return modifiers;

  // Compute average camp win rate
  const campWins: Record<string, { wins: number; total: number }> = {
    Villageois: { wins: 0, total: 0 },
    Loup: { wins: 0, total: 0 },
    Solo: { wins: 0, total: 0 },
  };

  for (const game of gameData) {
    for (const p of game.PlayerStats) {
      const camp = getPlayerCampFromRole(
        p.MainRoleInitial,
        { regroupWolfSubRoles: true },
        p.Power,
      );
      const mainCamp: CampType = camp === 'Loup' ? 'Loup' :
        camp === 'Villageois' ? 'Villageois' : 'Solo';

      campWins[mainCamp].total++;
      if (p.Victorious) campWins[mainCamp].wins++;
    }
  }

  const avgWinRate: Record<string, number> = {};
  for (const camp of Object.keys(campWins)) {
    const c = campWins[camp];
    avgWinRate[camp] = c.total > 0 ? c.wins / c.total : 0.5;
  }

  // Compute each assigned player's win rate for their camp
  for (const slot of assignedPlayers) {
    if (!slot.player) continue;

    let playerWins = 0;
    let playerGames = 0;

    for (const game of gameData) {
      for (const p of game.PlayerStats) {
        if (getPlayerId(p) !== slot.player.id) continue;

        const camp = getPlayerCampFromRole(
          p.MainRoleInitial,
          { regroupWolfSubRoles: true },
          p.Power,
        );
        const mainCamp: CampType = camp === 'Loup' ? 'Loup' :
          camp === 'Villageois' ? 'Villageois' : 'Solo';

        if (mainCamp === slot.camp) {
          playerGames++;
          if (p.Victorious) playerWins++;
        }
      }
    }

    if (playerGames >= 3) {
      const playerWinRate = playerWins / playerGames;
      const delta = playerWinRate - avgWinRate[slot.camp];
      modifiers.push({
        playerId: slot.player.id,
        playerName: slot.player.name,
        camp: slot.camp,
        winRateDelta: delta,
        gamesPlayed: playerGames,
      });
    }
  }

  return modifiers;
}

/**
 * Adjust base prediction with player-specific modifiers using Bayesian-style update
 */
export function adjustPredictionWithPlayers(
  basePrediction: { villageoisProb: number; loupProb: number; soloProb: number },
  modifiers: PlayerModifier[],
): { villageoisProb: number; loupProb: number; soloProb: number } {
  if (modifiers.length === 0) return basePrediction;

  let vAdj = basePrediction.villageoisProb;
  let lAdj = basePrediction.loupProb;
  let sAdj = basePrediction.soloProb;

  for (const mod of modifiers) {
    // Strength of adjustment is proportional to delta and diminishes with few games
    const weight = Math.min(mod.gamesPlayed / 30, 1) * 0.15; // max 15% shift per player
    const shift = mod.winRateDelta * weight;

    if (mod.camp === 'Villageois') {
      vAdj += shift;
    } else if (mod.camp === 'Loup') {
      lAdj += shift;
    } else {
      sAdj += shift;
    }
  }

  // Ensure non-negative and re-normalize
  vAdj = Math.max(0.01, vAdj);
  lAdj = Math.max(0.01, lAdj);
  sAdj = Math.max(0.01, sAdj);
  const total = vAdj + lAdj + sAdj;

  return {
    villageoisProb: vAdj / total,
    loupProb: lAdj / total,
    soloProb: sAdj / total,
  };
}

/**
 * Full prediction pipeline
 */
export function computePrediction(
  model: TrainedModel,
  config: SimulatorConfiguration,
  gameData: GameLogEntry[],
): PredictionResult {
  const basePrediction = predict(model, config);
  const modifiers = computePlayerModifiers(config, gameData);
  const adjusted = adjustPredictionWithPlayers(basePrediction, modifiers);
  const confidence = computeConfidence(config, gameData, model);
  const nearestMatches = findNearestMatches(config, gameData, model);

  return {
    villageoisWinProb: adjusted.villageoisProb,
    loupWinProb: adjusted.loupProb,
    soloWinProb: adjusted.soloProb,
    confidence,
    sampleSize: model.trainingSize,
    nearestMatches,
  };
}
