// || श्री ||

/**
 * PrionVisualizer3D — Lightweight Vector-Point & Backbone 3D Renderer
 * arbudadhā Project — Prion Protein Secondary Structure Visualizer
 *
 * Designed for ultra-high performance on limited-spec hardware:
 * - C-alpha backbone trace using parametric geometry (alpha-helix, beta-strand, gamma-turn)
 * - Single draw-call THREE.Points & THREE.LineBufferGeometry
 * - Color-coded secondary structures (Alpha=Blue, Beta=Yellow, Gamma=Green, Coil=Grey)
 * - Disulfide bridge connectivity rendering
 */

class PrionVisualizer3D {
  constructor(canvasContainerId) {
    this.container = document.getElementById(canvasContainerId);
    if (!this.container) {
      console.warn(`Container #${canvasContainerId} not found, visualization will mount on demand.`);
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.proteinGroup = null;

    this.residuePositions = []; // Array of { index, code, structure, pos: THREE.Vector3 }
    this.hoveredResidueCallback = null;

    // Palette tokens
    this.COLORS = {
      ALPHA: 0x3b82f6,  // Royal Blue
      BETA: 0xeab308,   // Golden Amber
      GAMMA: 0x22c55e,  // Emerald Green
      COIL: 0x94a3b8,   // Slate Grey
      BOND: 0x06b6d4    // Cyan
    };

    if (this.container && typeof THREE !== 'undefined') {
      this.init();
    }
  }

  init() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 20, 60);

    // 3. Renderer (low spec optimized)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(20, 40, 30);
    this.scene.add(dirLight);

    // 5. OrbitControls if available
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
    }

    // 6. Protein Root Group
    this.proteinGroup = new THREE.Group();
    this.scene.add(this.proteinGroup);

    // 7. Raycaster for low-overhead hover inspection
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 1.0;
    this.mouse = new THREE.Vector2();

    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('resize', () => this.onWindowResize());

    this.animate();
  }

  /**
   * Convert linear parsed/predicted protein sequence into 3D C-alpha coordinates
   * Using continuous geometric framing
   */
  generateBackboneCoordinates(residues) {
    const coords = [];
    let currentPos = new THREE.Vector3(0, 0, 0);
    let currentDir = new THREE.Vector3(0, 0, 1);
    let helixAngle = 0;
    let betaStep = 0;

    for (let i = 0; i < residues.length; i++) {
      const res = residues[i];
      const structure = res.structure || 'COIL';

      if (structure === 'ALPHA') {
        // Parametric Alpha Helix: r = 2.3 Å, pitch = 1.5 Å, 100 deg/residue
        helixAngle += (100 * Math.PI) / 180;
        const radius = 2.3;
        const dx = Math.cos(helixAngle) * radius;
        const dy = Math.sin(helixAngle) * radius;
        currentPos = currentPos.clone().add(currentDir.clone().multiplyScalar(1.5));
        currentPos.x += dx * 0.4;
        currentPos.y += dy * 0.4;
      } else if (structure === 'BETA') {
        // Extended Beta Strand: 3.5 Å rise, alternating pleated lateral shift
        betaStep++;
        const pleat = (betaStep % 2 === 0 ? 0.8 : -0.8);
        currentPos = currentPos.clone().add(currentDir.clone().multiplyScalar(3.2));
        currentPos.y += pleat;
      } else if (structure === 'GAMMA') {
        // Gamma Turn: sharp directional change
        const turnAxis = new THREE.Vector3(0, 1, 0);
        currentDir.applyAxisAngle(turnAxis, Math.PI / 4).normalize();
        currentPos = currentPos.clone().add(currentDir.clone().multiplyScalar(2.4));
      } else {
        // Random Coil: gentle flexible wander
        const wander = new THREE.Vector3(
          (Math.sin(i * 0.7) - 0.5) * 1.2,
          (Math.cos(i * 0.9) - 0.5) * 1.2,
          2.0
        );
        currentPos = currentPos.clone().add(wander);
      }

      coords.push({
        index: res.index,
        code: res.code,
        structure,
        confidence: res.confidence,
        pos: currentPos.clone()
      });
    }

    // Center coordinates at origin
    const center = new THREE.Vector3();
    coords.forEach(c => center.add(c.pos));
    center.divideScalar(coords.length);
    coords.forEach(c => c.pos.sub(center));

    return coords;
  }

  /**
   * Render protein model with 3D points, continuous backbone line, and disulfide bridges
   */
  renderProtein(proteinModel) {
    if (!this.proteinGroup) return;

    // Clear previous objects
    while (this.proteinGroup.children.length > 0) {
      const obj = this.proteinGroup.children.pop();
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }

    const residues = proteinModel.residues || [];
    if (residues.length === 0) return;

    this.residuePositions = this.generateBackboneCoordinates(residues);

    const positions = [];
    const colors = [];

    this.residuePositions.forEach(item => {
      positions.push(item.pos.x, item.pos.y, item.pos.z);
      const hexColor = this.COLORS[item.structure] || this.COLORS.COIL;
      const color = new THREE.Color(hexColor);
      colors.push(color.r, color.g, color.b);
    });

    // 1. Continuous C-alpha Backbone Line
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2
    });
    const backboneLine = new THREE.Line(lineGeo, lineMat);
    this.proteinGroup.add(backboneLine);

    // 2. Residue Vector Points (Ultra fast on low specs)
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    pointsGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const pointsMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      sizeAttenuation: true
    });
    this.pointsMesh = new THREE.Points(pointsGeo, pointsMat);
    this.proteinGroup.add(this.pointsMesh);

    // 3. Disulfide Bridge Bonds
    const bonds = proteinModel.bonds || [];
    bonds.forEach(bond => {
      const r1 = this.residuePositions.find(r => r.index === bond.from);
      const r2 = this.residuePositions.find(r => r.index === bond.to);

      if (r1 && r2) {
        const bondGeo = new THREE.BufferGeometry().setFromPoints([r1.pos, r2.pos]);
        const bondMat = new THREE.LineDashedMaterial({
          color: this.COLORS.BOND,
          dashSize: 1.0,
          gapSize: 0.5,
          linewidth: 3
        });
        const bondLine = new THREE.Line(bondGeo, bondMat);
        bondLine.computeLineDistances();
        this.proteinGroup.add(bondLine);
      }
    });

    // Reset camera position to fit bounding sphere
    lineGeo.computeBoundingSphere();
    const sphere = lineGeo.boundingSphere;
    if (sphere && this.camera) {
      const dist = sphere.radius * 2.8;
      this.camera.position.set(0, dist * 0.5, dist);
      this.camera.lookAt(0, 0, 0);
      if (this.controls) {
        this.controls.target.set(0, 0, 0);
      }
    }
  }

  onMouseMove(e) {
    if (!this.renderer || !this.pointsMesh) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.pointsMesh);

    if (intersects.length > 0) {
      const pointIndex = intersects[0].index;
      const resData = this.residuePositions[pointIndex];
      if (resData && typeof this.hoveredResidueCallback === 'function') {
        this.hoveredResidueCallback(resData, e.clientX, e.clientY);
      }
    } else {
      if (typeof this.hoveredResidueCallback === 'function') {
        this.hoveredResidueCallback(null);
      }
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();

    // Gentle auto-rotation for 3D depth perception
    if (this.proteinGroup) {
      this.proteinGroup.rotation.y += 0.002;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// Browser export
if (typeof window !== 'undefined') {
  window.PrionVisualizer3D = PrionVisualizer3D;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PrionVisualizer3D };
}
