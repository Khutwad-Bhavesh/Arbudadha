// || श्री ||

/**
 * Main Application Controller for arbudadhā
 * Connects AAFParser, ChouFasmanPredictor, and PrionVisualizer3D
 */

document.addEventListener('DOMContentLoaded', () => {
  const aafInput = document.getElementById('aafInput');
  const btnParse = document.getElementById('btnParse');
  const btnLoadSample = document.getElementById('btnLoadSample');
  const btnPredict = document.getElementById('btnPredict');

  // Stats Elements
  const statAlpha = document.getElementById('statAlpha');
  const statBeta = document.getElementById('statBeta');
  const statGamma = document.getElementById('statGamma');
  const statCoil = document.getElementById('statCoil');

  // Risk Elements
  const riskBadge = document.getElementById('riskBadge');
  const riskScoreVal = document.getElementById('riskScoreVal');
  const riskBarFill = document.getElementById('riskBarFill');
  const riskDesc = document.getElementById('riskDesc');

  // Tooltip
  const tooltip = document.getElementById('residueTooltip');

  // Initialize 3D Visualizer
  const visualizer = new PrionVisualizer3D('viewport3D');

  // Setup hover tooltip callback
  visualizer.hoveredResidueCallback = (resData, clientX, clientY) => {
    if (!tooltip) return;
    if (resData) {
      tooltip.style.display = 'block';
      tooltip.style.left = `${clientX}px`;
      tooltip.style.top = `${clientY}px`;
      tooltip.innerHTML = `
        <strong>Residue ${resData.index}: ${resData.code}</strong><br/>
        Structure: <span style="color:#38bdf8;">${resData.structure}</span> 
        (${Math.round((resData.confidence || 1.0) * 100)}% conf)
      `;
    } else {
      tooltip.style.display = 'none';
    }
  };

  let currentProteinModel = null;

  // 1. Load Sample PrP
  if (btnLoadSample) {
    btnLoadSample.addEventListener('click', async () => {
      try {
        const res = await fetch('./data/sample.aaf');
        if (!res.ok) throw new Error('File not accessible');
        const text = await res.json ? await res.text() : await res.text();
        aafInput.value = text;
        processAAF(text);
      } catch (err) {
        // Fallback embedded sample if running locally via file://
        const defaultSample = `AAF 1.0

# Human Prion Protein (PrP) — Sample AAF File
@chain A
@name Human Prion Protein PrP
@organism human
@type prion
@length 60

SEQ:
M K H M A G A A A A G A V V G G L G G Y M L G S A M S R P I
I H F G S D Y E D R Y Y R E N M H R Y P N Q V Y Y R P V D Q

BOND:
C23-C52  DISULFIDE

HINT:
1-6   COIL  1.00
7-14  ALPHA 0.91
15-22 BETA  0.94
23-26 GAMMA 0.81
27-36 BETA  0.88
37-52 ALPHA 0.95
53-60 COIL  1.00`;
        aafInput.value = defaultSample;
        processAAF(defaultSample);
      }
    });
  }

  // 2. Parse & Visualize
  if (btnParse) {
    btnParse.addEventListener('click', () => {
      const text = aafInput.value.trim();
      if (!text) {
        alert('Please paste or load an .aaf file first.');
        return;
      }
      processAAF(text);
    });
  }

  // 3. Probabilistic Predictor Trigger (Chou-Fasman)
  if (btnPredict) {
    btnPredict.addEventListener('click', () => {
      if (!currentProteinModel || !currentProteinModel.residues) {
        alert('Please parse an .aaf file first before predicting.');
        return;
      }

      // Run prediction directly on raw residue codes
      const analysis = ChouFasmanPredictor.predict(currentProteinModel.residues);

      // Apply predicted structures and confidences back to current model
      currentProteinModel.residues = currentProteinModel.residues.map((res, i) => {
        const pred = analysis.predictions[i];
        return {
          ...res,
          structure: pred.structure,
          confidence: pred.confidence
        };
      });

      // Update UI Stats & Risk
      updateDashboard(analysis.statistics, analysis.prionRisk);

      // Re-render in 3D
      visualizer.renderProtein(currentProteinModel);
    });
  }

  function processAAF(content) {
    try {
      currentProteinModel = AAFParser.parse(content);

      // Calculate initial stats from hints or run predictor
      const analysis = ChouFasmanPredictor.predict(currentProteinModel.residues);

      // Render 3D Model
      visualizer.renderProtein(currentProteinModel);

      // Update Dashboard
      updateDashboard(analysis.statistics, analysis.prionRisk);
    } catch (err) {
      alert(err.message);
      console.error(err);
    }
  }

  function updateDashboard(stats, risk) {
    if (statAlpha) statAlpha.textContent = `${stats.alphaPercent}%`;
    if (statBeta) statBeta.textContent = `${stats.betaPercent}%`;
    if (statGamma) statGamma.textContent = `${stats.gammaPercent}%`;
    if (statCoil) statCoil.textContent = `${stats.coilPercent}%`;

    if (riskBadge) {
      riskBadge.textContent = risk.level;
      riskBadge.className = `risk-badge ${risk.level}`;
    }
    if (riskScoreVal) riskScoreVal.textContent = `${risk.score} / 100`;
    if (riskBarFill) riskBarFill.style.width = `${risk.score}%`;
    if (riskDesc) riskDesc.textContent = risk.description;
  }

  // Auto-load sample on startup
  if (btnLoadSample) {
    btnLoadSample.click();
  }
});
