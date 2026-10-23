// || श्री ||

/**
 * AAFParser — Universal Amino Acid Format Parser v1.0
 * arbudadhā Project — Prion Protein Secondary Structure Visualizer
 *
 * Implements strict AAF v1.0 specification parsing:
 * - Magic line verification (AAF 1.0)
 * - Metadata header parsing (@chain, @name, @organism, @type, @length)
 * - Space-delimited residue sequence decoding
 * - Covalent bond and disulfide bridge mapping
 * - Secondary structure hint resolution and confidence mapping
 */

class AAFParser {
  static VALID_AMINO_ACIDS = new Set([
    'A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L',
    'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'Y', 'X'
  ]);

  static VALID_STRUCTURES = new Set(['ALPHA', 'BETA', 'GAMMA', 'COIL']);

  /**
   * Parse raw .aaf content into normalized protein chain representation
   * @param {string} rawText
   * @returns {Object} Normalized protein model
   */
  static parse(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('FormatError: AAF content must be a non-empty string');
    }

    const lines = rawText.split(/\r?\n/);
    let lineIdx = 0;

    // Step 1: Find and verify Magic Line
    let magicFound = false;
    for (; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx].trim();
      if (!line || line.startsWith('#')) continue;

      if (line === 'AAF 1.0') {
        magicFound = true;
        lineIdx++;
        break;
      } else {
        throw new Error(`FormatError: Invalid format: missing AAF 1.0 magic line. Found: "${line}"`);
      }
    }

    if (!magicFound) {
      throw new Error('FormatError: File is empty or missing AAF 1.0 magic header');
    }

    const metadata = {
      chain: 'A',
      name: '',
      organism: '',
      type: '',
      length: 0
    };

    const rawResidueCodes = [];
    const bonds = [];
    const hints = [];

    let currentSection = 'HEADER'; // HEADER, SEQ, BOND, HINT

    // Step 2: Line by line state machine
    for (; lineIdx < lines.length; lineIdx++) {
      let line = lines[lineIdx].trim();

      // Skip empty lines and full comment lines
      if (!line || line.startsWith('#')) continue;

      // Section switches
      if (line === 'SEQ:') {
        currentSection = 'SEQ';
        continue;
      }
      if (line === 'BOND:') {
        currentSection = 'BOND';
        continue;
      }
      if (line === 'HINT:') {
        currentSection = 'HINT';
        continue;
      }

      // Strip inline comments for data parsing
      const inlineCommentIdx = line.indexOf('#');
      if (inlineCommentIdx !== -1) {
        line = line.substring(0, inlineCommentIdx).trim();
      }
      if (!line) continue;

      // Process line based on current section
      switch (currentSection) {
        case 'HEADER': {
          if (line.startsWith('@')) {
            const firstSpace = line.indexOf(' ');
            if (firstSpace !== -1) {
              const key = line.substring(1, firstSpace).trim();
              const val = line.substring(firstSpace + 1).trim();
              if (key === 'length') {
                metadata.length = parseInt(val, 10);
              } else {
                metadata[key] = val;
              }
            }
          }
          break;
        }

        case 'SEQ': {
          const tokens = line.split(/\s+/);
          for (const token of tokens) {
            const code = token.toUpperCase();
            if (!this.VALID_AMINO_ACIDS.has(code)) {
              throw new Error(`FormatError: Invalid amino acid code "${token}" in sequence`);
            }
            rawResidueCodes.push(code);
          }
          break;
        }

        case 'BOND': {
          // Format: C23-C52 DISULFIDE
          const bondMatch = line.match(/^([A-Z])(\d+)-([A-Z])(\d+)\s+([A-Z]+)$/i);
          if (bondMatch) {
            const [, res1, pos1, res2, pos2, bondType] = bondMatch;
            bonds.push({
              from: parseInt(pos1, 10),
              to: parseInt(pos2, 10),
              fromRes: res1.toUpperCase(),
              toRes: res2.toUpperCase(),
              type: bondType.toUpperCase()
            });
          }
          break;
        }

        case 'HINT': {
          // Format: 1-6 COIL 1.00  or  7-14 ALPHA
          const hintMatch = line.match(/^(\d+)-(\d+)\s+([A-Z]+)(?:\s+([\d.]+))?$/i);
          if (hintMatch) {
            const [, startStr, endStr, structureTag, confStr] = hintMatch;
            const structure = structureTag.toUpperCase();
            const confidence = confStr !== undefined ? parseFloat(confStr) : 1.0;

            hints.push({
              start: parseInt(startStr, 10),
              end: parseInt(endStr, 10),
              structure,
              confidence: isNaN(confidence) ? 1.0 : confidence
            });
          }
          break;
        }
      }
    }

    // Validation: verify length matches
    const actualLength = rawResidueCodes.length;
    if (metadata.length > 0 && metadata.length !== actualLength) {
      console.warn(`LengthMismatchWarning: Expected ${metadata.length} residues, found ${actualLength}`);
    }
    const finalLength = metadata.length > 0 ? metadata.length : actualLength;

    // Step 3: Map individual residues with their secondary structure state
    const residues = [];
    for (let i = 0; i < actualLength; i++) {
      const residueIndex = i + 1;
      const code = rawResidueCodes[i];

      // Match against hints
      const activeHint = hints.find(h => residueIndex >= h.start && residueIndex <= h.end);

      residues.push({
        index: residueIndex,
        code,
        structure: activeHint ? activeHint.structure : 'COIL',
        confidence: activeHint ? activeHint.confidence : 1.0
      });
    }

    return {
      version: '1.0',
      chain: metadata.chain || 'A',
      name: metadata.name || 'Unnamed Protein',
      organism: metadata.organism || 'unknown',
      type: metadata.type || 'protein',
      length: finalLength,
      residues,
      bonds
    };
  }
}

class PDBParser {
  static AA3_TO_AA1 = {
    ALA: 'A', CYS: 'C', ASP: 'D', GLU: 'E', PHE: 'F',
    GLY: 'G', HIS: 'H', ILE: 'I', LYS: 'K', LEU: 'L',
    MET: 'M', ASN: 'N', PRO: 'P', GLN: 'Q', ARG: 'R',
    SER: 'S', THR: 'T', VAL: 'V', TRP: 'W', TYR: 'Y'
  };

  /**
   * Parse real PDB text, extracting C-alpha (CA) coordinates, HELIX, SHEET, and SSBOND records
   * @param {string} pdbText
   * @returns {Object} Normalized protein model
   */
  static parse(pdbText) {
    if (!pdbText || typeof pdbText !== 'string') {
      throw new Error('PDBError: PDB content must be a non-empty string');
    }

    const lines = pdbText.split(/\r?\n/);
    const rawCAs = [];
    const helixRanges = [];
    const sheetRanges = [];
    const bonds = [];
    let title = 'PDB Protein';
    let chainId = 'A';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('TITLE')) {
        title = line.substring(10).trim();
      } else if (line.startsWith('HELIX')) {
        // HELIX record: start res (21-25), end res (33-37)
        const start = parseInt(line.substring(21, 25).trim(), 10);
        const end = parseInt(line.substring(33, 37).trim(), 10);
        if (!isNaN(start) && !isNaN(end)) {
          helixRanges.push({ start, end });
        }
      } else if (line.startsWith('SHEET')) {
        // SHEET record: start res (22-26), end res (33-37)
        const start = parseInt(line.substring(22, 26).trim(), 10);
        const end = parseInt(line.substring(33, 37).trim(), 10);
        if (!isNaN(start) && !isNaN(end)) {
          sheetRanges.push({ start, end });
        }
      } else if (line.startsWith('SSBOND')) {
        // SSBOND: res1 (17-21), res2 (31-35)
        const pos1 = parseInt(line.substring(17, 21).trim(), 10);
        const pos2 = parseInt(line.substring(31, 35).trim(), 10);
        if (!isNaN(pos1) && !isNaN(pos2)) {
          bonds.push({
            from: pos1,
            to: pos2,
            fromRes: 'C',
            toRes: 'C',
            type: 'DISULFIDE'
          });
        }
      } else if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
        const atomName = line.substring(12, 16).trim();
        if (atomName === 'CA') {
          const res3 = line.substring(17, 20).trim();
          const lineChain = line.substring(21, 22).trim() || 'A';
          const resSeq = parseInt(line.substring(22, 26).trim(), 10);
          const x = parseFloat(line.substring(30, 38).trim());
          const y = parseFloat(line.substring(38, 46).trim());
          const z = parseFloat(line.substring(46, 54).trim());

          chainId = lineChain;
          const code = this.AA3_TO_AA1[res3] || 'X';

          rawCAs.push({
            origSeq: resSeq,
            code,
            x,
            y,
            z
          });
        }
      }
    }

    if (rawCAs.length === 0) {
      throw new Error('PDBError: No C-alpha (CA) atoms found in provided PDB text');
    }

    // Remap to 1-based sequential indices while mapping secondary structures
    const residues = rawCAs.map((ca, idx) => {
      const index = idx + 1;
      let structure = 'COIL';

      const inHelix = helixRanges.some(h => ca.origSeq >= h.start && ca.origSeq <= h.end);
      const inSheet = sheetRanges.some(s => ca.origSeq >= s.start && ca.origSeq <= s.end);

      if (inHelix) structure = 'ALPHA';
      else if (inSheet) structure = 'BETA';

      return {
        index,
        code: ca.code,
        origSeq: ca.origSeq,
        structure,
        confidence: 1.0,
        experimentalCoords: { x: ca.x, y: ca.y, z: ca.z }
      };
    });

    // Remap bonds to the sequential 1-based indices if needed
    const mappedBonds = bonds.map(b => {
      const idx1 = residues.findIndex(r => r.origSeq === b.from);
      const idx2 = residues.findIndex(r => r.origSeq === b.to);
      return {
        from: idx1 !== -1 ? idx1 + 1 : b.from,
        to: idx2 !== -1 ? idx2 + 1 : b.to,
        fromRes: b.fromRes,
        toRes: b.toRes,
        type: b.type
      };
    });

    return {
      version: '1.0',
      chain: chainId,
      name: title,
      organism: 'experimental (PDB)',
      type: 'prion',
      length: residues.length,
      residues,
      bonds: mappedBonds,
      isExperimentalPDB: true
    };
  }
}

class FASTAParser {
  /**
   * Parse FASTA sequence format (>header followed by sequence)
   * @param {string} fastaText
   * @returns {Object} Normalized protein model
   */
  static parse(fastaText) {
    if (!fastaText || typeof fastaText !== 'string') {
      throw new Error('FASTAError: Input must be a non-empty string');
    }

    const lines = fastaText.split(/\r?\n/);
    let header = 'FASTA Protein';
    let seq = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (line.startsWith('>')) {
        header = line.substring(1).trim();
      } else {
        seq += line.replace(/\s+/g, '').toUpperCase();
      }
    }

    if (!seq) {
      throw new Error('FASTAError: No valid amino acid sequence found in FASTA format');
    }

    const residues = seq.split('').map((code, idx) => ({
      index: idx + 1,
      code,
      structure: 'COIL',
      confidence: 1.0
    }));

    return {
      version: '1.0',
      chain: 'A',
      name: header,
      organism: 'FASTA Import',
      type: 'prion',
      length: residues.length,
      residues,
      bonds: []
    };
  }
}

// Module export for Node.js test suites
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AAFParser, PDBParser, FASTAParser };
}

// Browser export
if (typeof window !== 'undefined') {
  window.AAFParser = AAFParser;
  window.PDBParser = PDBParser;
  window.FASTAParser = FASTAParser;
}

