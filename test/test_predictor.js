// || श्री ||

const { ChouFasmanPredictor } = require('../js/predictor');
const { AAFParser } = require('../js/parser');
const fs = require('fs');
const path = require('path');

function runTests() {
  console.log('🧪 Testing ChouFasmanPredictor...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  // Test 1: Empty input check
  try {
    ChouFasmanPredictor.predict('');
    assert(false, "Should throw error on empty input");
  } catch (err) {
    assert(err.message.includes('empty'), "Catches empty sequence error");
  }

  // Test 2: Poly-Valine (strongest Beta-sheet former in nature)
  const polyVal = "VVVVVVVVVV";
  const valResult = ChouFasmanPredictor.predict(polyVal);
  assert(valResult.statistics.betaPercent >= 80, "Poly-Valine predicted as overwhelmingly Beta-sheet (>80%)");
  assert(valResult.betaClusters.length > 0, "Identified Beta-sheet cluster in Poly-Valine");
  assert(valResult.prionRisk.level === 'CRITICAL' || valResult.prionRisk.level === 'MODERATE', "Flags high beta propensity as high misfolding risk");

  // Test 3: Poly-Glutamate (strongest Alpha-helix former)
  const polyGlu = "EEEEEEEEEE";
  const gluResult = ChouFasmanPredictor.predict(polyGlu);
  assert(gluResult.statistics.alphaPercent >= 80, "Poly-Glutamate predicted as overwhelmingly Alpha-helix (>80%)");
  assert(gluResult.prionRisk.level === 'LOW', "Low misfolding risk for purely alpha-helical peptide");

  // Test 4: Prion Sample from sample.aaf
  const samplePath = path.join(__dirname, '../data/sample.aaf');
  const aafContent = fs.readFileSync(samplePath, 'utf8');
  const parsed = AAFParser.parse(aafContent);
  const samplePrediction = ChouFasmanPredictor.predict(parsed.residues);

  assert(samplePrediction.length === 60, "Predicted 60 residues from sample");
  assert(samplePrediction.statistics.betaPercent > 0, "Detected Beta-sheet regions in Human PrP");
  assert(samplePrediction.betaClusters.length > 0, "Identified beta-sheet clusters in Human PrP core");
  assert(samplePrediction.prionRisk.score > 0, "Generated non-zero Prion Risk Score");

  // Test 5: Hydropathy & Dual-Track Aggregation Hotspots
  assert(valResult.predictions[0].hydrophobicity >= 4.0, "Poly-Valine has high Kyte-Doolittle hydrophobicity >= 4.0");
  assert(typeof valResult.predictions[0].margin === 'number', "Prediction includes confidence margin");
  assert(valResult.predictions.some(p => p.isDualTrackHotspot), "Dual-track validates Poly-Valine as amyloid hotspot");
  assert(samplePrediction.predictions.some(p => p.isDualTrackHotspot), "Detected dual-track steric-zipper hotspot in Human PrP");

  // Test 6: Biophysical Net Charge
  assert(typeof samplePrediction.chargeProfile.netCharge === 'number', "Computed net charge at pH 7.4");
  assert(samplePrediction.chargeProfile.chargeStr.length > 0, "Formatted charge string present");

  console.log(`\nResults: ${passed}/${total} predictor tests passed.`);
  if (passed === total) {
    console.log('🏆 ChouFasmanPredictor verified! SIUUU! 🐐');
  }
}

runTests();
