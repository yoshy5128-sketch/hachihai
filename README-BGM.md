# 八牌 BGM追加版（提供された hachihai-main.zip ベース）

このパッケージはアップロードされたGitHub版の構造と通信方式を維持しています。
**2人対戦は6桁の部屋番号を使うRenderサーバー方式**です。純粋なゲームP2P版ではありません。音声通話にはWebRTCを利用しています。

- 添付BGMを `bgm.mp3` で同梱。効果音の音量と独立したBGMスライダーをTOP／設定画面に追加。
- CPU対戦・2人対戦ともループ再生。ブラウザの自動再生制限により初回操作後に再生します。
- トップ説明文の字サイズと段落余白を圧縮。
- `server.js`, `shared.js`, `package.json` はアップロード原本と同一です。
- GitHubにアップロードする際は `index.html`, `multiplayer.html`, `sw.js`, `bgm.mp3` を更新・追加してください。
