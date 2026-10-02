# Quaternius Adventurer asset

Integration file: `Adventurer.glb` (2,069,236 bytes). This is the original Adventurer.gltf repackaged without changing meshes, materials, bones, or animations. It has one embedded binary buffer and no external dependencies, images, textures, or extension decoders.

Author: Quaternius.
Pack: Ultimate Modular Men Pack (February 2022).
Author source and explicit CC0 declaration: https://quaternius.com/packs/ultimatemodularcharacters.html
License: CC0 1.0 Universal — https://creativecommons.org/publicdomain/zero/1.0/
Official download folder: https://drive.google.com/drive/folders/1USAAquX2JJWuA2m6zol0KUkFe3UkZ8zX
Official Adventurer.gltf file: https://drive.google.com/file/d/1fzSq1Rr037f7QkfXPWEAzmbLMNx-FpPA/view
Download mirror: https://github.com/godotengine/godot/files/9843669/Adventurer.zip
Mirror provenance: https://github.com/godotengine/godot/issues/67733 explicitly describes the attached file as the Quaternius pack's `Individual Characters/glTF/Adventurer.gltf`. The official Drive download was quota limited on 2026-10-01.

Original glTF SHA256: 21F7A61AFB6BD6CEF6961490C367594E3C2FC01EC1F041662131172CE763063E
Repacked GLB SHA256: 765C0229BB3A38813D1BDA30D1ED76C467C8DB5EFF20D03743797624792808B8

## Contents

- glTF 2.0, exported by Khronos glTF Blender I/O v1.7.33.
- 1 scene, 68 nodes, 1 skin with 62 joints.
- 5 skinned meshes: `Adventurer_Body`, `Adventurer_Feet`, `Adventurer_Head`, `Adventurer_Legs`, `Backpack`.
- 15 primitives, 11 colored PBR materials, 10,202 triangles, 20,571 stored vertices (includes split material/normal vertices).
- Olive clothing, brown backpack, separate skin/hair/eye materials. Weapons are not part of the mesh.
- Y up. Bind-pose ground at Y=-0.0012; head top at Y=1.8559. Native height about 1.86 units. +Z is the apparent forward direction (eyes/toes positive Z, backpack negative Z).
- Scene root is `CharacterArmature`. Body and root motion in locomotion clips is effectively in place; `Run` and `Run_Shoot` have constant X/Z body translation. Walk adds small side sway.
- Start an idle animation immediately after loading; the exported default bone pose is not neutral.
- For independent NPCs use `SkeletonUtils.clone(gltf.scene)` and one `AnimationMixer` per cloned character. Ordinary scene.clone shares the skin skeleton.
- Right wrist bone is named `Wrist.R`; useful for attaching a separately modeled gun. `Idle_Gun_Pointing` and `Run_Shoot` provide armed poses.

## Exact animation names and duration (seconds)

Death 1.066667
Gun_Shoot 0.6
HitRecieve 0.566667
HitRecieve_2 0.566667
Idle 1.666667
Idle_Gun 1.666667
Idle_Gun_Pointing 1.666667
Idle_Gun_Shoot 0.666667
Idle_Neutral 1.666667
Idle_Sword 1.666667
Interact 1.266667
Kick_Left 0.933333
Kick_Right 0.933333
Punch_Left 0.833333
Punch_Right 0.833333
Roll 1.333333
Run 0.8
Run_Back 0.833333
Run_Left 0.8
Run_Right 0.8
Run_Shoot 0.833333
Sword_Slash 1.033333
Walk 1.333333
Wave 1.666667

## Loader files

`three-addons/loaders/GLTFLoader.js`, `three-addons/utils/SkeletonUtils.js`, and `three-addons/utils/BufferGeometryUtils.js` are copied from three@0.180.0 on jsDelivr. `three-addons/LICENSE` is the upstream MIT license.

URLs:
https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js
https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/SkeletonUtils.js
https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/BufferGeometryUtils.js
https://cdn.jsdelivr.net/npm/three@0.180.0/LICENSE

All three import bare `three`; preserve the game's import map to the matching local three.js module. GLTFLoader additionally imports `../utils/BufferGeometryUtils.js`, so preserve the relative folder layout.

## Validation

GLB header magic, version, total byte length and JSON/BIN chunk sizes validated. Packed JSON retains all 24 animation names, mesh/skin counts and one embedded 1,429,928 byte binary buffer. No external URIs. This asset has not been visually rendered in this asset-only task; the main integration should confirm camera scale and weapon attachment.


## Wardrobe models (v5)

Author: Quaternius. License: CC0 1.0 Universal.

- `ghost.glb`: Hoodie Character (internally Casual meshes), Ultimate Modular Men. 6,206 triangles, 62 bones, 24 animations. Source: https://poly.pizza/m/gKLBoRsyKe . Download: https://static.poly.pizza/bcd66ec5-5e81-4901-a222-47abc875fe2a.glb . Official pack: https://quaternius.com/packs/ultimatemodularcharacters.html .
- `nova.glb`: Punk, Ultimate Modular Women. 5,956 triangles, 62 bones, 24 animations. Source: https://poly.pizza/m/djXoqejw6w . Download: https://static.poly.pizza/1d368679-1d9a-4d5c-9095-877144b02d00.glb . Official pack: https://quaternius.com/packs/ultimatemodularwomen.html .

Models are locally hosted. Mesh exports are converted to metres and remapped to the Adventurer skeleton by bone name during loading, so independently selected head, torso, trousers and shoes share the same optimized animation rig. Original animation names are normalized in memory. Clothing stays one skinned draw call per actor. LAST ISLAND character names are original labels.


## Detailed faces (v9, October 2, 2026)

The three shipping GLBs now combine the existing CC0 modular clothing and animation rigs with facial geometry from Quaternius Universal Base Characters (Superhero Male / Female, Standard, August 2025). Faces are fitted offline to each head; original hair and all clothing slots remain interchangeable. Eye and eyebrow geometry is included. No Free Fire models are bundled.

Official author: https://quaternius.com/packs/universalbasecharacters.html
Official distribution: https://quaternius.itch.io/universal-base-characters
Source mirror used: https://github.com/NafisRayan/Animate-Rigged-Humanoid-No-Blender/tree/5821923af517ac5fdc82505faa92a0d575fc1b1a/Universal%20Base%20Characters%5BStandard%5D
License: CC0 1.0 Universal; see UNIVERSAL-BASE-LICENSE.txt.
Preparation: scripts/prepare-modern-faces.mjs; counts and fitting parameters: MODERN-FACES.json. The old original-file hashes above identify the original assets, not these modified GLBs.

Reload support-hand motion and weapon anchors for free running are baked when loading the model. They retain the existing 62-bone rig and one combined skin draw call.


## Smooth bodies (v9.1, October 2, 2026)

The torso, arms, hands and trousers now use full-body geometry from the same CC0 Universal Base Characters Standard source listed above. Geometry is fitted offline to the existing neutral animation rig, including separate finger joints; clothing shells and original inner-shirt colors are authored for LAST ISLAND. Original modular heads/hair/shoes remain selectable. The loader merges clothing into one skinned draw call. Backpacks, straps, trims and all fourteen weapon silhouettes are original procedural LAST ISLAND geometry, with five PBR finish groups per weapon. No Free Fire models or textures are bundled.

Preparation: `scripts/prepare-modern-bodies.mjs SOURCE_DIR FACE_BACKUP_DIR`; SOURCE_DIR contains the male/female .gltf and .bin files used by the face converter, and FACE_BACKUP_DIR preserves the v9 head-equipped input GLBs. The input set is recoverable from repository commit `10e0cea65dd7bb229190df6375d3b54b12602894`. The converter welds vertices and exports only the five used source clips; Reload is derived at load time. Counts: MODERN-BODIES.json. Inspect shipping model geometry with `scripts/inspect-avatars.mjs OUTPUT.json`; `scripts/render-asset-preview.py OUTPUT.json PREVIEW.png` is a CPU mesh preview, not a WebGL or browser screenshot.
