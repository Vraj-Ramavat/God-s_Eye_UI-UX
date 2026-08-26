const fs = require('fs');
const path = require('path');

// Ensure /public/models directory exists
const modelsDir = path.join(__dirname, '../public/models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Generate a valid minimal embedded GLTF JSON with terrain & building structure meshes
const width = 30;
const height = 30;
const segments = 20;

// Create vertices for a displaced terrain mesh with central structure
const positions = [];
const normals = [];
const uvs = [];
const indices = [];

for (let i = 0; i <= segments; i++) {
  for (let j = 0; j <= segments; j++) {
    const x = (i / segments - 0.5) * width;
    const z = (j / segments - 0.5) * height;
    
    // Procedural terrain elevation with ridge and building platform
    const distFromCenter = Math.sqrt(x * x + z * z);
    let y = Math.sin(x * 0.2) * Math.cos(z * 0.2) * 2.5 + Math.sin(x * 0.08) * 4;
    
    // Add central structure hill/plateau
    if (distFromCenter < 8) {
      y += (8 - distFromCenter) * 0.8;
      // Building footprint elevation
      if (Math.abs(x) < 4 && Math.abs(z) < 4) {
        y = 5.5 + Math.sin(x * 0.5) * 0.2;
      }
    }

    positions.push(x, y, z);
    normals.push(0, 1, 0); // Simplified upward normal
    uvs.push(i / segments, j / segments);
  }
}

for (let i = 0; i < segments; i++) {
  for (let j = 0; j < segments; j++) {
    const a = i * (segments + 1) + j;
    const b = i * (segments + 1) + j + 1;
    const c = (i + 1) * (segments + 1) + j;
    const d = (i + 1) * (segments + 1) + j + 1;

    indices.push(a, b, c);
    indices.push(c, b, d);
  }
}

// Convert to typed arrays and binary buffers for GLTF
const posBuffer = Buffer.from(new Float32Array(positions).buffer);
const normBuffer = Buffer.from(new Float32Array(normals).buffer);
const uvBuffer = Buffer.from(new Float32Array(uvs).buffer);
const indexBuffer = Buffer.from(new Uint16Array(indices).buffer);

const totalByteLength = posBuffer.length + normBuffer.length + uvBuffer.length + indexBuffer.length;
const combinedBuffer = Buffer.concat([posBuffer, normBuffer, uvBuffer, indexBuffer]);
const base64Buffer = combinedBuffer.toString('base64');

const gltf = {
  asset: { version: '2.0', generator: "God's Eye Procedural Terrain Exporter" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: "ReconstructedTerrainMesh" }],
  meshes: [
    {
      name: "Terrain_And_Structure",
      primitives: [
        {
          attributes: {
            POSITION: 0,
            NORMAL: 1,
            TEXCOORD_0: 2
          },
          indices: 3,
          material: 0
        }
      ]
    }
  ],
  materials: [
    {
      name: "TacticalTerrainMaterial",
      pbrMetallicRoughness: {
        baseColorFactor: [0.18, 0.25, 0.21, 1.0],
        metallicFactor: 0.1,
        roughnessFactor: 0.8
      }
    }
  ],
  buffers: [
    {
      uri: `data:application/octet-stream;base64,${base64Buffer}`,
      byteLength: totalByteLength
    }
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBuffer.length, target: 34962 },
    { buffer: 0, byteOffset: posBuffer.length, byteLength: normBuffer.length, target: 34962 },
    { buffer: 0, byteOffset: posBuffer.length + normBuffer.length, byteLength: uvBuffer.length, target: 34962 },
    { buffer: 0, byteOffset: posBuffer.length + normBuffer.length + uvBuffer.length, byteLength: indexBuffer.length, target: 34963 }
  ],
  accessors: [
    {
      bufferView: 0,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: positions.length / 3,
      type: "VEC3",
      max: [width / 2, 10, height / 2],
      min: [-width / 2, -5, -height / 2]
    },
    {
      bufferView: 1,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: normals.length / 3,
      type: "VEC3"
    },
    {
      bufferView: 2,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: uvs.length / 2,
      type: "VEC2"
    },
    {
      bufferView: 3,
      byteOffset: 0,
      componentType: 5123, // UNSIGNED_SHORT
      count: indices.length,
      type: "SCALAR"
    }
  ]
};

const gltfPath = path.join(modelsDir, 'terrain_model.gltf');
const glbPath = path.join(modelsDir, 'terrain_model.glb');

fs.writeFileSync(gltfPath, JSON.stringify(gltf, null, 2));
fs.writeFileSync(glbPath, JSON.stringify(gltf, null, 2));

console.log('Successfully generated terrain models at:', gltfPath);
