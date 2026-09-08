# Parked Concept — First-Person Shop Simulator

Status: **Parked / Not Active**
Saved: 2026-09-09

この文書は、Game 02候補として検討した一人称3Dの店舗経営 / 作業シミュレーター案を、将来再検討できるよう保存するためのメモです。

現在のActiveなGame 02企画ではありません。Game 02は別の育成ゲーム案として再検討します。

## 企画の出発点

参考方向:

- TCG Card Shop Simulator
- Supermarket Simulator
- ガチャガチャショップ系シミュレーター
- その他、一人称3Dの店舗経営 / 作業シミュレーター

避けたい状態:

- 既存の店舗Simulatorをそのままコピーする
- Progressionで作業量だけが増える
- 後半が補充 / 会計 / 値付けだけの反復になる
- AutomationによってPlayer自身のGameplayが消える

## ジャンル調査から得た重要な仮説

### 強い基本Loop

```text
仕入れ
→ 搬入 / 在庫
→ 陳列
→ 値付け
→ 開店
→ 接客 / 会計 / 補充
→ 閉店
→ 利益確認
→ Unlock / 店舗拡張
→ 次の日
```

### 長期的に遊びやすくする要素

- 店舗が物理的に成長する
- 新商品 / 新Categoryが増える
- 初期の単純作業をStaff / Automationへ移せる
- Collectionなど、売上とは別のProgressionがある
- 店舗業務とは少し違うOptional Activityがある
- Progressionにより「作業量」ではなく「Playerが考えること」が変わる

### 単調になりやすい原因

悪いProgression例:

```text
棚5個
→ 棚10個
→ 棚20個

補充5分
→ 補充10分
→ 補充20分
```

目指したいProgression:

```text
序盤
Playerが自分で会計 / 補充

↓

中盤
Staffへ単純作業を任せる
Playerは仕入れ / Layout / Customer需要を判断

↓

後半
より上位の店舗運営Decisionへ移る
```

## 最低限必要と考えたSystem候補

- First-person 3D movement
- 1店舗
- 商品仕入れ
- 箱 / 在庫
- 商品陳列
- Price
- Customer AI
- 商品購入
- Checkout
- Cash
- Day Cycle
- 店舗Upgrade
- 商品Unlock
- Save
- 明確なMain Goal

## Scopeを抑えるため初期版から外す候補

- Multiplayer / Co-op
- Online Store
- Delivery
- Shoplifting / Security Camera
- 複雑なStaff Skill Tree
- 多数のStaff Role
- Seasonal Economy
- Dynamic Supply Chain
- 競合店舗Simulation
- 複数店舗 / Franchise
- 街全体Simulation
- 複雑なMarketing
- Loan / Tax / Accounting
- 大量の商品種類
- 全商品個別Physics

## 後から追加できるSystem候補

- Staff
- Staff Upgrade
- Bulk Ordering
- Auto Pricing
- Collection拡張
- Rare Customer
- Reputation
- Special Event
- Decoration効果
- Security
- Cleaning
- Marketing
- Online Orders
- Second Floor
- New Product Category
- Challenge / Seasonal Event

## 独自System候補

### A. 常連客を育てる店

```text
客が来る
→ 好みを知る
→ 欲しい商品を用意する
→ 満足度 / 信頼が上がる
→ 常連になる
→ 新Request / 商品 / Eventが解放
```

Customer自身をCollection / Progressionに近い対象として扱う。

### B. 地域Trend / Local Demand

イベント、天候、地域需要などにより商品需要が変わり、翌日の仕入れ判断へつなげる。

目的は、仕入れを単なる補充作業ではなくManagement Decisionにすること。

### C. LayoutがCustomer行動へ影響

- 商品Visibility
- 移動距離
- Queue
- 混雑
- 商品位置

をCustomer行動へ反映し、店内Layout自体を攻略対象にする。

### D. Rare商品 / Discovery

通常仕入れの中からRare Variantや特殊商品を発見できる。

```text
売る
/ 展示する
/ Collectionへ残す
```

という選択を作る。

### E. 店外仕入れ

PC注文だけでなく、短時間のOptional Activityとして卸売市場、フリーマーケット、倉庫などへ出向き、安く良い商品を探す。

探索Game化はせず、短い別Loopとして扱う。

## 当時の有力方向

最もScopeと独自性のバランスが良い候補として考えていたのは:

**常連客 × 専門店 + 少量のRare商品 / Collection**

Core Loop案:

```text
仕入れる
→ 陳列する
→ 開店
→ Customerを観察する
→ 売る
→ 好み / Demandを理解する
→ 翌日の仕入れを変える
→ 常連を増やす
→ 店を拡張
```

## 再開するときの注意

このメモは企画候補のSnapshotであり、正式Requirementsではありません。

再開時は必ず:

1. 最新の `web-project-guide` を確認
2. 同ジャンルのCurrent Evidenceを再調査
3. Game HubのCurrent Repository / Requirementsと整合確認
4. Active Game IDと競合しない形で正式要件へ昇格

してから実装へ進みます。
