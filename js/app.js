// || श्री ||

/**
 * Main Application Controller for arbudadhā (Research Edition)
 * Connects AAFParser, PDBParser, ChouFasmanPredictor, and PrionVisualizer3D
 */

document.addEventListener('DOMContentLoaded', () => {
  const aafInput = document.getElementById('aafInput');
  const btnParse = document.getElementById('btnParse');
  const btnLoadSample = document.getElementById('btnLoadSample');
  const btnPredict = document.getElementById('btnPredict');

  // Selectors
  const selSpecies = document.getElementById('selSpecies');
  const selMutation = document.getElementById('selMutation');

  // Mode Pills
  const modePills = document.querySelectorAll('.mode-pill');

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

  // Sequence Strip Elements
  const sequenceStrip = document.getElementById('sequenceStrip');
  const stripCountLabel = document.getElementById('stripCountLabel');

  // Export Buttons
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnExportJSON = document.getElementById('btnExportJSON');
  const btnExportAAF = document.getElementById('btnExportAAF');
  const btnExportPNG = document.getElementById('btnExportPNG');

  // Tooltip
  const tooltip = document.getElementById('residueTooltip');

  // Initialize 3D Visualizer
  const visualizer = new PrionVisualizer3D('viewport3D');

  let currentProteinModel = null;
  let currentPredictionAnalysis = null;

  // Species Presets Library
  const PRESETS = {
    human: `AAF 1.0

# Human Prion Protein (PrP) — UniProt P04156
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
53-60 COIL  1.00`,

    bovine: `AAF 1.0

# Bovine Prion Protein (PrP) — Mad Cow Disease / BSE
@chain A
@name Bovine Prion Protein (BSE)
@organism bovine
@type prion
@length 60

SEQ:
M K H V A G A A A A G A V V G G L G G Y M L G S A M S R P L
I H F G S D Y E D R Y Y R E N M H R Y P N Q V Y Y R P V D Q

BOND:
C23-C52  DISULFIDE

HINT:
1-6   COIL  1.00
7-14  ALPHA 0.89
15-22 BETA  0.96
23-26 GAMMA 0.80
27-36 BETA  0.90
37-52 ALPHA 0.93
53-60 COIL  1.00`,

    hamster: `AAF 1.0

# Syrian Golden Hamster PrP (Highly susceptible lab model)
@chain A
@name Syrian Hamster PrP
@organism hamster
@type prion
@length 60

SEQ:
M K H M A G A A A A G A V V G G L G G Y M L G S A M S R P M
M H F G N D W E D R Y Y R E N M N R Y P N Q V Y Y R P V D Q

BOND:
C23-C52  DISULFIDE

HINT:
1-6   COIL  1.00
7-14  ALPHA 0.90
15-22 BETA  0.95
23-26 GAMMA 0.82
27-36 BETA  0.89
37-52 ALPHA 0.94
53-60 COIL  1.00`,

    mouse: `AAF 1.0

# Mouse Prion Protein (Rodent Model)
@chain A
@name Mouse Prion Protein PrP
@organism mouse
@type prion
@length 60

SEQ:
M K H M A G A A A A G A V V G G L G G Y M L G S A M S R P M
I H F G N D W E D R Y Y R E N M Y R Y P N Q V Y Y R P V D Q

BOND:
C23-C52  DISULFIDE

HINT:
1-6   COIL  1.00
7-14  ALPHA 0.91
15-22 BETA  0.93
23-26 GAMMA 0.80
27-36 BETA  0.88
37-52 ALPHA 0.94
53-60 COIL  1.00`,

    pdb_1qlx: `TITLE    SOLUTION STRUCTURE OF HUMAN PRION PROTEIN (125-228)
HELIX    1   1 GLU A  144  TYR A  154  1
HELIX    2   2 ASP A  173  THR A  194  1
HELIX    3   3 GLU A  200  SER A  228  1
SHEET    1   A 2 MET A  129  TYR A  131  0
SHEET    2   A 2 VAL A  161  TYR A  163  0
SSBOND   1 CYS A  179    CYS A  214
ATOM      1  CA  LEU A 125      -8.210  12.430  -2.110  1.00 20.00           C
ATOM      2  CA  GLY A 126      -6.840  10.120  -1.450  1.00 20.00           C
ATOM      3  CA  GLY A 127      -4.900   8.230  -0.890  1.00 20.00           C
ATOM      4  CA  TYR A 128      -2.780   6.450  -0.120  1.00 20.00           C
ATOM      5  CA  MET A 129      -0.450   5.100   0.450  1.00 20.00           C
ATOM      6  CA  LEU A 130       1.890   4.230   1.230  1.00 20.00           C
ATOM      7  CA  GLY A 131       3.980   3.450   2.100  1.00 20.00           C
ATOM      8  CA  SER A 132       5.670   2.900   3.450  1.00 20.00           C
ATOM      9  CA  ALA A 133       7.450   2.100   4.890  1.00 20.00           C
ATOM     10  CA  MET A 134       9.120   1.890   6.340  1.00 20.00           C
ATOM     11  CA  SER A 135      10.890   1.450   7.980  1.00 20.00           C
ATOM     12  CA  ARG A 136      12.450   0.890   9.560  1.00 20.00           C
ATOM     13  CA  PRO A 137      13.890   0.450  11.230  1.00 20.00           C
ATOM     14  CA  ILE A 138      15.230   0.120  12.890  1.00 20.00           C
ATOM     15  CA  ILE A 139      16.450  -0.450  14.560  1.00 20.00           C
ATOM     16  CA  HIS A 140      17.230  -1.230  16.230  1.00 20.00           C
ATOM     17  CA  PHE A 141      17.890  -2.450  17.890  1.00 20.00           C
ATOM     18  CA  GLY A 142      18.230  -3.890  19.450  1.00 20.00           C
ATOM     19  CA  SER A 143      18.120  -5.340  20.890  1.00 20.00           C
ATOM     20  CA  ASP A 144      17.450  -6.780  22.120  1.00 20.00           C
ATOM     21  CA  TYR A 145      16.340  -8.120  23.120  1.00 20.00           C
ATOM     22  CA  GLU A 146      14.890  -9.230  23.890  1.00 20.00           C
ATOM     23  CA  ASP A 147      13.120 -10.120  24.230  1.00 20.00           C
ATOM     24  CA  ARG A 148      11.230 -10.780  24.120  1.00 20.00           C
ATOM     25  CA  TYR A 149       9.340 -11.120  23.560  1.00 20.00           C
ATOM     26  CA  TYR A 150       7.560 -11.120  22.560  1.00 20.00           C
ATOM     27  CA  ARG A 151       5.890 -10.780  21.230  1.00 20.00           C
ATOM     28  CA  GLU A 152       4.340 -10.120  19.560  1.00 20.00           C
ATOM     29  CA  ASN A 153       3.120  -9.120  17.670  1.00 20.00           C
ATOM     30  CA  MET A 154       2.120  -7.890  15.560  1.00 20.00           C
ATOM     31  CA  HIS A 155       1.450  -6.450  13.340  1.00 20.00           C
ATOM     32  CA  CYS A 179       5.230  -2.120  18.900  1.00 20.00           C
ATOM     33  CA  CYS A 214       7.120  -0.450  19.450  1.00 20.00           C
END`
  };

  // Setup hover tooltip callback
  visualizer.hoveredResidueCallback = (resData, clientX, clientY) => {
    if (!tooltip) return;
    if (resData) {
      tooltip.style.display = 'block';
      tooltip.style.left = `${clientX}px`;
      tooltip.style.top = `${clientY}px`;
      const dualTrackBadge = resData.isDualTrackHotspot
        ? `<div style="color:#f43f5e; font-weight:700;">🔥 Dual-Track Steric Zipper</div>`
        : '';

      tooltip.innerHTML = `
        <strong>Residue ${resData.index}: ${resData.code}</strong><br/>
        Structure: <span style="color:#38bdf8;">${resData.structure}</span> 
        (${Math.round((resData.confidence || 1.0) * 100)}% conf, margin: ${resData.margin || 0})<br/>
        Hydropathy: <span style="color:#f97316;">${resData.hydrophobicity || 0}</span>
        ${dualTrackBadge}
      `;

      // Highlight in sequence strip
      highlightStripChip(resData.index);
    } else {
      tooltip.style.display = 'none';
      highlightStripChip(null);
    }
  };

  // 1. Load Species Presets
  if (selSpecies) {
    selSpecies.addEventListener('change', () => {
      const val = selSpecies.value;
      if (val && PRESETS[val]) {
        aafInput.value = PRESETS[val];
        processContent(PRESETS[val]);
      }
    });
  }

  // 2. Mutation Simulator
  if (selMutation) {
    selMutation.addEventListener('change', () => {
      const mut = selMutation.value;
      if (!mut || !currentProteinModel) return;

      // Ensure base sequence is loaded
      let text = aafInput.value;
      if (!text.includes('SEQ:')) {
        text = PRESETS.human;
        aafInput.value = text;
      }

      // Apply mutation to current text
      if (mut === 'P102L') {
        // Change Proline to Leucine
        text = text.replace(/P\s+I/g, 'L I');
      } else if (mut === 'D178N') {
        // Change Aspartate to Asparagine
        text = text.replace(/D\s+Y\s+E/g, 'N Y E');
      } else if (mut === 'E200K') {
        // Change Glutamate to Lysine
        text = text.replace(/E\s+D\s+R/g, 'K D R');
      } else if (mut === 'M129V') {
        // Change Methionine to Valine
        text = text.replace(/M\s+L\s+G/g, 'V L G');
      } else if (mut === 'G127V') {
        // Change Glycine to Valine (Kuru immunity)
        text = text.replace(/G\s+L\s+G/g, 'V L G');
      }

      aafInput.value = text;
      processContent(text);
    });
  }

  // 3. Load Sample PrP
  if (btnLoadSample) {
    btnLoadSample.addEventListener('click', () => {
      aafInput.value = PRESETS.human;
      processContent(PRESETS.human);
    });
  }

  // 4. Parse & Visualize
  if (btnParse) {
    btnParse.addEventListener('click', () => {
      const text = aafInput.value.trim();
      if (!text) {
        alert('Please paste or load sequence content first.');
        return;
      }
      processContent(text);
    });
  }

  // 5. Predict Hotspots (Chou-Fasman + Kyte-Doolittle)
  if (btnPredict) {
    btnPredict.addEventListener('click', () => {
      if (!currentProteinModel || !currentProteinModel.residues) {
        alert('Please parse an .aaf or PDB file first.');
        return;
      }

      runPrediction();
    });
  }

  // 6. View Mode Pill Toggles
  modePills.forEach(pill => {
    pill.addEventListener('click', () => {
      modePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const mode = pill.dataset.mode;
      visualizer.setColorMode(mode);
    });
  });

  const btnFullscreen = document.getElementById('btnFullscreen');
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      const card = document.querySelector('.viewport-card');
      if (card) {
        card.classList.toggle('fullscreen-mode');
        const isFull = card.classList.contains('fullscreen-mode');
        btnFullscreen.textContent = isFull ? '✕ Exit' : '⛶ Fullscreen';
        setTimeout(() => visualizer.onWindowResize(), 50);
      }
    });
  }

  // 7. Research Export Suite
  if (btnExportCSV) {
    btnExportCSV.addEventListener('click', exportCSV);
  }
  if (btnExportJSON) {
    btnExportJSON.addEventListener('click', exportJSON);
  }
  if (btnExportAAF) {
    btnExportAAF.addEventListener('click', exportAAF);
  }
  if (btnExportPNG) {
    btnExportPNG.addEventListener('click', exportPNG);
  }

  function processContent(content) {
    try {
      if (content.startsWith('>') || content.startsWith(';')) {
        // FASTA Format
        currentProteinModel = FASTAParser.parse(content);
      } else if (content.startsWith('HEADER') || content.startsWith('TITLE') || content.startsWith('ATOM')) {
        // PDB File Format
        currentProteinModel = PDBParser.parse(content);
      } else {
        // AAF File Format
        currentProteinModel = AAFParser.parse(content);
      }

      runPrediction();
    } catch (err) {
      alert(err.message);
      console.error(err);
    }
  }

  function runPrediction() {
    currentPredictionAnalysis = ChouFasmanPredictor.predict(currentProteinModel.residues);

    // Apply predicted structures and annotations
    currentProteinModel.residues = currentProteinModel.residues.map((res, i) => {
      const pred = currentPredictionAnalysis.predictions[i];
      return {
        ...res,
        structure: pred.structure,
        confidence: pred.confidence,
        margin: pred.margin,
        hydrophobicity: pred.hydrophobicity,
        isDualTrackHotspot: pred.isDualTrackHotspot
      };
    });

    // Update Dashboard & Strip
    updateDashboard(currentPredictionAnalysis.statistics, currentPredictionAnalysis.prionRisk);
    renderSequenceStrip(currentProteinModel.residues);

    // Render in 3D
    visualizer.renderProtein(currentProteinModel);
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

  function renderSequenceStrip(residues) {
    if (!sequenceStrip) return;
    if (stripCountLabel) stripCountLabel.textContent = `${residues.length} Residues`;

    sequenceStrip.innerHTML = residues.map(r => {
      let chipClass = `chip-${r.structure ? r.structure.toLowerCase() : 'coil'}`;
      if (r.isDualTrackHotspot) chipClass += ' chip-hotspot';

      return `
        <div class="residue-chip ${chipClass}" data-index="${r.index}" title="Residue ${r.index}: ${r.code} (${r.structure})">
          <span>${r.code}</span>
          <span class="sub-idx">${r.index}</span>
        </div>
      `;
    }).join('');

    // Attach click and hover listeners to each chip
    const chips = sequenceStrip.querySelectorAll('.residue-chip');
    chips.forEach(chip => {
      const idx = parseInt(chip.dataset.index, 10);

      chip.addEventListener('mouseenter', () => {
        visualizer.highlightResidue(idx);
      });
      chip.addEventListener('mouseleave', () => {
        visualizer.highlightResidue(null);
      });
      chip.addEventListener('click', () => {
        visualizer.highlightResidue(idx);
      });
    });
  }

  function highlightStripChip(index) {
    if (!sequenceStrip) return;
    const chips = sequenceStrip.querySelectorAll('.residue-chip');
    chips.forEach(chip => {
      if (index !== null && parseInt(chip.dataset.index, 10) === index) {
        chip.classList.add('active');
        chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } else {
        chip.classList.remove('active');
      }
    });
  }

  // --- Export Utilities ---

  function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportCSV() {
    if (!currentProteinModel || !currentProteinModel.residues) {
      alert('No protein loaded to export.');
      return;
    }

    const headers = ['Index', 'Residue', 'Structure', 'Confidence', 'Margin', 'Kyte_Doolittle_Hydropathy', 'DualTrack_Hotspot'];
    const rows = currentProteinModel.residues.map(r => [
      r.index,
      r.code,
      r.structure || 'COIL',
      r.confidence || 1.0,
      r.margin || 0,
      r.hydrophobicity || 0,
      r.isDualTrackHotspot ? 'YES' : 'NO'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, `${currentProteinModel.name || 'protein'}_analysis.csv`, 'text/csv');
  }

  function exportJSON() {
    if (!currentProteinModel) {
      alert('No protein loaded to export.');
      return;
    }

    const exportData = {
      model: currentProteinModel,
      predictions: currentPredictionAnalysis
    };
    downloadFile(JSON.stringify(exportData, null, 2), `${currentProteinModel.name || 'protein'}_report.json`, 'application/json');
  }

  function exportAAF() {
    const text = aafInput.value.trim();
    if (!text) {
      alert('Text input is empty.');
      return;
    }
    downloadFile(text, 'prion_sequence.aaf', 'text/plain');
  }

  function exportPNG() {
    const dataUrl = visualizer.exportSnapshot();
    if (!dataUrl) {
      alert('Could not capture snapshot.');
      return;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'arbudadha_prion_3d.png';
    a.click();
  }

  // Keyboard Shortcuts: 1, 2, 3 for modes, R for camera reset
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) return;
    if (e.key === '1') {
      const p = document.getElementById('btnModeStructure');
      if (p) p.click();
    } else if (e.key === '2') {
      const p = document.getElementById('btnModeRisk');
      if (p) p.click();
    } else if (e.key === '3') {
      const p = document.getElementById('btnModeHydro');
      if (p) p.click();
    } else if (e.key === 'r' || e.key === 'R') {
      visualizer.resetCamera();
    }
  });

  // Auto-load human sample on initial startup
  if (btnLoadSample) {
    btnLoadSample.click();
  }
});
