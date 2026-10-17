# 八牌 HACHIHAI — オンライン対戦試作 β v0.7

既存のCPU対戦 (`index.html`) を残したまま、`multiplayer.html` から人間同士の対戦ができます。

## 仕組み

- 同一Wi-Fiと離れた場所の対戦は、**同じ公開サーバーと6桁の部屋番号**で動作します。
- `server.js` が山牌と両者の手牌、得点、ツモ、ロン、リーチを管理します。相手の手牌の中身は送信しません。
- 同じWi-Fiで**インターネットを使わず**遊びたい場合は、PCでサーバーを起動し、そのPCのLAN内IPアドレスに両端末からアクセスします。
- VercelはHTMLの公開に使えますが、**今回のNode.js WebSocketサーバーをVercelの静的配信だけで動かすことはできません**。Node.js WebSocketサービスを稼働させる別ホスティング（Render Web Serviceなど）が必要です。

## まずPCで試す（Windows / Node.js 20以上）

1. 解凍後のフォルダをPowerShellで開く。
2. `npm install` を実行する。
3. `npm start` を実行する。
4. PCのブラウザで `http://localhost:3000/multiplayer.html` を開く。
5. ブラウザ2タブで「部屋を作る」「部屋番号で参加」を行う。

同じWi-Fiのスマホでは `http://PCのLAN内IPアドレス:3000/multiplayer.html` にアクセスします。必要に応じてWindowsファイアウォールでプライベートネットワークのTCP 3000を許可してください。LAN内HTTPのブラウザではフルスクリーンやPWA機能に制限がかかることがあります。

## インターネット対戦（GitHub＋Render＋Vercel）

1. `index.html` ほかこのフォルダのファイルをGitHubの `hachihai` リポジトリにアップロード。旧 `index.html`, `sw.js` は上書きします。`node_modules` はアップロードしません。
2. RenderでGitHubリポジトリを選んで **Web Service** を新規作成します。
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Root Directory: リポジトリ直下なら空欄
3. Renderが発行する `https://<サービス名>.onrender.com` のURLから、`wss://<サービス名>.onrender.com` を作ります。
4. 既存Vercelの公開URLの `/multiplayer.html` を開いて通信サーバーURLにこの `wss://...` を入力します。
5. 片方が部屋を作り、もう片方が6桁の番号で参加します。双方が同じWi-Fiである必要はありません。

※ 無料サービスは休止・起動待ち・容量制限があり得ます。稼働条件は登録時に確認してください。

## 試作の制限

- サーバー再起動、切断で対局が失われます。再接続・観戦・待機中の離席タイムアウト以外の復旧機能は未実装です。
- ゲーム進行と得点計算はサーバー側ですが、プロトタイプです。十分な実機・通信断テスト前の公開大会などには使用しないでください。
- 牌の絵柄は元のFluffyStuff公開素材をURLで参照します。画像の同梱はしていません。読み込めないときはUnicode牌に切り替わります。
