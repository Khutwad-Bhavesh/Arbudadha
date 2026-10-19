# AAF — Amino Acid Format Specification
### Version 1.0 | arbudadhā Project

---

## Overview

**AAF** (Amino Acid Format) is a plain-text, human-readable file format for representing protein amino acid chains with optional secondary structure annotations. It is designed to be:

- **Simple** — readable without any tooling
- **Universal** — works for any protein, not just prions
- **Annotatable** — supports manual structure hints alongside raw sequence data
- **Parseable** — strict grammar for reliable programmatic parsing

File extension: `.aaf`

---

## File Structure

An `.aaf` file has three sections (in order):

```
1. Header Block    (metadata, starts with @)
2. Sequence Block  (raw amino acid chain, starts with SEQ:)
3. Hint Block      (optional manual structure annotations, starts with HINT:)
```

### Comments

Lines starting with `#` are comments and are ignored by the parser.

---

## 1. Header Block

Each header line starts with `@` followed by a key and value.

| Key | Description | Example |
|-----|-------------|---------|
| `@chain` | Chain identifier (single letter) | `@chain A` |
| `@organism` | Source organism | `@organism human` |
| `@type` | Protein type/family | `@type prion` |
| `@name` | Full protein name | `@name PrP Human` |
| `@length` | Expected residue count | `@length 253` |

---

## 2. Sequence Block

Begins with `SEQ:` on its own line.

Amino acids are listed as **single-letter codes**, separated by spaces.
Each line represents up to **30 residues**.
Position indexing starts at **1**.

### Single-letter Amino Acid Codes

| Letter | Amino Acid | Letter | Amino Acid |
|--------|-----------|--------|-----------|
| A | Alanine | M | Methionine |
| C | Cysteine | N | Asparagine |
| D | Aspartate | P | Proline |
| E | Glutamate | Q | Glutamine |
| F | Phenylalanine | R | Arginine |
| G | Glycine | S | Serine |
| H | Histidine | T | Threonine |
| I | Isoleucine | V | Valine |
| K | Lysine | W | Tryptophan |
| L | Leucine | Y | Tyrosine |

---

## 3. Hint Block (Optional)

Begins with `HINT:` on its own line.

Manually annotate known secondary structure regions.

### Format:
```
<start>-<end> <STRUCTURE>   # optional comment
```

### Valid Structure Tags:
| Tag | Meaning |
|-----|---------|
| `ALPHA` | α-Helix |
| `BETA` | β-Sheet |
| `GAMMA` | γ-Turn |
| `COIL` | Random Coil |

---

## Full Example

```aaf
# Human Prion Protein (PrP) — partial sequence
# AAF v1.0

@chain A
@organism human
@type prion
@name Human Prion Protein PrP
@length 30

SEQ:
M K H M A G A A A A G A V V G G L G G Y M L G S A M S R P I

HINT:
1-5   COIL    # N-terminal flexible region
6-12  ALPHA   # first helix
13-20 BETA    # potential beta strand (danger zone in PrPSc)
21-30 COIL    # unstructured tail
```

---

## Parser Rules

1. Lines starting with `#` → skip
2. Lines starting with `@` → parse as header key-value
3. Line exactly `SEQ:` → switch to sequence parsing mode
4. Line exactly `HINT:` → switch to hint parsing mode
5. In SEQ mode: split line by spaces, each token is a residue code
6. In HINT mode: parse `<int>-<int> <TAG>` pattern, ignore trailing comments

---

*Specification version 1.0 — arbudadhā project*
