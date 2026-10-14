const fs = require('fs');
const path = require('path');
const { AAFParser } = require('../js/parser');

function runTests() {
  console.log('🧪 Testing AAFParser...\n');
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

  // Test 1: Missing Magic Line
  try {
    AAFParser.parse("INVALID HEADER\n@chain A");
    assert(false, "Should throw error if magic line 'AAF 1.0' is missing");
  } catch (err) {
    assert(err.message.includes('magic') || err.name === 'FormatError', "Catches missing magic line");
  }

  // Test 2: Parse sample.aaf
  try {
    const samplePath = path.join(__dirname, '../data/sample.aaf');
    const content = fs.readFileSync(samplePath, 'utf8');
    const result = AAFParser.parse(content);

    assert(result.version === '1.0', "Header version is '1.0'");
    assert(result.chain === 'A', "Chain ID is 'A'");
    assert(result.name === 'Human Prion Protein PrP', "Protein name matches");
    assert(result.organism === 'human', "Organism matches");
    assert(result.type === 'prion', "Type matches");
    assert(result.length === 60, "Expected length is 60");
    assert(Array.isArray(result.residues) && result.residues.length === 60, "Parsed exactly 60 residues");
    
    // Check first and last residues
    assert(result.residues[0].code === 'M' && result.residues[0].index === 1, "First residue is M at index 1");
    assert(result.residues[59].code === 'Q' && result.residues[59].index === 60, "Last residue is Q at index 60");

    // Check secondary structure mapping
    assert(result.residues[0].structure === 'COIL', "Residue 1 has structure 'COIL'");
    assert(result.residues[6].structure === 'ALPHA', "Residue 7 has structure 'ALPHA'");
    assert(result.residues[14].structure === 'BETA', "Residue 15 has structure 'BETA'");

    // Check Bonds
    assert(Array.isArray(result.bonds) && result.bonds.length === 1, "Parsed 1 bond");
    assert(result.bonds[0].from === 23 && result.bonds[0].to === 52 && result.bonds[0].type === 'DISULFIDE', "Disulfide bond parsed correctly (23-52)");

  } catch (err) {
    console.error("  ❌ Unexpected Error during sample parsing:", err);
  }

  console.log(`\nResults: ${passed}/${total} tests passed.`);
  if (passed === total) {
    console.log('🏆 All tests passed! Ready for next step! SIUUU! 🐐');
  }
}

runTests();
