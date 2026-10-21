// || श्री ||

const { PDBParser } = require('../js/parser');

function runTests() {
  console.log('🧪 Testing PDBParser (C-alpha extraction)...\n');
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

  // Realistic sample PDB snippet for Human PrP (1QLX segment)
  const samplePDB = `
TITLE    SOLUTION STRUCTURE OF HUMAN PRION PROTEIN (125-228)
HELIX    1   1 GLU A  146  TYR A  155  1                                  10
SHEET    1   A 2 MET A 129  TYR A 131  0
SSBOND   1 CYS A  179    CYS A  214
ATOM      1  N   MET A 129      10.120  -3.210  15.110  1.00 20.00           N
ATOM      2  CA  MET A 129      11.450  -4.120  16.320  1.00 20.00           C
ATOM      3  C   MET A 129      12.110  -4.890  17.200  1.00 20.00           C
ATOM      4  CA  LEU A 130      13.500  -5.200  18.100  1.00 20.00           C
ATOM      5  CA  TYR A 131      15.200  -6.100  19.400  1.00 20.00           C
ATOM      6  CA  GLU A 146      18.000  -2.100  22.000  1.00 20.00           C
ATOM      7  CA  CYS A 179      24.000   1.200  30.000  1.00 20.00           C
ATOM      8  CA  CYS A 214      26.000   3.500  32.000  1.00 20.00           C
END
  `;

  try {
    const result = PDBParser.parse(samplePDB);
    assert(result.length === 6, "Extracted exactly 6 CA atoms (skipped non-CA atoms)");
    assert(result.residues[0].code === 'M', "Residue 1 is Methionine (M)");
    assert(result.residues[0].structure === 'BETA', "Residue 129 is correctly marked as BETA from SHEET record");
    assert(result.residues[3].structure === 'ALPHA', "Residue 146 is correctly marked as ALPHA from HELIX record");
    assert(result.bonds.length === 1, "Parsed SSBOND record");
    assert(result.bonds[0].type === 'DISULFIDE', "Bond type is DISULFIDE");
    assert(result.residues[0].experimentalCoords.x === 11.450, "Extracted exact X coordinate");
    assert(result.isExperimentalPDB === true, "Marked as experimental PDB");
  } catch (err) {
    console.error("  ❌ PDB Parsing Failed:", err);
  }

  console.log(`\nResults: ${passed}/${total} PDB parser tests passed.`);
  if (passed === total) {
    console.log('🏆 PDBParser verified! SIUUU! 🐐');
  }
}

runTests();
