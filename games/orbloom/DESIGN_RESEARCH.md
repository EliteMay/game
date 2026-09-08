# Orbloom Visual Research Brief

Updated: 2026-09-09

## Target Type

- Primary Task: 3D planetを見ながら、資源を再投資し、Biome / Species / Research / Expeditionを選択して成長方向を決める。
- Content Model: central 3D world + compact resource HUD + contextual management panels.
- Audience: desktop / mouse中心のincremental game player。
- Density: medium。数値は常時確認できるが、PlanetをUIで覆いすぎない。
- Tone: calm cosmic / life growth / progressively more fantastical.

## Representative References

1. **Cell to Singularity — Beyond / 3D habitats**
   - 3D celestial bodyを中央の主役に置き、必要な数値や操作だけを周辺へ重ねる。
   - Progression unlockを段階的に出し、新規Playerへ同時に大量の導線を見せない。
   - Orbloomへは「central world first」「system unlockをprogressive disclosure」の原理だけ移す。

2. **Terra Nil — globe restoration presentation**
   - 惑星そのものの変化と地域進行を直接見せ、ロック状態と進行率をworld visualへ接続している。
   - OrbloomではBiome Evolution / Planet Evolutionを3D planetの色・海・森林・結晶・大気の変化として返す。

3. **Idle Planet Miner — resource / upgrade management**
   - 生産rate、level、upgrade costを近接して表示し、incrementalの判断を短時間で行える。
   - OrbloomではResource StripからGenerator購入へ直接到達できるようにする。

## Observed Conventions

- 3D worldが主役のgameでは、HUDは画面端に寄せ、world中央を空ける。
- Incremental gameでは現在値だけでなく `/s` と次のupgrade costが重要。
- 解放前のsystemを完全に消すだけでなく、段階に応じて「次に何が開くか」を示すとprogressionの期待を作れる。
- Major progressionは数値だけでなくworld visual changeへ返す。

## Fit for Orbloom

- Center: 3D Planet。drag rotate / wheel zoom / surface click。
- Top: four-resource strip。current amount / per-second / generator level / next cost。
- Left: current Planet Stage + next objective + evolution requirements。
- Right: Biomes / Species / Research / Expeditionの4管理surface。
- Bottom-left: manual Matter + Life Scan。初期active actionを近接。
- Major Evolution: full-screen transition。その後world material / ocean / atmosphere / forest / crystal representationを更新。

## Avoid

- 多数の常時CardでPlanetを隠す。
- 全systemを最初から同じ強さで見せる。
- 装飾だけのneon / glassを大量に重ねる。
- Planet Evolutionを「level numberだけが上がる」演出にする。
- ResearchやExpeditionを独立minigameのように深いnavigationへ分離する。

## Visual Direction

**Stylized Living Planet that becomes increasingly Cosmic Fantasy as progression advances.**

実装ではdark cosmic backgroundを基礎にし、early stageは岩・低彩度、mid gameで海・大気・森林、late gameでcrystal / violet accentを増やす。UI accentは生命成長を示すgreen、rare / late-gameはvioletへ分担する。
