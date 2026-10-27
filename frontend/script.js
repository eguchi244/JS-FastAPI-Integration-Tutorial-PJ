/* ==========================================
 * タスク管理アプリ（API連携版）
 * fetchによるAPI通信・DOM描画・通信UI（ローディング/エラー表示）
 * ========================================*/

// ==========================================
// 型定義
// ==========================================

/**
 * APIが返すタスク1件
 *
 * @typedef {Object} Task
 * @property {number} id - タスクのID（DBが採番する）
 * @property {string} title - タスクの内容
 * @property {boolean} completed - 完了していれば true
 * @property {string} created_at - 作成日時（APIが返す日時の文字列）
 */

// ==========================================
// APIのベースURL
// ==========================================

/** APIサーバーのURL */
const API_BASE = 'http://localhost:8000';

// ==========================================
// DOM要素
// ==========================================

/** 通信中の表示 */
const loading   = document.getElementById('loading');
/** エラーメッセージの表示欄 */
const errorBox  = document.getElementById('error');
/** タスクの入力フォーム */
const taskForm  = document.getElementById('taskForm');
/** タスクの入力欄 */
const taskInput = document.getElementById('taskInput');
/** タスクの一覧を表示する要素 */
const taskList  = document.getElementById('taskList');
/** 残り件数と総件数を表示する要素 */
const taskCount = document.getElementById('taskCount');

// ==========================================
// API通信
// ==========================================

/**
 * APIからタスク一覧を取得して画面に描画する
 *
 * @throws {Error} レスポンスが失敗ステータス（res.okがfalse）の場合
 */
async function fetchTasks() {
  // FastAPIからタスク一覧を取得
  const res = await fetch(`${API_BASE}/tasks`);

  // レスポンス結果を判定
  // NOTE: fetchは404や500でも例外にならずres.okがfalseになるだけなので、自分で例外に変換する必要がある
  if (!res.ok) throw new Error(`GET /tasks failed: ${res.status}`);

  // JSONをTasks配列に変換
  /** @type {Task[]} */
  const tasks = await res.json();

  // 画面を再描画
  render(tasks);
}

// ==========================================
// DOM 描画
// ==========================================

/**
 * タスクリストのli要素を作成する
 *
 * @param {Task} task - タスク
 * @returns {HTMLLIElement}　li要素のタスクリスト
 */
function createTaskElement(task) {
  // li要素を作成する
  const li = document.createElement('li');
  li.className = task.completed ? 'task-item completed' : 'task-item';

  // checkbox要素を作成する
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.completed;
  checkbox.dataset.id = task.id;
  checkbox.dataset.action = 'toggle';

  // タイトルのspan要素を作成する
  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title; // XSS対策(textContent使用)

  // 削除用のbtn要素を作成する
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn btn-delete';
  deleteBtn.textContent = '削除';
  deleteBtn.dataset.id = task.id;
  deleteBtn.dataset.action = 'delete';

  // li要素に各要素をまとめて追加する
  li.append(checkbox, title, deleteBtn);
  return li;
}

/**
 * APIから取得したタスク一覧で画面を再描画する
 *
 * NOTE: フロントは状態を持たないため、描画対象は状態変数ではなく引数で受け取る
 *
 * @param {Task[]} tasks - APIから取得したタスク一覧
 */
function render(tasks) {
  // タスクリストの再描画（空にしてから生成し直す）
  taskList.innerHTML = '';
  tasks.forEach((task) => {
    taskList.appendChild(createTaskElement(task));
  });

  // フッター（残り件数 / 総件数）
  const remaining = tasks.filter((task) => !task.completed).length;
  taskCount.textContent = `残り ${remaining} 件 / 全 ${tasks.length} 件`;
}

// ==========================================
// 初期表示（ページ読み込み時にAPIから一覧取得）
// ==========================================

fetchTasks();
