// || श्री ||

/**
 * ChouFasmanPredictor — Probabilistic Secondary Structure & Prion Beta-Sheet Predictor
 * arbudadhā Project — Prion Protein Secondary Structure Visualizer
 *
 * Implements the empirical Chou-Fasman algorithm based on statistical conformational
 * propensities P(a), P(b), and P(turn). Identifies amyloidogenic beta-sheet nucleation zones.
 */

class ChouFasmanPredictor {
  // Statistical conformational parameters P(a), P(b), P(turn) from Chou & Fasman empirical database
  static PROPENSITIES = {
    A: { pa: 142, pb: 83,  pturn: 66  }, // Alanine (strong helix former)
    C: { pa: 70,  pb: 119, pturn: 119 }, // Cysteine (sheet former)
    D: { pa: 101, pb: 54,  pturn: 146 }, // Aspartate (turn former)
    E: { pa: 151, pb: 37,  pturn: 74  }, // Glutamate (strong helix former)
    F: { pa: 113, pb: 138, pturn: 60  }, // Phenylalanine (sheet former)
    G: { pa: 57,  pb: 75,  pturn: 156 }, // Glycine (helix breaker, turn former)
    H: { pa: 100, pb: 87,  pturn: 95  }, // Histidine
    I: { pa: 108, pb: 160, pturn: 47  }, // Isoleucine (strong sheet former)
    K: { pa: 116, pb: 74,  pturn: 101 }, // Lysine
    L: { pa: 121, pb: 130, pturn: 59  }, // Leucine (helix and sheet former)
    M: { pa: 145, pb: 105, pturn: 60  }, // Methionine (helix former)
    N: { pa: 67,  pb: 89,  pturn: 156 }, // Asparagine (turn former)
    P: { pa: 57,  pb: 55,  pturn: 152 }, // Proline (strong helix breaker, turn former)
    Q: { pa: 111, pb: 110, pturn: 98  }, // Glutamine
    R: { pa: 98,  pb: 93,  pturn: 95  }, // Arginine
    S: { pa: 77,  pb: 75,  pturn: 143 }, // Serine (turn former)
    T: { pa: 83,  pb: 119, pturn: 96  }, // Threonine (sheet former)
    V: { pa: 106, pb: 170, pturn: 50  }, // Valine (strongest sheet former)
    W: { pa: 108, pb: 137, pturn: 96  }, // Tryptophan (sheet former)
    Y: { pa: 69,  pb: 147, pturn: 114 }, // Tyrosine (sheet former)
    X: { pa: 100, pb: 100, pturn: 100 }  // Ambiguous residue
  };

  // Kyte-Doolittle Hydrophobicity Scale (Hydropathy index from -4.5 to +4.5)
  static KYTE_DOOLITTLE = {
    I: 4.5, V: 4.2, L: 3.8, F: 2.8, C: 2.5,
    M: 1.9, A: 1.8, G: -0.4, T: -0.7, S: -0.8,
    W: -0.9, Y: -1.3, P: -1.6, H: -3.2, E: -3.5,
    Q: -3.5, D: -3.5, N: -3.5, K: -3.9, R: -4.5,
    X: 0.0
  };

  /**
   * Predict secondary structure profile and dual-track aggregation for a sequence of residues
   * @param {Array<{index: number, code: string}>|string} sequence
   * @param {Object} [options]
   * @param {number} [options.windowSize=5]
   * @returns {Object} Prediction analysis with per-residue calls, stats, and prion risk
   */
  static predict(sequence, options = {}) {
    const windowSize = options.windowSize || 5;
    const halfWindow = Math.floor(windowSize / 2);

    // Normalize input
    let residueCodes = [];
    if (typeof sequence === 'string') {
      residueCodes = sequence.toUpperCase().replace(/[^A-Z]/g, '').split('');
    } else if (Array.isArray(sequence)) {
      residueCodes = sequence.map(r => (typeof r === 'string' ? r : r.code).toUpperCase());
    }

    const n = residueCodes.length;
    if (n === 0) {
      throw new Error('PredictorError: Sequence must not be empty');
    }

    // Step 1: Extract individual propensities and hydropathy
    const rawScores = residueCodes.map(code => {
      const prop = this.PROPENSITIES[code] || this.PROPENSITIES.X;
      const hydro = this.KYTE_DOOLITTLE[code] !== undefined ? this.KYTE_DOOLITTLE[code] : 0.0;
      return { pa: prop.pa, pb: prop.pb, pturn: prop.pturn, hydro };
    });

    // Step 2: Calculate smoothed sliding window averages
    const smoothed = [];
    for (let i = 0; i < n; i++) {
      let sumPa = 0;
      let sumPb = 0;
      let sumPt = 0;
      let sumHydro = 0;
      let count = 0;

      for (let w = -halfWindow; w <= halfWindow; w++) {
        const idx = i + w;
        if (idx >= 0 && idx < n) {
          sumPa += rawScores[idx].pa;
          sumPb += rawScores[idx].pb;
          sumPt += rawScores[idx].pturn;
          sumHydro += rawScores[idx].hydro;
          count++;
        }
      }

      smoothed.push({
        avgPa: sumPa / count,
        avgPb: sumPb / count,
        avgPt: sumPt / count,
        avgHydro: sumHydro / count
      });
    }

    // Step 3: Determine structure state, confidence margin, and dual-track agreement
    const predictions = [];
    let alphaCount = 0;
    let betaCount = 0;
    let gammaCount = 0;
    let coilCount = 0;

    for (let i = 0; i < n; i++) {
      const { avgPa, avgPb, avgPt, avgHydro } = smoothed[i];
      const code = residueCodes[i];

      let structure = 'COIL';
      let confidence = 0.50;

      // Decision boundaries
      const totalScore = avgPa + avgPb + avgPt;
      const sortedProps = [avgPa, avgPb, avgPt].sort((a, b) => b - a);
      const margin = parseFloat((sortedProps[0] - sortedProps[1]).toFixed(1));

      if (avgPb >= 105 && avgPb > avgPa) {
        structure = 'BETA';
        confidence = Math.min(0.98, Math.max(0.55, avgPb / (avgPa + avgPb)));
        betaCount++;
      } else if (avgPa >= 103 && avgPa >= avgPb) {
        structure = 'ALPHA';
        confidence = Math.min(0.98, Math.max(0.55, avgPa / (avgPa + avgPb)));
        alphaCount++;
      } else if (avgPt >= 115 && avgPt > avgPa && avgPt > avgPb) {
        structure = 'GAMMA';
        confidence = Math.min(0.95, Math.max(0.50, (avgPt / totalScore) * 2.5));
        gammaCount++;
      } else {
        structure = 'COIL';
        confidence = 0.70;
        coilCount++;
      }

      // Dual-track evaluation: Is this residue both Beta-prone and Hydrophobic?
      // (Steric-zipper nucleation characteristic)
      const isHydrophobic = avgHydro >= 1.0;
      const isDualTrackHotspot = structure === 'BETA' && isHydrophobic;

      predictions.push({
        index: i + 1,
        code,
        structure,
        confidence: parseFloat(confidence.toFixed(2)),
        margin,
        hydrophobicity: parseFloat(avgHydro.toFixed(2)),
        isDualTrackHotspot,
        scores: {
          pa: Math.round(avgPa),
          pb: Math.round(avgPb),
          pturn: Math.round(avgPt)
        }
      });
    }

    // Step 4: Identify continuous Beta-Sheet Nucleation clusters (Amyloid Danger Zones)
    const betaClusters = [];
    let currentCluster = null;

    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i].structure === 'BETA') {
        if (!currentCluster) {
          currentCluster = { start: i + 1, end: i + 1, length: 1, sequence: predictions[i].code };
        } else {
          currentCluster.end = i + 1;
          currentCluster.length++;
          currentCluster.sequence += predictions[i].code;
        }
      } else {
        if (currentCluster) {
          if (currentCluster.length >= 3) {
            betaClusters.push(currentCluster);
          }
          currentCluster = null;
        }
      }
    }
    if (currentCluster && currentCluster.length >= 3) {
      betaClusters.push(currentCluster);
    }

    // Step 5: Prion Misfolding Risk Score
    const betaPercent = parseFloat(((betaCount / n) * 100).toFixed(1));
    const alphaPercent = parseFloat(((alphaCount / n) * 100).toFixed(1));
    const gammaPercent = parseFloat(((gammaCount / n) * 100).toFixed(1));
    const coilPercent = parseFloat(((coilCount / n) * 100).toFixed(1));

    let riskLevel = 'LOW';
    let riskDescription = 'Predominantly alpha-helical or flexible coil, typical of cellular PrPC isoform.';

    if (betaPercent > 35 || betaClusters.some(c => c.length >= 6)) {
      riskLevel = 'CRITICAL';
      riskDescription = 'High beta-sheet enrichment detected. Prone to steric-zipper amyloid aggregate formation (PrPSc phenotype).';
    } else if (betaPercent > 18 || betaClusters.length >= 2) {
      riskLevel = 'MODERATE';
      riskDescription = 'Elevated beta-strand propensity in key motifs. Susceptible to seeded conformational transition.';
    }

    return {
      length: n,
      predictions,
      statistics: {
        alphaPercent,
        betaPercent,
        gammaPercent,
        coilPercent
      },
      betaClusters,
      prionRisk: {
        level: riskLevel,
        score: Math.min(100, Math.round(betaPercent * 2.2 + betaClusters.length * 10)),
        description: riskDescription
      }
    };
  }
}

// Module export for Node.js test suites
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChouFasmanPredictor };
}

// Browser export
if (typeof window !== 'undefined') {
  window.ChouFasmanPredictor = ChouFasmanPredictor;
}
