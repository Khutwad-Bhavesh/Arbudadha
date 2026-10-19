# arbudadhā — अर्बुदधा
### *millionfolded* — A Prion Protein Structure Visualizer

> "One misfolded chain. A million more follow."

---

## What is this?

**arbudadhā** is a browser-based 3D visualizer for prion protein secondary structure.

It reads a custom `.aaf` (Amino Acid Format) file, probabilistically predicts **α-helices**, **β-sheets**, and **γ-turns**, and renders the full protein chain in interactive 3D using Three.js.

This project was built as a learning exercise in:
- Bioinformatics & protein structure prediction
- Designing a universal file format for amino acid sequences
- Probabilistic secondary structure prediction (Chou-Fasman algorithm)
- 3D graphics with Three.js

---

## Features

- 📄 **Custom `.aaf` format** — a new universal 2D amino acid file format
- 🔬 **Chou-Fasman Predictor** — probabilistic α/β/γ structure prediction
- 🌀 **3D Chain Renderer** — interactive Three.js visualization
- 🎨 **Color-coded secondary structures** — α (blue), β (yellow), γ (green), coil (grey)

---

## Folder Structure

```
arbudadhā/
├── format_spec/
│   └── AAF_spec.md       ← The .aaf format specification
├── data/
│   └── sample.aaf        ← Sample prion protein sequence
├── js/
│   ├── parser.js         ← .aaf file parser
│   ├── predictor.js      ← Chou-Fasman probabilistic predictor
│   ├── visualizer.js     ← Three.js 3D renderer
│   └── app.js            ← Main controller
├── css/
│   └── styles.css
├── index.html
└── README.md
```

---

## Secondary Structure Color Key

| Structure | Color | Description |
|-----------|-------|-------------|
| α-Helix | 🔵 Blue | Coiled ribbon — stable, right-handed |
| β-Sheet | 🟡 Yellow | Flat arrow strands — rigid, dangerous in prions |
| γ-Turn | 🟢 Green | Short connector loops between strands |
| Random Coil | ⬜ Grey | Flexible unstructured regions |

---

*Named after the Sanskrit **अर्बुद (arbuda)** — hundred million — and **धा (dhā)** — to fold/hold.*
*Because one misfolded prion protein can template a million more.*
