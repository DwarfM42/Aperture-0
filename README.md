# Aperture-0

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

## Firebase Hosting

このリポジトリはFirebaseプロジェクト`aperture-0`向けに設定されており、`dist/`をsingle-page applicationとして配信します。

```bash
npm run build
firebase deploy --only hosting
```

ローカルbuildだけではサイトは公開されません。本番反映には、明示的なFirebase Hosting deployが必要です。
