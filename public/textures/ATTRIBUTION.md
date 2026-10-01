# CC0 surface color textures

All three files are valid 512 x 512 JPEG diffuse/albedo maps, visually inspected. Combined JPEG payload: 244,891 bytes. They are flat surface maps for repeating on 3D geometry, not sphere-preview renders. Downloaded 2026-10-01 from Poly Haven's official map CDN, which served 512-pixel quality-85 versions of the original 1K maps. No local image modification performed.

Poly Haven asset license: CC0 1.0 Universal.
Source license statement: https://polyhaven.com/license
License deed: https://creativecommons.org/publicdomain/zero/1.0/

| File | Asset / author | Source page | Original 1K diffuse file | Downloaded derivative | Bytes |
| --- | --- | --- | --- | --- | --- |
| grass-ground.jpg | Grass Path 2 / Rob Tuytel | https://polyhaven.com/a/grass_path_2 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/grass_path_2/grass_path_2_diff_1k.jpg | https://cdn.polyhaven.com/asset_img/map_previews/grass_path_2/grass_path_2_diff_1k.jpg?width=512&height=512&quality=85 | 101505 |
| aged-concrete.jpg | Concrete Floor 02 / Rob Tuytel | https://polyhaven.com/a/concrete_floor_02 | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor_02/concrete_floor_02_diff_1k.jpg | https://cdn.polyhaven.com/asset_img/map_previews/concrete_floor_02/concrete_floor_02_diff_1k.jpg?width=512&height=512&quality=85 | 101493 |
| wood-planks.jpg | Wood Planks / Amal Kumar | https://polyhaven.com/a/wood_planks | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_planks/wood_planks_diff_1k.jpg | https://cdn.polyhaven.com/asset_img/map_previews/wood_planks/wood_planks_diff_1k.jpg?width=512&height=512&quality=85 | 41893 |

SHA256:
- grass-ground.jpg: E218422EBF16DE07D20D7C06BA0C91007192636E29727DD41B4A254F9679CA67
- aged-concrete.jpg: 7961E6ACDDD89E6DBC9AE8240163BF322E6DCFA46B82497D0CDFF721F92C8948
- wood-planks.jpg: E707CF01F7ED3CE27A4E609182A39BF3A6E935D4819E31E4054E75D0B41EF4A3

Suggested use with three@0.180.0: TextureLoader; colorSpace=THREE.SRGBColorSpace; wrapS=wrapT=THREE.RepeatWrapping; set anisotropy to renderer's supported maximum capped at 8. These contain color only, so use roughness about 0.85-1 and metalness 0.

Ground texture has dry grass tufts among gravel/dirt; it is not a green lawn. Concrete is worn gray/brown with mossy marks; works on slab, wall and industrial surfaces. Wood consists of horizontal weathered planks. Clone textures when repeat values differ per material, otherwise changing repeat on a shared texture changes every material using it.

Author physical widths: grass tile 1 m; concrete tile 2 m; wood tile 1.5 m. Repeat frequency can be increased or reduced for the game's camera scale. All are ordinary tileable Poly Haven material maps; visible large-scale repetition should be mitigated by world color variation and geometry.
