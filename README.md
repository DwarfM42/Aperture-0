# Aperture-0

これはジョークアプリです。
**Aperture-0** は、既知領域における情報幾何キャリブレーションを可視化するWeb観測アプリです。[`docs/aperture-0-spec-v0.4.md`](docs/aperture-0-spec-v0.4.md) に定義された最初の実行可能範囲を実装しています。

🌐 **公開サイト:** [https://aperture-0.web.app/](https://aperture-0.web.app/)

> **既知のトイモデルであり、発見を示すものではありません。** 現在のバージョンは、境界 Ω、外部補完、異常・発見の主張、未知境界の代表値を実装していません。

## 現在の実装範囲

- World A / World Bによる決定論的なキャリブレーションシーケンス
- 4つの記録状態: `ISOLATED → CORRELATING → OPEN → CLOSED`
- スナップショットに基づくグラフとテレメトリの可視化
- v0.4で定義されたメトリクスを参照fixtureとして使用し、仕様に値がない項目は明確に未指定として表示
- 既知領域のapertureが`OPEN`の間だけ、ペイロードの入力・スクランブル・復元を許可
- 実験ID、状態順序、記録長、hash manifest、固定terminal hashに対して検証されるSHA-256スナップショットチェーン
- Firebaseプロジェクト`aperture-0`向けのHosting SPA設定

アーキテクチャの境界と受け入れ条件は、[`docs/phase-0-architecture.md`](docs/phase-0-architecture.md) に記載しています。

このPhase 0実装は、表示中のグラフから情報幾何メトリクスを計算するものではありません。画面に表示される数値は、v0.4から取得した決定論的な参照fixtureです。UI、型付きスナップショット契約、転送ゲート、記録検証経路の確認に使用しています。CLOSED状態の相互情報量と内部体積はv0.4で値が定義されていないため、`N/A`と表示します。

## 使い方

1. [公開サイト](https://aperture-0.web.app/)を開きます。
2. 画面左側の`SEQUENCE`から、確認したいスナップショットを選びます。
3. 中央下部のコントロールで記録を操作します。
   - `↺`: 最初の`ISOLATED`へ戻る
   - `▶`: 4状態を順番に自動再生する
   - `Ⅱ`: 自動再生を一時停止する
   - `→`: 次のスナップショットへ進む
4. 中央のグラフでWorld A、World B、内部領域の接続状態を確認します。
5. 右側のパネルで参照メトリクス、転送結果、flight recorderを確認します。

### 4つの状態

| 状態 | 表示内容 |
| --- | --- |
| `ISOLATED` | World AとWorld Bは分離され、独立したlocal clockで進みます。転送経路はありません。 |
| `CORRELATING` | 情報幾何学的な内部領域が形成されますが、throat capacityは0のままで、転送はできません。 |
| `OPEN` | 既知領域のapertureが開き、World Aの入力がWorld Bで復元・検証されます。 |
| `CLOSED` | 接続は閉じ、内部構造だけが残ります。転送はできません。 |

### 確認ポイント

- `TRANSFER PROBE`は`OPEN`のときだけ`PASS`および`PAYLOAD VERIFIED`になります。
- `ISOLATED`、`CORRELATING`、`CLOSED`では入力を注入せず、`NO TRAVERSABLE CHANNEL`と表示します。
- `FLIGHT RECORDER`の`REPLAY`が`VERIFIED`なら、記録されたスナップショット列の再検証に成功しています。
- `CHAIN`は最初のスナップショットで`GENESIS`、以降は前のhashへ接続された`LINKED`になります。
- 表示される数値はv0.4の参照fixtureであり、ライブ計算や未知現象の観測結果ではありません。

## 開発

必要環境: Node.js 22以上

```bash
npm install
npm run dev
```

品質確認:

```bash
npm test
npm run lint
npm run build
```

production buildのローカルプレビュー:

```bash
npm run preview
```
