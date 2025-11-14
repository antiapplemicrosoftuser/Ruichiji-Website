# ぜ～～～～～～～～～～～～～～～～～～～～んぶCopilotがやった!

```markdown
# Ruichiji — Jekyll site template

このリポジトリは作曲家 Ruichiji のポートフォリオを想定した Jekyll テンプレートです。

構成
- _config.yml — Jekyll 設定
- _includes/header.html — 共通ヘッダー（メニューバー）
- _layouts/default.html — 共通レイアウト（CSS/JS読み込み）
- 各ページ（index.html, topics.html, ...）は front matter を持ち、layout: default を使用します
- assets/
  - css/style.css — ダークテーマ
  - js/main.js — ページレンダリングとヘッダー高さ補正（Jekyll の include を前提）
  - data/*.json — サンプルデータ（topics/music/movies/discography/live）

使用方法
1. これらのファイルをローカルに保存します（ディレクトリ構成はそのまま）。
2. git init; git add .; git commit -m "Initial commit"
3. GitHub で新規リポジトリを作成し、push します。
4. リポジトリの Settings → Pages で GitHub Pages を有効にします。
   - repository pages（username.github.io/repo）を使う場合は _config.yml の baseurl を "/repo" に設定してください。

カスタマイズのヒント
- assets/data/*.json を編集してコンテンツを差し替えてください。
- タイトルをトップへのリンクに戻したい場合は `_includes/header.html` の h1 を a タグに戻してください。
- Jekyll のテンプレートでさらに動的な処理（active クラスのロジック等）を追加可能です。

問題が生じたら
- Pages のビルドログ（Settings → Pages）を確認してください。
- ブラウザの開発者ツールで CSS/JS の404や console エラーを確認してください。
```
