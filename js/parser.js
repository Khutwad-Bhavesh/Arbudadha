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

// Module export for Node.js test suites
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AAFParser };
}

// Browser export
if (typeof window !== 'undefined') {
  window.AAFParser = AAFParser;
}
