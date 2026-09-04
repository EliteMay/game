# Requirements

## 目的

完成度の高いブラウザゲームを1本ずつ追加できるGame Hubを作る。大量の未完成ミニゲームを並べず、各ゲームは主要ループ・保存・設定・UIまで通してからPlayable扱いにする。

## 利用者

- 主利用者: Repository Owner本人
- 公開形態: Public GitHub Repository / GitHub Pages
- Primary Device: Desktop / Keyboard + Mouse

## Project Profiles

`STATIC + MEDIA + TOOL + PUBLIC-CONTENT`

## Game 01: Scrap Factory MVP

### 必須

- 一人称3D移動
- 廃材置き場の探索
- スクラップ回収
- 12 Slot Backpack
- 拠点への帰還
- 直接売却
- 粉砕機 / 精錬炉 / コンベア / 倉庫 / 販売設備
- 2.5m Gridで自由配置
- コンベア接続による自動搬送
- 鉄くず → 破砕金属 → 鉄インゴット
- 簡易クラフトによる製品化
- 所持金 / 累計売上
- 目標進行
- オートセーブ / 手動セーブ相当
- 設定
- Hubへ戻れる

### MVP後

- 戦闘 / 銃
- 廃住宅街 / 廃工場 / 軍事施設 / 研究施設
- 電力
- 複数階
- ロボット / ドローン
- 高度な研究ツリー
- 大規模物流

## Game Hub

- Playableと未完成ゲームを明確に分ける
- 最近の進行 / Play Timeを表示
- Save Export / Import
- 未完成ゲームに偽のPlay導線を出さない

## 保存

軽量な数値・配置・設定のみなのでlocalStorageを採用する。永続IDは表示名と分離し、Schema Versionを持つ。

## 崩してはいけない仕様

- 未完成ゲームをPlayableと表示しない
- Save Schema変更時に旧Dataを無断破棄しない
- GitHub PagesでRepository subpathから動く相対Pathを維持する
- Three.js以外の外部Assetへ依存しない
- 公開ファイルへ秘密情報を置かない
- Scrap Factoryの主役は戦闘ではなく「探索 → 加工 → 自動化 → 成長」

## 完成条件（Playable MVP）

- HubからScrap Factoryへ入れる
- 探索してScrapを回収できる
- 売却して設備代を稼げる
- 設備を自由配置できる
- コンベア経由で機械間の搬送が動く
- 加工品が販売されCashへ反映される
- 再読込後にSaveが復元される
- JS / JSON / Local reference validationが成功する
- Desktop Browserで主要導線を確認する
- Visual Quality Baselineを確認する
