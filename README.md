# JS-FastAPI-Integration-Tutorial-PJ

Zenn の本「JavaScript×FastAPI入門 - タスク管理アプリをAPIとつないでみよう!」の答え合わせ用ソースコードです。

Vanilla JS のタスク管理アプリ（画面）と FastAPI のタスク管理 API をつなぎ、データの保存先を localStorage から API サーバーへ移します。CORS の設定、fetch と async/await による GET / POST / PUT / DELETE、ローディング表示とエラー表示を、4つのフェーズに分けて作ります。

## ブランチ

| ブランチ | 内容 |
|---|---|
| `main` | 完成版 |
| `Start/出発点のコード` | 入門03 で取得する出発点（前作の画面と API の完成版を `frontend/`・`backend/` に置いたもの） |
| `Chapter03/2つのプロジェクトを合流させる` | 入門03（Phase 1）を終えた時点のコード |
| `Chapter04/CORS設定と一覧取得` | 入門04（Phase 2）を終えた時点のコード |
| `Chapter05/追加・完了切り替え・削除をAPIにつなぐ` | 入門05（Phase 3）を終えた時点のコード |
| `Chapter06/ローディングとエラーの表示` | 入門06（Phase 4）を終えた時点のコード（完成版と同じ） |

## 動かし方

Python 3.10 以上と、VS Code + Live Server 拡張が必要です。PowerShell の例です。

API（バックエンド）を起動します。

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

`http://localhost:8000/docs` を開くと Swagger UI から API を試せます。停止は `Ctrl + C` です。初回起動時に SQLite のデータベースファイル `backend/tasks.db` が作られます。データを初期状態に戻すときは、API を止めて `tasks.db` を削除してください。

画面（フロントエンド）は、VS Code で `frontend/index.html` を右クリック →「Open with Live Server」で開きます。

## 構成

```
backend/
├── main.py            # FastAPI アプリ（CORS 設定・データベースの設定・モデル・エンドポイント）
└── requirements.txt   # 使うライブラリ
frontend/
├── index.html
├── style.css
└── script.js          # fetch による API 通信・描画・ローディング/エラー表示
```

## 技術スタック

- HTML5 / CSS3 / JavaScript（ES6+）+ Fetch API
- Python 3.10+ / FastAPI / Uvicorn / Pydantic v2
- SQLAlchemy + SQLite
