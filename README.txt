八牌 HACHIHAI 試作版 v0.1

【始め方】
index.html をブラウザで開き、「対局スタート」を押してください。
スマートフォンの場合は GitHub Pages や Vercel への配置がおすすめです。

【ゲーム内容】
筒子と萬子の1〜9、各4枚。72枚から7枚配牌。
1枚引き、8枚で3枚組＋3枚組＋同じ2枚が完成するとツモ。
捨て牌を使って完成すればロン。ただしフリテンではロン不可。
ツモ2点・ロン3点・先に10点獲得した側が勝利。

【牌の画像について・重要】
牌の画像は次のパブリックドメイン素材をゲーム起動時に読み込みます。
https://github.com/FluffyStuff/riichi-mahjong-tiles
参照URL： https://raw.githubusercontent.com/FluffyStuff/riichi-mahjong-tiles/master/Export/Regular/
画像がネットワークの問題などで読み込めない場合は、ブラウザの麻雀牌Unicode表示へ切り替わります。
今回のZIPには画像データそのものは同梱していません。画像を完全オフラインで使用するには
オリジナルリポジトリの Export/Regular/ の Pin1.png〜Pin9.png / Man1.png〜Man9.png を
ダウンロードして、index.html の IMGROOT をローカルのパスに変更してください。

【ライセンス】
画像出典：FluffyStuff / riichi-mahjong-tiles、Public Domain (CC0)
ゲームコードは自由に改変して利用できます。
