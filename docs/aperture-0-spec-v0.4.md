# Aperture-0

未指定終端を持つ異時空接続面シミュレーター

基本仕様書 **v0.4**

---

## 0. v0.1 からの変更点

v0.1 は設計思想としては閉じていたが、実装すると三箇所で計算が停止するか、あるいは自己欺瞞を許す隙が残っていた。v0.2 はその三点を構造的に修正する。修正の結果、仕様は短くなっている。

| # | v0.1 | v0.2 | 理由 |
|---|------|------|------|
| 1 | Boundary Ω に `residual_vector` を持たせる | **Feasible Set F の幾何**を追跡する | 残差はモデル予測との差分だが、3.2 でモデルを禁止しているため引く相手が存在しない。定義不能だった |
| 2 | Ω 側テンソルを「欠損テンソル」として保持 | **開いたインデックス（open leg）**として保持 | 値を未設定にすると NaN が伝播し min-cut と縮約が停止する。開いた脚なら停止しない |
| 3 | Persistent Interior を「構造類似度」で判定 | **帰無分布から事前に閾値を封印**して判定 | 厳密同型は絶対に一致せず、類似度スコアは何でも一致する。後付け解釈が入る唯一の隙だった |
| 4 | 判定指標 9 個を並列に評価 | **primary endpoint を 1 個のみ事前指定** | 9 指標を同時検定すれば何かは有意になる。多重比較の統制がなければレベル 4 の定義が空洞化する |
| 5 | T0 封印は状態ハッシュ | **外部検証可能なタイムスタンプ**を併用 | 自己保持のハッシュは後から差し替え可能。第三者に対する封印として機能しない |
| 6 | Phase 2 で Ω を実装 | **Phase 1.5 で帰無分布を先に取得** | Ω より先に対照を作る。閾値を確定させる前に Ω 実験を走らせてはならない |

---


## 0.1 v0.2 からの変更点

v0.3 は、Aperture-0 を常時運転した際に、稀な構造変化を失わず、後から同一条件で検証できるようにする。v0.2 の計算・統計・封印原則は変更せず、観測保存系を追加する。

| # | v0.2 | v0.3 | 理由 |
|---|------|------|------|
| 1 | 実験単位のログ保存 | **Event Flight Recorder** による常時リングバッファ | 異常検出時点より前の変化を保存する必要がある |
| 2 | 実験再生 | **Deterministic Replay** と **Controlled Rerun** を分離 | 記録の再生と現象の再現を混同しないため |
| 3 | Anomaly Record のみ | **Anomaly Scene Archive** を事件単位で凍結 | 異常前後の完全状態、コード、乱数、外部入力を一体保存するため |
| 4 | 閾値超過の記録 | **pre-roll / post-roll** を自動退避 | 変化の開始点と復帰過程を後から追跡するため |
| 5 | 同一環境での再実行 | **同乱数・異乱数・別マシン**の再実行分類 | コード必然、乱数依存、環境依存、構造依存を切り分けるため |
| 6 | ログの保持方針なし | 高解像度・差分・長期圧縮の階層保存 | 常時運転による容量肥大を抑えつつ検証可能性を保つため |

---

## 0.2 v0.3 からの変更点

v0.3 で観測保存系を追加した結果、v0.2 で閉じていた統計的統制に穴が開いた。常時運転は逐次検定であり、1セッション単位で封印した閾値をそのままトリガーに使うと誤警報が規則的に発生する。また Deterministic Replay の一致条件が浮動小数点演算に対して厳しすぎ、実装すると常に失敗する。v0.4 はこの二点を中心に修正する。

| # | v0.3 | v0.4 | 理由 |
|---|------|------|------|
| 1 | τ をそのまま常時運転のトリガーに使用 | **期待誤警報率**を Phase 1.5 の成果物に追加し、観測対象を「発火の有無」から**期待発火数からの超過**へ変更 | τ は1セッション単位の95パーセンタイル。常時運転に流用すると定義上5%の頻度で発火する。逐次検定における optional stopping |
| 2 | Replay は全 checkpoint の state hash 一致を要求 | **離散量はビット一致必須／連続量は事前登録許容誤差**の二層チェックポイント | float 演算はビット再現しない。現状の定義では `VERIFIED` が原理的に出ない |
| 3 | `CROSS_MACHINE_RERUN` の再現判定が未定義 | **現象レベル**（primary が τ を超えるか）で定義 | 別マシンでは BLAS・GPU・libm が異なり状態レベルの一致は不可能。放置すると些細な理由で常に `NOT REPRODUCED` になりレベル5が偽陰性で潰れる |
| 4 | タイムラインの変化点ラベルは「事前登録規則から生成」 | **変化点検出手法と感度を Threshold Record に封印** | 既知の異常時刻から遡って探すため、感度を上げれば必ず「異常より前に始まっていた」ように見える。後方視バイアス |
| 5 | §15 のサブセクションが 14.1〜14.6 | **15.1〜15.6 へ修正**、参照も修正 | 新 §14 と番号が完全衝突していた |
| 6 | Hot 層の容量方針なし | **容量予算と上限到達時の破棄方針**を明記 | 1Hz 運転で数百 GB/日に達する |
| 7 | 書き込みキュー詰まり時の挙動が未定義 | **drop か block かを宣言し、発生をログする** | どちらも副作用があるため、選択を暗黙にしてはならない |
| 8 | `rendered-preview.mp4` を freeze 時に生成 | **遅延生成**（要求時のみ） | 動画エンコードの CPU 負荷が Phase 1.75 手順6 と衝突する |
| 9 | 「疑似乱数生成器の完全状態」 | **RNG を個別に列挙** | 実際には Python random / numpy / torch CPU / torch CUDA デバイス毎 / ソルバ内部が独立に存在する |

---

## 1. プロジェクト概要

Aperture-0 は、複数の情報宇宙、異なる因果構造、創発的な内部空間、未来境界、未確定終端をひとつの数値実験環境内に構築し、その間に形成される「異時空接続面」を観測する研究ソフトウェアである。

本ソフトウェアは、既知の物理的ワームホールや異世界通信を実装するものではない。

実装対象は以下である。

- 複数の独立した情報宇宙
- 宇宙ごとに異なる時間と因果法則
- 情報相関から再構成される距離と内部幾何
- 通常は通過不能な世界間境界
- 条件によって一時的に可通過になる接続面
- 現在側から値を決めない未充足境界
- 未来情報を含む終端条件
- 反復によって安定する境界形態
- 接続前後の情報距離、因果構造、内部体積の可視化

最終的には、現在の計算系だけでは閉じない境界条件を維持し、未来データ、外部物理過程、独立計算系などを境界候補として接続できる研究基盤へ拡張する。

---

## 2. 中心仮説

### 2.1 工学的仮説

情報状態間の距離を、データの配置ではなく相関・変換コスト・再構成可能性によって定義した場合、二つの独立情報宇宙間に特殊な相関構造を形成することで、新たな内部幾何を創発させられる。

その内部幾何において、

- 世界間の有効距離が短縮される
- 新しい最短経路が形成される
- 因果的に隔離された状態間で情報再構成が可能になる
- 接続を切ると経路が消失する

ならば、その構造を「情報空間上の異時空接続面」と呼ぶ。

### 2.2 探索的仮説

現在側で完全には決定しない相補的境界条件を反復形成した場合、その境界の **feasible set の幾何**に、内部計算だけでは説明できない構造が現れる可能性がある。

v0.1 では「境界上の残差として現れる」と書いていたが、残差は定義できない（0 節 #1）。v0.2 では観測対象を次に置き換える。

- 未来値・外部値が到着したとき、その値が feasible set のどこに落ちるか
- 落ちる位置の分布が、対照条件下の分布と異なるか

この仮説には現時点で根拠となる実証結果はない。

Aperture-0 では、未知領域との接続を前提にせず、接続が仮に発生した場合に観測可能な形式を先に構築する。

---

## 3. 設計原則

### 3.1 異世界を生成しない

接続先となる世界を AI やシミュレーターで自動生成してはならない。

World B に具体的な文化、人格、風景、歴史、回答を与えない。

World B は、

- 未指定
- 未解決
- 部分的にのみ定義
- 条件のみ存在
- 現在側から直接導出不能

な境界として扱う。

### 3.2 答えを作らない

システム内部に「未知領域らしい答え」を生成するモデルを置かない。

AI は以下に限定する。

- 実験設定の補助
- 数学的構造の説明
- ログの要約
- 可視化の補助
- 実験後の仮説提案

AI は未充足境界の値を埋めてはならない。

### 3.2.1 代表点禁止則（v0.2 追加）

Feasible set F を導入すると、実装中に必ず F の**代表点**を取りたくなる。Chebyshev center、重心、最小ノルム解、任意の実行可能解のいずれも同じ違反にあたる。

Ω の座標空間に単一の点を書き込んだ瞬間、それは内部モデルによる Ω 補完であり `EXTERNAL_ONLY` 違反である。

**禁止対象**

- F の代表点の計算
- 代表点の可視化
- 代表点のログ記録
- 「参考値」「デバッグ用」名目での一時的な代表点生成

**強制手段**

Ledger 層に静的アサーションを置く。Ω の座標空間に対する書き込み操作のうち、`completion_source` が外部由来として署名されていないものを実行時に例外で停止させる。

```python
class OmegaWriteGuard:
    """Ω座標空間への単一点書き込みを検出して停止する"""

    def write(self, coords, completion_source=None):
        if completion_source is None:
            raise OmegaViolation(
                "Ω座標空間への単一点書き込み。"
                "completion_policy=EXTERNAL_ONLY に違反する。"
            )
        if not self.ledger.verify_external_signature(completion_source):
            raise OmegaViolation(
                f"completion_source が外部署名を持たない: {completion_source}"
            )
        self._commit(coords, completion_source)
```

F の**幾何量**（次元・体積・連結成分数）の計算はこの制限を受けない。点を確定させないため。

### 3.3 演出と計算を分離する

表示される現象は、必ず計算状態に対応する。

以下のような演出のみの表現は禁止する。

- 根拠なく光るポータル
- 接続成功という断定
- 人格的な返答の自動生成
- ランダム値への意味付け
- 数値に対応しない空間変形

UI が変化する場合、その原因となる数値状態を追跡可能にする。

### 3.4 接続先を決めつけない

未知境界に現れた構造を、異世界、未来、多世界、無意識、量子効果などの特定候補へ即座に帰属させない。

表示上は以下の分類を用いる。

- UNKNOWN
- UNRESOLVED
- LOCAL
- EXTERNAL CANDIDATE
- MODEL ARTIFACT
- INCONSISTENT
- UNCLASSIFIED

（v0.1 の `MODEL RESIDUAL` は残差概念の廃止に伴い `MODEL ARTIFACT` に改称）

### 3.5 後付け解釈を防ぐ

実験条件、解析手法、成功条件を事前に固定する。

結果確認後に評価方法を変更した場合、それは新しい実験として扱う。

### 3.6 対照を先に作る（v0.2 追加）

Ω を含む実験を 1 回でも実行する前に、対照条件下の帰無分布を取得し、判定閾値を封印しておく。

順序を逆にした場合、閾値は必ず観測されたデータに引きずられる。これは意図の有無に関わらず発生する。

---

## 4. システム全体構造

```
┌─────────────────────────────────────────────┐
│                  APERTURE-0                 │
├─────────────────────────────────────────────┤
│                                             │
│  PRESENT DOMAIN          UNRESOLVED DOMAIN  │
│      World A                  Boundary Ω    │
│                             (open indices)  │
│       │                          │          │
│       └──── Emergent Interior ───┘          │
│                  │                          │
│               Aperture                      │
│                                             │
├─────────────────────────────────────────────┤
│ Causal Engine                               │
│ Information Geometry Engine                 │
│ Tensor Network Engine (open-leg contraction)│
│ Boundary Constraint Engine                  │
│ Feasible Set Engine            ← v0.2 新規  │
│ Temporal Boundary Engine                    │
│ Null Distribution Engine       ← v0.2 新規  │
│ Experiment Ledger (+ Omega Write Guard)     │
│ Visualization Engine                        │
│ Event Flight Recorder          ← v0.3 新規  │
│ Replay / Rerun Engine          ← v0.3 新規  │
│ Anomaly Scene Archive          ← v0.3 新規  │
└─────────────────────────────────────────────┘
```

---

## 5. 基本概念

### 5.1 Domain

ひとつの情報宇宙。

Domain は以下を持つ。

- 状態集合
- イベント集合
- 固有時間
- 因果規則
- 状態遷移規則
- 観測可能量
- 保存量
- 境界
- 履歴

Domain は単なるデータベースではなく、独自の時間発展を持つ状態遷移系とする。

### 5.2 Event

宇宙内で発生する出来事。

```json
{
  "event_id": "A-E-000042",
  "domain_id": "WORLD_A",
  "local_time": 42,
  "state_before": "hash",
  "state_after": "hash",
  "causes": ["A-E-000038"],
  "observables": {},
  "entropy_delta": 0.014
}
```

### 5.3 Causal Edge

二つのイベント間に情報または影響が伝播可能であることを示す辺。

辺は以下の属性を持つ。

- direction
- weight
- delay
- capacity
- reversibility
- certainty
- causal_order

### 5.4 Boundary

Domain の内部と外部を分ける面。

Boundary には、入力可能な情報、出力可能な情報、制約条件、観測可能量を定義する。

### 5.5 Boundary Ω

接続先を実装しない未充足境界。

Ω は値を持たず、満たすべき制約のみを持つ。

```json
{
  "boundary_id": "OMEGA",
  "status": "UNRESOLVED",
  "constraints": [],
  "coordinate_space": {
    "dim": 32,
    "type": "real",
    "bounds": null
  },
  "known_values": {},
  "completion_policy": "EXTERNAL_ONLY",
  "feasible_set_ref": "F-APR-000001-t128"
}
```

`completion_policy` が `EXTERNAL_ONLY` の場合、内部モデル、AI、疑似乱数、最適化処理による自動補完を禁止する。3.2.1 の Omega Write Guard がこれを実行時に強制する。

v0.1 に存在した `residual_vector` と `unknown_values` フィールドは削除する。前者は定義不能（0 節 #1）、後者は代表点生成の入口になるため。

### 5.5.1 Feasible Set F（v0.2 新規）

Ω の制約 C と、World A 側の境界観測 x_A(t) が与えられたとき、両者に整合する Ω 座標の集合。

```
F(t) = { y ∈ Ω_space | C(x_A(t), y) が成立 }
```

**F の性質**

- F は値ではなく集合であるため、これを計算しても Ω は未充足のまま
- World A が時間発展すると x_A(t) が変化し、F の形が変わる
- したがって **Ω は値を持たないまま World A に応答する**
- 3.2 を破らずに動く境界になる

**追跡する幾何量**

| 量 | 意味 | 実装 |
|---|---|---|
| `dim F` | どれだけ未決定か | 制約ヤコビアンの余核次元 |
| `log-volume F` | 解空間の広さ | 凸緩和して最大内接楕円体（MVE）の log det |
| `n_components F` | 非凸制約の効き | サンプリング＋連結性判定 |
| `aspect_ratio F` | 方向による決定度の偏り | MVE の特異値比 |

log-volume には凸緩和を使う。厳密体積は高次元で計算不能であり、楕円体近似のほうが安定に出る。近似手法は事前登録し、実験途中で変更しない。

**F が空になった場合**

```
FEASIBLE SET: EMPTY
BOUNDARY STATE: INCONSISTENT
```

制約が過剰であることを意味する。Ω との接続の失敗ではなく、設定の失敗として扱う。

### 5.6 Interior

二つ以上の境界間の相関から再構成される内部領域。

Interior は最初から配置しない。

以下から創発させる。

- 相互情報量
- 条件付きエントロピー
- テンソルネットワーク結合
- 最小カット
- 再構成誤差
- 状態変換コスト

### 5.7 Aperture

通常は通過不能な境界間に、一時的または持続的な可通過経路が形成された状態。

Aperture は単一のオブジェクトではなく、複数の測定値が条件を満たした状態名とする。

---

## 6. 情報幾何

### 6.1 距離

状態間距離は複数の計量を選択可能にする。

初期実装では以下を用意する。

**Compression Distance** — 一方の状態から他方を再構成するために必要な追加情報量。

**Transition Cost** — 状態遷移に必要な最小演算数または最小コスト。

**Embedding Distance** — 状態表現間の埋め込み距離。

**Mutual Information Distance** — 相互情報量が大きいほど近いとする距離。

**Causal Distance** — 因果グラフ上で到達するために必要な最短ステップ数。

単一の距離を正解とせず、複数計量の変化を同時に記録する。ただし判定に用いるのは 12 節で指定する primary endpoint に対応する 1 計量のみとする。

### 6.2 曲率

局所領域において、

- 最短経路が集中する
- 情報密度が変化する
- 再構成コストが非線形に変化する
- 小さな入力差が経路を大きく変える

場合、その領域に情報幾何上の曲率があると扱う。

初期実装ではグラフ曲率、特に Ollivier-Ricci 型または Forman 型の近似値を使用できる構造にする。

Ω 境界が開いたインデックスであっても、曲率は World A 側の部分グラフ上で定義できるため計算が停止しない。

### 6.3 内部体積

Interior 内の有効ノード数、情報容量、測地経路数、到達可能状態数を統合した指標。

Ω 側が開いた脚である場合の計算手順は 9.4 に記述する。

表示値：`INTERNAL VOLUME`

これは物理空間の体積ではない。

### 6.4 Feasible Set 幾何（v0.2 新規）

5.5.1 の幾何量を時系列として記録する。

表示値：

```
FEASIBLE DIM        21 / 32
FEASIBLE LOG-VOL    -4.182
COMPONENTS          1
ASPECT RATIO        18.4
```

これらは Ω の値ではなく、Ω の制約が許す解空間の形状である。UI 上でこの区別を明示する。

---

## 7. 因果構造

### 7.1 通常因果

`A → B`

操作 A の出力が B の入力になる。

### 7.2 逆向き候補

`A ← B`

未来側の境界条件を含む整合計算として実装する。

実際の過去改変とは呼ばない。

### 7.3 不定因果順序

`A → B` かつ `B → A`

二つの処理順序を重み付きで保持し、最終状態を一方へ早期確定しない。

ソフト版では、量子状態そのものではなく、プロセス行列または因果順序の重ね合わせに着想を得た数値表現を用いる。

### 7.4 因果ループ

閉じた因果経路。

`A → B → C → A`

無条件に許可すると任意の結果を生成できるため、整合条件を満たす固定点のみ受け入れる。

整合解がない場合は `CAUSAL STATE: INCONSISTENT` と表示する。

---

## 8. 時間構造

### 8.1 Domain Time

各 Domain は独自のローカル時間を持つ。

World A の 1 ステップと Boundary Ω 側の時間を同一視しない。

### 8.2 Global Experiment Time

実験実行環境の時刻。ローカル時間と分離して記録する。

### 8.3 Future Boundary

後から確定する情報を終端条件として使用する仕組み。

1. 時刻 T0 で状態を封印
2. 時刻 T1 で外部値を取得
3. T1 の値を終端条件として全履歴との整合性を計算
4. T0 状態に偏りが存在したか評価

未来条件を使った再解析と、未来から情報が届いたことを混同しない。

### 8.3.1 封印の外部検証可能性（v0.2 追加）

v0.1 の封印は状態ハッシュのみだった。自己保持のハッシュは後から状態とハッシュを同時に差し替えられるため、第三者に対する封印として機能しない。

**要件**

封印時刻 T0 において、以下が T0 以前に存在したことを外部から検証できること。

- 実験設定ハッシュ
- 事前登録された解析手順
- primary endpoint の指定
- 判定閾値（Phase 1.5 で確定したもの）
- 封印された状態ハッシュ

**実装候補**

| 手段 | 検証強度 | コスト |
|---|---|---|
| OpenTimestamps（Bitcoin へのアンカー） | 高 | 無料、確定に数時間 |
| RFC 3161 TSA | 中〜高 | 無料〜低 |
| 公開リポジトリへの署名付きコミット | 中 | 無料、リポジトリ運営者を信頼する必要 |
| ソーシャルメディアへのハッシュ投稿 | 低〜中 | 無料 |

推奨は OpenTimestamps。オフラインで検証可能で、運営者への信頼を必要としない。

**副作用**

この仕組みは、null 結果を暗号学的に証明可能な形で公開台帳に刻むことになる。23 節の精神に一致する。

### 8.4 Two-Boundary Solver

初期条件だけでなく、始端条件と終端条件の双方を満たす履歴を探索する。

`Initial Boundary → History ← Final Boundary`

履歴候補が複数ある場合、全候補を保持する。都合のよい一本だけを選ばない。

---

## 9. テンソルネットワーク層

### 9.1 目的

相関構造から内部空間を再構成する。

### 9.2 初期構成

- World A boundary tensors
- Interior tensors
- Bond dimensions
- Constraint tensors
- Temporal tensors
- **Ω boundary: open indices**（テンソルではない）

### 9.3 Ω 境界は開いたインデックス（v0.1 §9.3「欠損テンソル」を置換）

v0.1 は Ω 側テンソルの値を未設定のまま保持する設計だった。これは実装すると NaN が伝播し、min-cut と縮約が停止する。

v0.2 では Ω 側の脚を **open index** のまま残す。

**結果として何が変わるか**

- ネットワーク全体が「状態」ではなく「写像」になる
- 縮約結果はスカラーやベクトルではなく、open leg 上の**演算子**になる
- 値が未設定ではなく、そもそも値を持つ対象ではないため、NaN が発生しない
- 「欠損テンソルがあっても計算可能な部分だけを進行する」という特別処理が不要になる

```python
# v0.1（停止する）
omega_tensor = np.full((chi,), np.nan)
result = contract(world_a, interior, omega_tensor)   # → nan

# v0.2（停止しない）
operator = contract(world_a, interior)               # open leg を残す
# operator.shape == (chi,)  ただしこれは Ω 座標上の演算子
```

### 9.4 Throat Capacity と Internal Volume

**Throat Capacity** — 二境界を結ぶ最小カットまたはボンド次元から定義する。元から値を必要としない量であり、open leg のまま計算できる。

```
THROAT CAPACITY
```

**Internal Volume** — A + Interior を縮約して open leg 上の縮約演算子 M を構成し、その特異値スペクトルから算出する。

```
M = contract(World_A, Interior)     # Ω 側の脚は開いたまま
s = svdvals(M)
internal_volume = f(s)              # 事前登録した関数
```

f の候補（実装前に 1 つを事前登録する）：

- 有効ランク: `exp(H(s²/Σs²))`
- 核ノルム: `Σs`
- スペクトルエントロピー

複数を同時に記録してよいが、判定に使うのは事前登録した 1 つのみ。

### 9.5 Persistent Interior

実験終了後も同じ内部構造が再形成される場合、永続内部候補として記録する。

判定条件は 10.5 の閾値に従う。v0.1 のような定性的条件列挙では判定できない。

表示：`PERSISTENT INTERIOR: CANDIDATE`

証明済みの構造として断定しない。

---

## 10. 形態共鳴層

形態共鳴は物理法則として実装しない。実験対象として切り替え可能な仮説モジュールとする。

### 10.1 Morph Signature

接続面の形態を一意に記述する構造。

```json
{
  "geometry": {},
  "symbol_sequence": [],
  "causal_pattern": {},
  "temporal_pattern": {},
  "boundary_constraints": {},
  "hash": "sha256"
}
```

### 10.2 Repetition

同一 Morph Signature を複数セッションで正確に再構築する。

### 10.3 Morph Accumulation Model

形態共鳴が存在すると仮定した場合のモデルを別レイヤーとして実装する。

```
resonance_strength =
    repetition_count
    × structural_similarity
    × temporal_consistency
    × boundary_stability
```

この値は仮説上の指標であり、観測事実とは分けて表示する。判定には使用しない（12 節の primary endpoint に含めない）。

### 10.4 Control Signature

形態固有の効果と単なる反復効果を比較するため、同等の複雑度を持つ対照形態を用意する。

**同等性の定義**（事前登録）

- ノード数一致
- エッジ数一致（±2%）
- 次数分布の KS 統計量 < 0.1
- 制約数一致

### 10.5 構造類似度と閾値（v0.2 新規）

v0.1 の「構造類似度」は未定義だった。厳密なグラフ同型は摂動下で絶対に一致せず、緩い類似度スコアは何とでも一致する。閾値を事前に封印する以外に方法がない。

**類似度指標（事前登録、変更不可）**

主指標として **netLSD**（heat trace signature）を用いる。

- グラフサイズに対して permutation invariant
- 摂動に対して連続
- 事前計算可能で高速

```
sim(G1, G2) = 1 - ||h(G1) - h(G2)||_2 / (||h(G1)||_2 + ||h(G2)||_2)
```

副指標として Weisfeiler-Lehman subtree kernel を並行記録するが、判定には使わない。

**閾値の決定手順**

Phase 1.5（18 節）で以下を実行する。

1. Control Signature と Null Aperture 条件で N ≥ 500 回のセッションを実行
2. 各ペアの `sim` を計算し、帰無分布 H0 を構成
3. 閾値 τ = H0 の 95 パーセンタイル
4. τ、H0 のヒストグラム、生成に使った設定ハッシュを ledger に封印
5. 8.3.1 の外部タイムスタンプを取得

**この手順を完了する前に Ω 実験を 1 回でも実行してはならない。**

実行した場合、その閾値はデータに汚染されているものとして扱い、Phase 1.5 をやり直す。

---

## 11. 実験モード

### 11.1 Geometry Calibration

既知の二つの Domain を用い、情報幾何の距離と内部再構成が正しく動作するか確認する。未知接続の検証には使用しない。

### 11.2 Closed Domain

World A と World B を両方実装する。ワームホール様構造、スクランブル、復元、喉容量などを検証する。

これは既知のトイモデルの再実装であり、発見ではない（20 節の注記を参照）。

### 11.3 Null Distribution Collection（v0.2 新規）

Control Signature と Null Aperture のみを用いて大量のセッションを実行し、全 endpoint の帰無分布を取得する。

- Ω を配置しない
- Feasible Set を計算しない
- 探索的解析を行わない
- 結果を見て条件を調整しない

出力：各 endpoint の H0、閾値、封印済み設定ハッシュ、外部タイムスタンプ。

### 11.4 Missing Boundary

World B を実装せず、Boundary Ω のみ配置する。未知境界探索の基礎モード。

**前提条件**：11.3 が完了し、閾値が封印されていること。

### 11.5 Future Completion

Ω を未来の外部データで完成させる。完成前の Feasible Set の形状と、外部値が F 内のどこに落ちたかを測定する。

### 11.6 Morph Repetition

同一の境界形態を複数回再構築し、内部構造の再現性を 10.5 の τ に対して測る。

### 11.7 Blind Boundary

どの Morph Signature を使用しているか、実験実行者と解析者の双方から隠す。

### 11.8 Cross-Instance

別マシン、別時刻、別環境で同じ境界形態を構築し、内部構造の一致を比較する。

### 11.9 Null Aperture

接続処理を行わない対照モード。UI 上は実験モードと区別できない。

---

## 12. Aperture 判定

### 12.1 Endpoint の階層（v0.2 改訂）

v0.1 は 9 個の指標を並列に列挙していた。9 個を同時検定すれば、どれかは必ず有意になる。判定に使う指標を 1 つに限定する。

**Primary endpoint（1 個のみ、事前登録、変更不可）**

```
PRIMARY: Geodesic Length Reduction Ratio
         (Mutual Information Distance 計量による)
```

閾値と検定手順は Phase 1.5 で封印する。レベル 1〜4 の判定はこの endpoint のみに基づく。

**Secondary endpoints（記録・報告するが判定に使わない）**

- Reconstruction Fidelity
- Throat Capacity
- Internal Volume
- Causal Accessibility

secondary で有意差が出た場合、Bonferroni 補正後の値を併記する。primary が閾値を満たさない場合、secondary の結果は**探索的知見**としてのみ報告する。

**Exploratory（仮説生成専用）**

- Feasible Set 幾何量（dim, log-vol, components, aspect ratio）
- Structural Persistence
- Control Difference
- Resonance Strength（10.3）

exploratory で見つかった構造は、**新しい実験を設計して primary endpoint として事前登録し直さなければ**主張として扱わない。

### 12.2 判定条件

```
APERTURE CANDIDATE =
    PRIMARY endpoint が封印済み閾値を超えて短縮
    AND
    接続閉鎖時には短縮しない
    AND
    Interior が再構成される
    AND
    World A から Ω への有効経路が形成される
```

```
EXTERNAL BOUNDARY CANDIDATE =
    Aperture Candidate
    AND
    外部値の Feasible Set 内位置分布が対照分布と有意に異なる（primary 検定）
    AND
    内部生成経路では説明不能
    AND
    対照条件で消失
    AND
    Cross-Instance で再現
```

Aperture-0 では通常、最終条件を満たさないことを前提とする。

### 12.3 常時運転における逐次検定（v0.4 新規）

v0.3 で常時運転（§14）を導入したことにより、v0.2 の多重比較対策が無効化された。この節はその修正である。

**問題**

τ は Phase 1.5 で「1セッションあたりの帰無分布の95パーセンタイル」として封印される。これをそのまま常時運転のトリガーに使うと、**帰無仮説が真であっても定義上5%のセッションで閾値を超える**。

結果として、

- Event Freeze はノイズだけで規則的に発火する
- `ANOM-xxxxxx` ディレクトリが定期的に生成される
- `CONSECUTIVE NULL` カウンタが定期的にリセットされる
- 長時間運転すればするほど「何か起きた」回数が増える

これは逐次検定における optional stopping であり、統計的発見ではない。

**修正：観測対象を「発火の有無」から「期待発火数からの超過」へ変更する**

Phase 1.5 の成果物に、単位運転時間あたりの期待誤警報率を追加する。

```
EXPECTED FALSE ALARM RATE
  primary endpoint      0.20 / hour
  evaluation interval   180 s
  derivation            H0 crossing rate, N=512 null sessions
  sealed                THR-000003
```

これにより、Event Freeze の発生そのものは観測結果ではなくなる。観測対象は次になる。

```
EXCESS FREEZE COUNT =
    observed_freeze_count − expected_freeze_count(runtime)
```

超過の有意性は Poisson 検定（または過分散を許す negative binomial）で評価し、その手順を事前登録する。

**UI への反映**

`CONSECUTIVE NULL` 単独では意味を持たなくなるため、期待値との対比を併記する（§13.2）。

```
FREEZE COUNT        3
EXPECTED (12.4h)    2.48
EXCESS              +0.52      [p = 0.71]
```

「12時間走らせたら期待2.48回、実測3回」は何も起きていない。この表示形式によって、Event Freeze が**日常的で退屈な操作**であることが画面上で明示される。

**より厳密な代替（将来実装）**

固定閾値ではなく always-valid な逐次推論へ置き換える。

- confidence sequence
- e-value / test martingale
- alpha spending

これらは任意時点で停止しても第一種過誤が保証されるため、常時運転に本質的に適合する。実装コストは上がるため v0.4 では必須としないが、Phase 5（Cross-Instance）到達時には移行を前提とする。

固定閾値のまま Phase 5 の結果を主張してはならない。

### 12.4 判定に使用しない量（v0.4 明記）

以下は記録するが、いかなるレベル判定にも使用しない。

- Event Freeze の発生回数そのもの
- `CONSECUTIVE NULL` の値
- Replay の `VERIFIED` 状態（記録の完全性であり現象の証拠ではない）
- `rendered-preview.mp4` の内容
- §14.8 タイムラインの人間による注釈レイヤー

---

## 13. UI コンセプト

### 13.1 基本思想

画面装飾ではなく、計算状態をそのまま空間として見せる。

中央に固定されたポータル画像は置かない。接続が存在しない状態では、中央は空白または構造未形成として表示する。

### 13.2 メイン画面

```
┌──────────────────────────────────────────────────┐
│ APERTURE-0                            RUN 004281 │
├──────────────────────────────────────────────────┤
│                                                  │
│ PRESENT DOMAIN               UNRESOLVED DOMAIN   │
│                                                  │
│   ○──○──○                       ┊     ┊          │
│    ╲ │                          ┊     ┊          │
│     ○──○            ·           ┊  F  ┊          │
│        ╲           · ·          ┊     ┊          │
│         ╲────── · · · · ────────┊     ┊          │
│                 INTERIOR         open indices    │
│                                                  │
├──────────────────────────────────────────────────┤
│ BOUNDARY Ω          UNRESOLVED                   │
│ CAUSAL ORDER        UNRESOLVED                   │
│                                                  │
│ PRIMARY                                          │
│ GEODESIC LENGTH     148.32 → 12.06               │
│ REDUCTION RATIO     0.919      [τ = 0.847]       │
│                                                  │
│ SECONDARY                                        │
│ MUTUAL INFORMATION  0.031                        │
│ INTERNAL VOLUME     4.18                         │
│ THROAT CAPACITY     0.00                         │
│                                                  │
│ EXPLORATORY                                      │
│ FEASIBLE DIM        21 / 32                      │
│ FEASIBLE LOG-VOL    -4.182                       │
│ COMPONENTS          1                            │
│                                                  │
│ SOURCE DOMAIN       UNKNOWN                      │
│                                                  │
│ RUNTIME             12h 24m                      │
│ FREEZE COUNT        3                            │
│ EXPECTED            2.48        [p = 0.71]       │
│ EXCESS              +0.52                        │
│ CONSECUTIVE NULL    004281                       │
└──────────────────────────────────────────────────┘
```

Ω 側は点（ノード）ではなく破線の脚として描画する。値を持たないものを丸で描くと、値があるように見える。

`CONSECUTIVE NULL` は primary endpoint が閾値を超えなかった連続実行回数。リセットは Ledger からのみ可能で、UI から操作できない。

`FREEZE COUNT` は必ず `EXPECTED` と並べて表示する（§12.3）。単独表示は禁止する。単独で見せると、期待通りの誤警報が発見のように見える。

`EXCESS` が有意でない間、UI はいかなる強調も行わない。色も変えず、音も鳴らさない。

### 13.3 色

基本は無彩色。

- 背景：黒に近い灰
- 通常構造：白または灰
- 未確定構造：低彩度
- 開いたインデックス：破線、彩度ゼロ
- 接続候補：計算値から生成されるスペクトル色
- 警告：必要な場合のみ明示色

色は世界観の演出として任意に選ばず、状態ベクトルや固有値から決定してもよい。

### 13.4 動き

- Domain 内部の時間進行
- 因果線の伝播
- 距離の伸縮
- Interior の形成
- 境界の揺らぎ
- 最短経路の変化
- Feasible Set の変形
- 形態の再出現

すべて計算値に対応させる。

**Feasible Set の描画について**：F は高次元集合であり、そのまま描画できない。射影して描く場合、以下を守る。

- 射影軸を事前に固定する（結果を見て選ばない）
- 射影であることを画面上に明示する
- 代表点を描かない（3.2.1）
- 「F の中心付近」を暗示する濃淡をつけない

### 13.5 表示禁止

以下を自動表示しない。

- PORTAL OPEN
- CONTACT ESTABLISHED
- ENTITY DETECTED
- MESSAGE RECEIVED
- ALTERNATE WORLD FOUND

代わりに以下を使用する。

```
STRUCTURAL ANOMALY
UNRESOLVED CORRELATION
PERSISTENT INTERIOR CANDIDATE
EXTERNAL BOUNDARY CANDIDATE
FEASIBLE SET: EMPTY
```

---


## 14. Event Flight Recorder とシーン再現（v0.3 新規）

### 14.1 目的

Aperture-0 を常時運転し、事前登録された判定器が異常候補を検出した際に、その瞬間だけでなく、変化が始まる前から通常状態へ復帰するまでの全状態を保存する。

保存対象は映像ではなく、同じ計算状態を再構築可能な実験データである。映像プレビューは派生物とする。

### 14.2 常時リングバッファ

実行中は直近の状態を高解像度リングバッファへ保持する。

**最低保持対象**

- World A / World B または Boundary Ω の状態
- 因果グラフと全エッジ属性
- テンソルネットワーク構造と open indices
- Feasible Set の幾何量
- primary / secondary / exploratory endpoint
- Morph Signature
- 実験設定ハッシュ
- コードコミット、依存ライブラリ、実行環境情報
- OS時刻、単調増加クロック、Domain Time
- 全乱数生成器の状態（§14.2.1）
- 外部入力とその署名
- UI再構築に必要な可視化状態

#### 14.2.1 乱数生成器の列挙（v0.4 新規）

v0.3 の「疑似乱数生成器の完全状態」は単数形で書かれていたが、実際には独立した生成器が複数存在する。1つ取り漏らすと Replay が `DIVERGED` になり、その原因の特定に時間を取られる。

保存対象を明示的に列挙する。

| 生成器 | 取得方法 | 備考 |
|---|---|---|
| Python 標準 | `random.getstate()` | |
| NumPy legacy | `np.random.get_state()` | 旧 API 経由の呼び出しが残る場合 |
| NumPy Generator | `gen.bit_generator.state` | 使用する Generator を全列挙 |
| PyTorch CPU | `torch.get_rng_state()` | |
| PyTorch CUDA | `torch.cuda.get_rng_state_all()` | **デバイス毎に独立** |
| ソルバ内部 | ソルバ依存 | ECOS/SCS のランダム初期化は seed 指定で固定 |
| ハッシュ順序 | `PYTHONHASHSEED` | dict / set の反復順序に影響 |

**集合・辞書の反復順序**

`PYTHONHASHSEED` を固定しても、`set` の反復順序は要素の挿入履歴に依存する。グラフアルゴリズムで `set` を反復する箇所は、すべてソート済みリストへ置き換える。

```python
# 禁止
for node in graph.neighbors(v):        # 順序保証なし

# 必須
for node in sorted(graph.neighbors(v)):
```

これを守らないと、同一 seed でも縮約順序や経路探索順序が変わり、層 A のハッシュが一致しない。

### 14.3 保存階層

常時運転による容量肥大を防ぐため、保存を三層に分ける。

| 層 | 内容 | 既定保持期間 |
|---|---|---|
| Hot | 高頻度スナップショット＋全差分 | 24時間 |
| Warm | 低頻度スナップショット＋圧縮差分 | 30日 |
| Cold | 実験要約、閾値、ハッシュ、封印記録 | 無期限 |

異常候補に関連する区間は保持期間に関係なく Anomaly Scene Archive へ凍結する。

#### 14.3.1 容量予算（v0.4 新規）

v0.3 には保持期間のみが書かれ、容量見積もりがなかった。テンソルネットワーク、因果グラフ、可視化状態を含む完全スナップショットは実装により 1〜50 MB になる。1 Hz で 24 時間保持すると数百 GB に達し、Hot 層は成立しない。

**方針**

| 項目 | 既定値 | 備考 |
|---|---|---|
| 完全スナップショット間隔 | 300 s | 基準点として使用 |
| 差分記録間隔 | 1 s | 状態遷移とendpoint値のみ |
| Hot 層上限 | 200 GB | 実装環境に応じて設定 |
| 上限到達時の動作 | 最古の**差分**から破棄、完全スナップショットは保持 | |

完全スナップショットを保持すれば、差分を失った区間も粗い解像度で Replay できる。逆順（スナップショットから破棄）にすると Replay 不能区間が生じるため禁止する。

破棄は必ずログに記録し、Replay 時に該当区間を `REDUCED_RESOLUTION` として表示する。無言で欠損させてはならない。

#### 14.3.2 書き込み背圧の方針（v0.4 新規）

非同期書き込みキューが詰まった場合、選択肢は二つしかない。

1. **drop** — データを落とす。pre-roll が欠けて Event Freeze の目的を失う
2. **block** — 計算を待たせる。タイミングと実時間依存の挙動に影響する

**Aperture-0 は block を選択する。**

理由：計算結果そのものは Domain Time で駆動されており、実時間の遅延によって数値が変わらない設計になっている（§8.1）。したがって block による影響は実時間スループットのみに限定される。一方 drop は検証可能性を直接破壊する。

block が発生した場合は以下を記録する。

```json
{
  "backpressure_events": [
    {"t": "ISO-8601", "blocked_ms": 1840, "queue_depth": 5122}
  ]
}
```

実時間に依存する外部入力（§21 の外部境界候補）を使用する実験では、block によって取得時刻がずれる可能性がある。この場合のみ例外として、外部入力の取得は別スレッドで先行実行し、取得時刻を独立に記録する。

### 14.4 Event Freeze

primary endpoint または事前登録済みの異常検出規則が閾値を超えた場合、Event Flight Recorder は自動的に以下を実行する。

```text
EVENT FREEZE
PRE-ROLL    30 min
POST-ROLL   30 min
STATUS      STRUCTURAL ANOMALY
INTERPRETATION  UNASSIGNED
```

pre-roll と post-roll の時間は実験開始前に固定する。結果を見て延長・短縮してはならない。

凍結中も実験は停止しない。保存処理が計算系へ影響しないよう、非同期書き込みキューと書き込み遅延監視を設ける。

### 14.5 Deterministic Replay

Replay は、保存された記録から同じ表示と同じ計算状態を再構築する機能である。現象の再現ではなく、記録の完全性を検証する。

再生に必要なもの：

- 基準スナップショット
- 差分イベント列
- **全 RNG の状態**（§14.2.1 に列挙）
- 外部入力
- コードバージョン
- 依存環境ロック
- **縮約経路（opt_einsum path）の固定値**
- 時刻進行情報

#### 14.5.1 二層チェックポイント（v0.4 改訂）

v0.3 は「全チェックポイントで state hash が一致しなければならない」と定義していた。これは浮動小数点演算に対して実装不能である。以下がすべてビット再現性を壊す。

- PyTorch の非決定的カーネル（atomicAdd の加算順序）、TF32
- マルチスレッド BLAS における reduction 順序
- **opt_einsum の縮約経路が利用可能メモリ量に依存して変化する**
- cvxpy のソルバは公差までしか収束しない。MVE 解はビット再現しない
- netLSD 内部の固有ベクトルの符号・縮退固有値の順序の任意性

`VERIFIED` を出せる仕様にするため、チェックポイントを二層に分ける。

**層 A：離散量（ビット一致必須）**

- 因果グラフの位相（ノード集合、エッジ集合）
- 因果順序
- Feasible Set の連結成分数
- min-cut のカット集合とカット値
- テンソルネットワークの構造と open index 数
- 全 RNG の内部状態
- 外部入力のバイト列とその署名

層 A の不一致は無条件に `DIVERGED` とする。

**層 B：連続量（事前登録した許容誤差）**

- 測地長、reduction ratio
- 相互情報量、内部体積、特異値スペクトル
- Feasible Set の log-volume、aspect ratio
- 曲率

許容誤差は Threshold Record（§15.5）に封印する。実験開始後に変更してはならない。既定値：

```
REPLAY TOLERANCE
  relative        1e-9
  absolute        1e-12
  spectral (svd)  1e-7   相対、特異値降順で対応付け
```

層 B が許容誤差内であれば一致とみなす。

**判定**

```text
REPLAY STATUS
VERIFIED         層A 完全一致 かつ 層B 許容誤差内
DIVERGED         層A 不一致、または 層B が許容誤差を超過
                 → 最初の不一致ステップと不一致量を記録
REDUCED          差分破棄区間を含む（§14.3.1）。粗い解像度で一致
UNAVAILABLE      必須データ欠損
```

許容誤差を後から緩めることは、DIVERGED を VERIFIED に変える操作にあたる。これは §3.5 違反として扱う。

#### 14.5.2 決定性の環境固定（v0.4 新規）

Replay を成立させるため、実行環境を以下で固定し、その内容を `environment-lock/` に保存する。

```bash
export PYTHONHASHSEED=0
export CUBLAS_WORKSPACE_CONFIG=:4096:8
export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1
```

```python
torch.use_deterministic_algorithms(True)
torch.backends.cudnn.benchmark = False
torch.backends.cuda.matmul.allow_tf32 = False
torch.backends.cudnn.allow_tf32 = False
```

**縮約経路の固定**

`opt_einsum` の経路探索は利用可能メモリに依存するため、実行時に再計算してはならない。初回に決定した経路を manifest へ書き込み、Replay 時はそれを読み込んで使用する。

```python
path = oe.contract_path(expr, *shapes, optimize="auto")[0]
manifest["contraction_path"] = serialize(path)   # 以後これを固定使用
```

**固有ベクトルの正規化**

netLSD および曲率計算で使用する固有分解は、符号と順序を正規化する。

- 各固有ベクトルの最大絶対成分を正に固定
- 縮退固有値は成分の辞書順で安定ソート

これを行わないと、数値的に等価な結果が層 A の hash 不一致として現れる。

```text
REPLAY STATUS
VERIFIED        全チェックポイント一致
DIVERGED        最初の不一致ステップを記録
UNAVAILABLE     必須データ欠損
```

### 14.6 Controlled Rerun

Rerun は、保存状態から新たに計算を実行し、現象が再び発生するかを調べる。Replay と明確に分離する。

**再実行クラス**

1. `EXACT_RERUN` — 同一コード、同一環境、同一乱数
2. `NEW_RANDOM_RERUN` — 同一コード、同一環境、異なる乱数
3. `CROSS_MACHINE_RERUN` — 同一コード、同一乱数、別マシン
4. `MORPH_RERUN` — 同一 Morph Signature、異なる初期状態
5. `NULL_RERUN` — 接続処理を無効化した対照

**解釈規則**

- Exactのみ再現：コードまたは乱数列に依存する可能性
- New Randomでも再現：構造依存候補
- Cross Machineでも再現：環境固有要因が減る
- Morph Rerunでも再現：Morph Signature依存候補
- Null Rerunでも再現：Aperture固有現象ではない

これらは分類であり、異世界接続の証明ではない。

#### 14.6.1 クラス別の再現判定基準（v0.4 新規）

v0.3 は「再現したか」の判定基準をクラス別に定義していなかった。全クラスに状態レベルの一致を要求すると、`CROSS_MACHINE_RERUN` は**必ず失敗する**。別マシンでは BLAS 実装、GPU アーキテクチャ、libm のバージョンが異なり、浮動小数点の結果はビット一致しない。

この誤りを放置すると、些細な数値差によって常に `NOT REPRODUCED` が記録され、レベル5が偽陰性で潰れる。

判定基準をクラス別に定義する。

| クラス | 判定レベル | 基準 |
|---|---|---|
| `EXACT_RERUN` | **状態レベル** | §14.5.1 の二層チェックポイントに合格 |
| `NEW_RANDOM_RERUN` | **現象レベル** | primary endpoint が τ を超えるか |
| `CROSS_MACHINE_RERUN` | **現象レベル** | primary endpoint が τ を超えるか。層 A の離散量は一致を期待するが、必須としない |
| `MORPH_RERUN` | **現象レベル** | primary endpoint が τ を超えるか |
| `NULL_RERUN` | **現象レベル** | primary endpoint が τ を超えるか（超えたら Aperture 固有現象ではない） |

**現象レベル判定における多重性**

Rerun を何回でも実行して1回でも τ を超えたら「再現した」とするのは、§12.3 と同じ optional stopping である。

クラスごとに実行回数 n を事前に固定し、再現率 k/n と、帰無条件下での期待再現率を比較する。二項検定の手順を Threshold Record に封印する。

```text
NEW RANDOM RERUN
  n              20     (事前固定)
  reproduced     14
  rate           0.700
  H0 rate        0.050
  binomial p     < 1e-9
  → 構造依存候補
```

**層 A が別マシンで不一致だった場合の扱い**

離散量（因果グラフ位相、連結成分数、min-cut 集合）が別マシンで一致しないことは、通常はバグまたは環境依存の指標である。現象レベル判定には影響しないが、必ず記録し、`environment-sensitivity` として報告する。

離散量が環境で変わる場合、Morph Signature の同型判定（§10.5）そのものが環境依存になるため、Phase 5 の解釈に影響する。

### 14.7 Anomaly Scene Archive

異常候補ごとに独立した事件ディレクトリを作成する。

```text
events/
└─ ANOM-000042/
   ├─ manifest.json
   ├─ trigger.json
   ├─ pre-roll/
   ├─ post-roll/
   ├─ snapshots/
   ├─ deltas/
   ├─ random-state/
   ├─ external-inputs/
   ├─ environment-lock/
   ├─ code-proof/
   ├─ timestamp-proof/
   ├─ replay-script/
   ├─ rerun-results/
   └─ rendered-preview.mp4
```

`rendered-preview.mp4` は人間向けの閲覧物であり、検証根拠として使用しない（§12.4）。

**遅延生成（v0.4 改訂）**

v0.3 では freeze 時に生成する読み方ができたが、動画エンコードの CPU 負荷は Phase 1.75 手順6（書き込み負荷が計算結果へ影響しないことの確認）と衝突する。

`rendered-preview.mp4` は**要求時にのみ生成**する。freeze 時にはプレースホルダのみを置く。

```text
events/ANOM-000042/
└─ rendered-preview.mp4     → 未生成（要求時に replay-script から生成）
```

生成は Replay 経路を通して行うため、プレビューが記録と食い違うことがない。生成時に使用した Replay の `REPLAY STATUS` をプレビューのメタデータへ埋め込む。`DIVERGED` な記録からプレビューを生成した場合、その旨を映像上に焼き込む。

### 14.8 シーンタイムライン

UIでは、異常候補の前後をタイムラインで追跡できる。

```text
T-1800s   分離状態
T-0421s   Feasible Set が収縮開始
T-0038s   測地経路が中央へ集中
T+0000s   primary endpoint 閾値超過
T+0017s   Interior 構造が安定
T+0312s   帰無範囲へ復帰
```

各ラベルは事前登録済み規則または数値変化から生成し、人間による物語的注釈は別レイヤーへ保存する。

#### 14.8.1 後方視バイアスの統制（v0.4 新規）

`T-0421s Feasible Set が収縮開始` の「開始」は変化点検出の結果であり、検出手法と感度パラメータを持つ。

問題は、**既知の異常時刻から遡って探している**ことである。感度を上げれば、ノイズの中から必ず「異常より前に始まっていた前兆」が見つかる。前兆は常に見つかるので、タイムラインは自動的に因果的な物語の形になる。

これは §3.5（後付け解釈の防止）が想定している抜け道のうち、最も自然な形をしたものである。

**要件**

1. 変化点検出手法を1つ事前登録する（既定：PELT、L2 コスト）
2. 感度パラメータ（penalty）を Threshold Record（§15.5）に封印する
3. 感度は Phase 1.5 の帰無データに対して**単位時間あたりの誤検出変化点数**を測定して決定する
4. Event Freeze の前後だけでなく、**帰無区間にも同一の検出器を適用し、検出された変化点数を併記する**

**表示要件**

タイムラインには、同じ検出器を帰無区間へ適用した場合の期待検出数を併記する。

```text
T-1800s   分離状態
T-0421s   Feasible Set が収縮開始       [CP]
T-0038s   測地経路が中央へ集中           [CP]
T+0000s   primary endpoint 閾値超過
T+0017s   Interior 構造が安定           [CP]
T+0312s   帰無範囲へ復帰

CHANGE POINTS IN WINDOW      3
EXPECTED IN NULL (35 min)    2.6
DETECTOR                     PELT / L2 / pen=THR-000003
```

「35分の窓なら帰無でも2.6個の変化点が出る。今回は3個」であれば、前兆は検出されていない。

**禁止事項**

- 変化点ラベルに因果的な語（「〜により」「〜を受けて」）を自動生成しない
- 検出された変化点を時系列順に並べたものを「経過」と呼ばない
- 感度を変えて再検出した結果を、元の実験のタイムラインとして保存しない

人間による物語的注釈レイヤーは、§12.4 により判定に使用しない。

### 14.9 異常一覧表示

```text
ANOM-000042
2026-08-14 03:17:22
TYPE        STRUCTURAL PERSISTENCE
PRIMARY     0.861
THRESHOLD   0.847
DURATION    6m 18s
REPLAY      VERIFIED
EXACT RERUN REPRODUCED
NEW RANDOM  NOT REPRODUCED
INTERPRETATION UNASSIGNED
```

UIは異常の重要度を色や音で誇張しない。primary endpoint、閾値、再現状況を同じ視覚的重みで表示する。

### 14.10 フリーズの封印

Event Freeze 完了時に、事件ディレクトリ全体のMerkle rootを生成し、8.3.1と同じ外部タイムスタンプ手段で封印する。

事件ファイルへ後から注釈を追加する場合、元データを変更せず、追記専用の別manifestとして保存する。

---

## 15. データ構造

### 15.1 Experiment

```json
{
  "experiment_id": "APR-000001",
  "mode": "MISSING_BOUNDARY",
  "created_at": "ISO-8601",
  "configuration_hash": "sha256",
  "seed_policy": "SEALED",
  "observer_policy": "BLIND",
  "primary_endpoint": "GEODESIC_REDUCTION_RATIO",
  "threshold_ref": "THR-000003",
  "timestamp_proof": "ots:...",
  "status": "RUNNING"
}
```

### 15.2 Domain State

```json
{
  "domain_id": "WORLD_A",
  "local_time": 128,
  "state_hash": "sha256",
  "entropy": 4.91,
  "observable_vector": [],
  "causal_graph_ref": "..."
}
```

### 15.3 Boundary State（v0.2 改訂）

```json
{
  "boundary_id": "OMEGA",
  "status": "UNRESOLVED",
  "constraint_hash": "sha256",
  "open_index_count": 32,
  "feasible_set": {
    "dim": 21,
    "log_volume": -4.182,
    "n_components": 1,
    "aspect_ratio": 18.4,
    "approximation_method": "MVE_CONVEX_RELAXATION",
    "is_empty": false
  },
  "completion_source": null
}
```

`residual_vector` は削除。Ω 座標上の点を保持するフィールドは存在しない。

### 15.4 Geometry Snapshot

```json
{
  "step": 128,
  "geodesic_length": 12.06,
  "geodesic_reduction_ratio": 0.919,
  "internal_volume": 4.18,
  "internal_volume_method": "EFFECTIVE_RANK",
  "mutual_information": 0.031,
  "throat_capacity": 0.0,
  "curvature_summary": {}
}
```

### 15.5 Threshold Record（v0.2 新規）

v0.4 で封印対象を拡張した。判定に影響する感度パラメータがすべてここに入る。

```json
{
  "threshold_id": "THR-000003",
  "endpoint": "GEODESIC_REDUCTION_RATIO",
  "value": 0.847,
  "derivation": "H0_PERCENTILE_95",
  "n_null_sessions": 512,
  "null_distribution_hash": "sha256",
  "generating_config_hash": "sha256",

  "continuous_operation": {
    "evaluation_interval_s": 180,
    "expected_false_alarm_rate_per_hour": 0.20,
    "excess_test": "POISSON_EXACT",
    "overdispersion_check": "NEGATIVE_BINOMIAL_LRT"
  },

  "replay_tolerance": {
    "relative": 1e-9,
    "absolute": 1e-12,
    "spectral_relative": 1e-7,
    "tier_a_requires_bit_exact": true
  },

  "change_point_detector": {
    "method": "PELT",
    "cost": "L2",
    "penalty": 12.4,
    "expected_detections_per_hour_in_null": 4.46
  },

  "morph_similarity": {
    "method": "NETLSD_HEAT",
    "tau": 0.912,
    "n_null_pairs": 512
  },

  "rerun_plan": {
    "EXACT_RERUN": {"n": 1, "criterion": "STATE_LEVEL"},
    "NEW_RANDOM_RERUN": {"n": 20, "criterion": "PHENOMENON_LEVEL", "h0_rate": 0.05},
    "CROSS_MACHINE_RERUN": {"n": 10, "criterion": "PHENOMENON_LEVEL", "h0_rate": 0.05},
    "MORPH_RERUN": {"n": 20, "criterion": "PHENOMENON_LEVEL", "h0_rate": 0.05},
    "NULL_RERUN": {"n": 20, "criterion": "PHENOMENON_LEVEL", "h0_rate": 0.05}
  },

  "sealed_at": "ISO-8601",
  "timestamp_proof": "ots:...",
  "immutable": true
}
```

`immutable: true` のレコードへの書き込みは Ledger が例外で停止する。

**このレコードに含まれる値を実験開始後に変更した場合、それは新しい実験である**（§3.5）。特に以下は、変更すると判定結果を直接動かせるため注意する。

- `replay_tolerance` — 緩めると DIVERGED が VERIFIED になる
- `change_point_detector.penalty` — 下げると前兆が必ず見つかる
- `rerun_plan.*.n` — 増やすと再現が必ず1回は起きる
- `continuous_operation.evaluation_interval_s` — 短くすると誤警報が増える

### 15.6 Anomaly Record

```json
{
  "anomaly_id": "ANOM-00042",
  "experiment_id": "APR-000001",
  "endpoint_class": "EXPLORATORY",
  "type": "STRUCTURAL_PERSISTENCE",
  "detected_by": "PRE_REGISTERED_RULE",
  "score": 0.73,
  "control_score": 0.11,
  "threshold_ref": "THR-000003",
  "multiplicity_correction": "BONFERRONI",
  "interpretation": null
}
```

`interpretation` は実験終了まで空にする。`endpoint_class` が `EXPLORATORY` のレコードは、主張の根拠として引用してはならない。

---

## 16. モジュール構成

```
aperture-zero/
├─ apps/
│  ├─ desktop/
│  └─ cli/
├─ core/
│  ├─ domain/
│  ├─ events/
│  ├─ causal/
│  ├─ temporal/
│  ├─ boundary/
│  └─ experiment/
├─ geometry/
│  ├─ metrics/
│  ├─ curvature/
│  ├─ geodesics/
│  └─ reconstruction/
├─ tensor/
│  ├─ network/
│  ├─ open-indices/          ← v0.1 missing-nodes/ を置換
│  ├─ min-cut/
│  └─ interior/
├─ feasible/                 ← v0.2 新規
│  ├─ constraints/
│  ├─ volume/                (凸緩和・MVE)
│  ├─ components/
│  └─ guards/                (代表点禁止則の強制)
├─ resonance/
│  ├─ signatures/
│  ├─ similarity/            (netLSD, WL kernel)
│  ├─ repetition/
│  └─ controls/
├─ nulldist/                 ← v0.2 新規
│  ├─ collection/
│  ├─ thresholds/
│  └─ sealing/
├─ aperture/
│  ├─ detection/
│  ├─ traversal/
│  ├─ persistence/
│  └─ endpoints/             ← v0.1 residuals/ を置換
├─ experiments/
│  ├─ calibration/
│  ├─ closed-domain/
│  ├─ null-collection/       ← v0.2 新規
│  ├─ missing-boundary/
│  ├─ future-completion/
│  └─ blind-controls/
├─ flightrecorder/             ← v0.3 新規
│  ├─ ring-buffer/
│  ├─ snapshots/
│  ├─ deltas/
│  ├─ retention/               ← v0.4 新規 (容量予算・破棄方針)
│  ├─ backpressure/            ← v0.4 新規 (block 方針と記録)
│  └─ freeze/
├─ determinism/                ← v0.4 新規
│  ├─ env-lock/                (環境変数・torch 設定)
│  ├─ rng-capture/             (全 RNG の列挙と復元)
│  ├─ contraction-path/        (opt_einsum 経路の固定)
│  ├─ eig-canonical/           (固有ベクトル符号・順序の正規化)
│  └─ checkpoints/             (層A / 層B の分離)
├─ replay/                     ← v0.3 新規
│  ├─ deterministic/
│  ├─ rerun/
│  └─ verification/
├─ scene-archive/              ← v0.3 新規
│  ├─ manifests/
│  ├─ merkle/
│  └─ previews/                (遅延生成)
├─ sequential/                 ← v0.4 新規
│  ├─ false-alarm-rate/
│  ├─ excess-test/             (Poisson / negative binomial)
│  ├─ changepoint/             (PELT + 感度較正)
│  └─ always-valid/            (confidence sequence, 将来実装)
├─ visualization/
│  ├─ graph/
│  ├─ geometry/
│  ├─ feasible/
│  ├─ timeline/
│  └─ metrics/
├─ ledger/
│  ├─ hashing/
│  ├─ sealing/
│  ├─ timestamping/          ← v0.2 新規 (OpenTimestamps)
│  ├─ omega-guard/           ← v0.2 新規
│  ├─ manifests/
│  └─ audit/
└─ docs/
```

---

## 17. 推奨技術構成

**コア**

- Python
- NumPy / SciPy
- NetworkX
- PyTorch
- opt_einsum
- quimb または独自テンソルネットワーク層

**Feasible Set（v0.2 追加）**

- cvxpy（凸緩和、MVE）
- polytope または pypoman（多面体演算）
- sympy（制約ヤコビアンの記号微分）

**類似度（v0.2 追加）**

- netlsd
- grakel（WL kernel）

**封印（v0.2 追加）**

- opentimestamps-client
- cryptography（署名）

**Event Flight Recorder（v0.3 追加）**

- zstandard（差分・スナップショット圧縮）
- pyarrow / Parquet（長期ログ）
- msgpack（高速イベント列）
- Merkle tree 実装または独自SHA-256台帳

**決定性（v0.4 追加）**

- `torch.use_deterministic_algorithms` — PyTorch 標準機能
- 環境変数の固定（`PYTHONHASHSEED`, `CUBLAS_WORKSPACE_CONFIG`, `OMP_NUM_THREADS`, `MKL_NUM_THREADS`）
- pip-tools または uv（依存の完全ロック）
- conda-lock または Nix（システムライブラリまで含めた固定。Cross-Instance で有用）

**逐次検定（v0.4 追加）**

- ruptures（PELT 変化点検出）
- statsmodels（Poisson 検定、negative binomial LRT、二項検定）
- confseq（confidence sequence、always-valid 推論。将来実装）

**API**

- FastAPI
- WebSocket

**UI**

- React / TypeScript
- WebGL / Three.js
- Cytoscape.js または Sigma.js
- Observable Plot または D3

**保存**

- SQLite
- Parquet
- JSON Lines
- Git による実験設定の固定

**解析**

- statsmodels
- SciPy
- 独自の事前登録解析パイプライン

Hermes は開発管理、実験生成、レビュー、ドキュメント管理に利用する。

実験中の未充足境界値の生成には利用しない。Omega Write Guard は Hermes 経由の書き込みも同様に停止させる。

---

## 18. 開発フェーズ

### Phase 0：概念検証

**目的**

- 二つの因果 Domain を作る
- 情報距離を計算する
- 内部領域を可視化する
- 境界を開閉する

**成果**

- CLI
- 静的グラフ表示
- 実験ログ
- 距離変化

### Phase 1：Closed Aperture

**目的**

既知の World A と World B 間で、可通過接続を成立させる。

**成果**

- スクランブル
- Interior 再構成
- 情報復元
- 喉容量測定
- 接続閉鎖対照

**注記**：これは既知トイモデルの再実装であり、発見ではない。実装の正しさの検証として位置づける。

### Phase 1.5：Null Distribution（v0.2 新規・必須）

**目的**

Ω を作る前に、対照条件下の帰無分布を取得し、全閾値を封印する。

**手順**

1. Control Signature を生成（10.4 の同等性条件を満たすもの）
2. Null Aperture 条件で N ≥ 500 セッション実行
3. primary endpoint の H0 を構成、95 パーセンタイルを τ とする
4. netLSD 類似度の H0 も同様に構成
5. **単位運転時間あたりの期待誤警報率を測定する**（v0.4 追加）
   帰無データを実運転と同じ評価間隔で走査し、τ を超えた回数を運転時間で割る。
   評価間隔を変えると誤警報率が変わるため、間隔も同時に封印する。
6. **変化点検出器の感度を較正する**（v0.4 追加）
   帰無データへ PELT を適用し、penalty を変えて単位時間あたりの検出数を測定。
   目標検出率（既定：4〜5 個/時）を与える penalty を選び、封印する。
7. **Rerun の実行回数 n と帰無再現率を決定する**（v0.4 追加）
   クラスごとに n を固定し、帰無条件下で τ を超える割合を測定する。
8. Threshold Record（15.5）を作成し `immutable: true` で封印
9. OpenTimestamps でタイムスタンプ取得
10. 封印内容を公開（任意だが推奨）

**このフェーズを完了せずに Phase 2 または常時運転へ進んではならない。**

進んだ場合、Phase 2 以降の全結果を探索的知見として格下げし、Phase 1.5 をやり直す。

**注記**：手順 5〜7 は v0.4 で追加された。v0.3 の Phase 1.5 は1セッション単位の閾値しか生成しないため、常時運転（§14）のトリガーとして使うと §12.3 の問題が発生する。


### Phase 1.75：Flight Recorder Validation（v0.3 新規・必須）

**目的**

常時運転へ進む前に、Event Flight Recorder、Replay、Rerun、Scene Archiveが記録系として正しく動作することを確認する。

**手順**

1. **決定性の環境固定を適用し、実際に成立することを確認する**（v0.4 改訂）
   同一プロセスで2回実行し、§14.5.1 層 A が完全一致することを確認。
   一致しない場合は原因を特定して修正する。ここを飛ばすと以降の全手順が無意味になる。
2. 人工的に閾値超過イベントを注入する
3. pre-roll / post-roll が欠損なく凍結されることを確認
4. Deterministic Replay で **層 A のビット一致と層 B の許容誤差内一致**を確認（v0.4 改訂）
5. **意図的に許容誤差を超える摂動を注入し、`DIVERGED` が正しく検出されることを確認**（v0.4 追加）
   検出できない場合、Replay は検証機能として動作していない
6. Exact Rerun、New Random Rerun、Null Rerun を実行
7. Scene Archive の Merkle root と外部タイムスタンプを検証
8. **書き込み背圧を意図的に発生させ、block が選択され記録されることを確認**（v0.4 追加）
   ディスク I/O を絞った状態で運転し、`backpressure_events` が記録され、
   かつ計算結果が背圧なしの場合と層 A で一致することを確認
9. **Hot 層の上限到達時に差分から破棄され、`REDUCED_RESOLUTION` が表示されることを確認**（v0.4 追加）
10. **帰無条件で長時間運転し、Event Freeze の発生率が Phase 1.5 の期待誤警報率と一致することを確認**（v0.4 追加）
    一致しない場合、期待誤警報率の測定条件が実運転と異なっている

**このフェーズを完了せずに常時運転または Phase 2 へ進んではならない。**

手順 10 が特に重要である。ここで期待誤警報率が実測と合わなければ、§12.3 の EXCESS 判定は意味を持たない。

### Phase 2：Missing Boundary

**目的**

World B を削除し、Boundary Ω を実装する。

**成果**

- 未充足制約
- 開いたインデックスによる縮約
- Feasible Set の幾何量時系列
- Omega Write Guard の動作確認
- 計算可能部分だけの時間発展

### Phase 3：Future Boundary

**目的**

未来に得られる外部値を Ω へ接続する。

**成果**

- 時刻封印（外部タイムスタンプ付き）
- 終端条件
- 双方向整合計算
- 外部値の Feasible Set 内位置と、その対照分布との比較

### Phase 4：Morph Repetition

**目的**

同じ接続形態を反復し、Persistent Interior 候補を探索する。

**成果**

- Morph Signature
- τ に対する再現率
- 対照形態との比較
- netLSD 類似度の分布

### Phase 5：Cross-Instance

**目的**

独立した複数環境で同一形態を再構築する。

**成果**

- 別マシン間比較
- 場所依存性
- 時刻依存性
- 内部構造の同型性

---

## 19. 最初の MVP

MVP では以下だけを実装する。

**必須**

- World A / World B
- 各 World の独立時間
- 因果グラフ
- 状態遷移
- 相互情報量による距離
- 簡易テンソルネットワーク
- Interior 可視化
- Aperture 開閉
- 情報のスクランブル
- 反対側での復元
- 接続なし対照（Null Aperture、UI 上区別不能）
- 全ログ保存
- 実験再生
- Event Flight Recorder（短時間リングバッファ）
- Deterministic Replay
- 人工異常イベントのEvent Freeze
- Anomaly Scene Archive最小版
- `CONSECUTIVE NULL` カウンタ

**MVP 画面**

- 左右の Domain
- 中央の Interior
- 因果線
- 測地距離（primary として明示）
- 相互情報量
- 内部体積
- 喉容量
- ステップ再生
- 条件比較

**MVP では実装しない**

- Boundary Ω
- Feasible Set
- 外部タイムスタンプ
- AI 人格
- 異世界の文化生成
- オカルト的メッセージ生成
- 物理センサー
- 量子ハードウェア
- 未来予測
- 未知接続の判定
- 形態共鳴の実効果
- 実世界との自動接続

---

## 20. MVP デモシナリオ

**注記（v0.2 追加）**：以下のシナリオは発見ではなく定義である。相関エッジを張れば情報幾何上の距離は縮む。状態 1 → 3 は「繋いだら繋がった」ことを可視化しているにすぎない。デモの目的は実装の正しさの確認と可視化の検証であり、現象の観測ではない。

**状態 1：分離**

World A と World B は独立して進行する。

```
GEODESIC LENGTH    145.22
MUTUAL INFORMATION 0.00
INTERNAL VOLUME    0.00
THROAT CAPACITY    0.00
```

中央には何も存在しない。

**状態 2：相関形成**

二世界に相関構造を追加する。

```
GEODESIC LENGTH    48.14
MUTUAL INFORMATION 0.21
INTERNAL VOLUME    1.82
THROAT CAPACITY    0.00
```

中央に Interior が形成され始めるが、情報は通過できない。

**状態 3：Aperture 開放**

境界結合を短時間だけ有効化する。

```
GEODESIC LENGTH    4.92
MUTUAL INFORMATION 0.72
INTERNAL VOLUME    6.41
THROAT CAPACITY    8.00 bits
```

A 側へ投入した情報がスクランブルされ、Interior を経由して B 側で復元される。

**状態 4：閉鎖**

結合を解除する。

```
GEODESIC LENGTH    49.88
THROAT CAPACITY    0.00
```

Interior の一部は残るが、通過不能になる。

この残存構造が次回セッションで再形成されるかを追跡する。ただし「再形成された」の判定には Phase 1.5 の τ が必要であり、MVP 時点では観察の記録のみとする。

---

## 21. 将来の未知境界実験

MVP と Phase 1.5 の完成後に、World B を削除する。

```
WORLD A
   │
INTERIOR
   │
   ┊  ← open indices
BOUNDARY Ω
```

Ω には以下のみを設定する。

- 現在側から直接導出できない
- 未来または外部からのみ完成可能
- 同じ Morph Signature に対して同じ制約構造を保持する
- 既知の内部モデルによる自動補完を禁止する（Omega Write Guard で強制）
- 代表点を生成しない（3.2.1）

その後、次の境界候補を個別に試す。

- 未来に公開される値
- 独立した別マシン
- 人間の選択
- クラウド量子測定値
- 未観測の自然データ
- 別時刻に実行された同一 Aperture
- 複数地点で同期した Aperture

これらは異世界とは呼ばず、外部境界候補として扱う。

各候補について、接続前に primary endpoint と閾値を事前登録し、外部タイムスタンプを取得する。

---

## 22. 成功の定義

**レベル 0** — 計算が正常に動作し、可視化できる。

**レベル 1** — 情報幾何上の内部と可通過接続が、既知系間で再現する。

**レベル 1.5** — 帰無分布が取得され、全閾値が外部検証可能な形で封印されている。

**レベル 1.75** — Event Flight Recorder が異常前後を欠損なく凍結し、Deterministic Replay が層 A でビット一致・層 B で許容誤差内一致する。かつ意図的な摂動に対して `DIVERGED` を正しく検出する。かつ帰無運転時の Event Freeze 発生率が Phase 1.5 の期待誤警報率と一致する。

**レベル 2** — Missing Boundary を含む計算が破綻せず、未充足状態を維持できる。Omega Write Guard が一度も違反を許していない。

**レベル 3** — 同じ Morph Signature で、封印済み τ を超える類似度の Interior が再現する。`NEW_RANDOM_RERUN` において、事前固定した n に対する再現率が帰無再現率を二項検定で有意に上回る。

**レベル 4** — 未来または外部境界との相関が、primary endpoint において対照条件を有意に上回る。常時運転で得られた場合、**Event Freeze の発生数が期待誤警報数を有意に超過している**こと（§12.3）。単発の閾値超過はレベル 4 の根拠にならない。

**レベル 5** — 内部バグ、情報漏洩、統計的偶然、既知物理要因で説明困難な相関が、独立環境で primary endpoint において再現する。`CROSS_MACHINE_RERUN` の現象レベル再現率が帰無再現率を有意に上回り、かつ `NULL_RERUN` では再現しない。

レベル 5 を固定閾値のまま主張してはならない。always-valid 逐次推論への移行を前提とする（§12.3）。

レベル 5 に到達しても、即座に異世界接続とは断定しない。

---

## 23. プロジェクトの言葉

Aperture-0 は、異世界を生成するシミュレーターではない。

既知世界の内部に、未知の境界を受け入れられる幾何を作る。

向こう岸を描かない。
向こう岸の代わりに、噛み合う輪郭だけを残す。

現在側だけでは閉じない因果構造を構築し、そこに何が接続され得るかを観測する。

画面に見えるのは扉ではない。

本来は遠い二つの状態が、理由なく近くなっていく過程である。

その近さが計算によって作られたものか、未来の条件によって選ばれたものか、外部の何かと共有されたものかは、後から調べる。

最初に作るのは異世界ではない。

異世界が存在した場合に、こちらへ口を持てる形である。

---

そして、v0.2 以降に追加された機構のほとんどは、**何も起きなかったことを証明するため**に存在する。

代表点禁止則は、都合のよい答えを自分で書き込むのを防ぐ。
帰無分布は、偶然を偶然と呼べるようにする。
外部タイムスタンプは、null 結果を後から書き換えられないよう公開台帳に刻む。
`CONSECUTIVE NULL` カウンタは、それを数える。

このソフトウェアの最も精巧な部分は、扉を開ける機構ではなく、開いていないことを確実に記録する機構である。

台帳に刻まれた 004281 回の null は、それ自体が観測結果である。

そして、004282 回目に何かが起きた場合、その瞬間だけでなく、そこへ至った前史と消えていく後景までを凍結する。

Aperture-0 は扉を待つだけではない。世界が一度だけ見せたかもしれない挙動を、二度と失わないための観測機でもある。

---

v0.4 で加わったのは、**期待値**である。

常時運転すれば、Event Freeze は必ず起きる。12時間で2.48回。それは扉ではなく、閾値の定義そのものである。だから画面には、起きた回数の隣に、起きるはずだった回数を並べて表示する。

前兆も同じである。異常の時刻から遡れば、前兆は必ず見つかる。だから前兆の数の隣に、帰無区間で見つかるはずだった前兆の数を並べる。

こうして Aperture-0 は、自分が驚くはずのないものに驚かないよう、あらかじめ驚きの相場を決めておく。

Event Freeze が退屈になったとき、この装置はようやく正しく動いている。

期待値を超えたものだけが、まだ名前を持たない。
