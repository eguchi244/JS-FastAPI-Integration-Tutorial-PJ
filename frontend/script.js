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
//
// NOTE: 書き込み系（追加・完了切替・削除）は最後に必ずfetchTasksで取り直します
// フロント側の配列も更新して画面を合わせると、真実のソースがサーバーとフロントの2つになるためです
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

/**
 * タスクを新規作成して一覧を取り直す
 *
 * @param {string} title - タスクのタイトル
 * @throws {Error} レスポンスが失敗ステータス（res.okがfalse）の場合
 */
async function addTask(title) {
  // FastAPIからタスク新規作成を取得
  const res = await fetch(`${API_BASE}/tasks`, {
    method  : 'POST',
    headers : { 'Content-Type': 'application/json' },
    body    : JSON.stringify({ title }),
  });

  // レスポンス結果を判定
  if (!res.ok) throw new Error(`POST /tasks failed: ${res.status}`);

  // タスク一覧を再取得して再描画
  await fetchTasks();
}

/**
 * タスクの完了状態を更新して一覧を取り直す
 *
 * NOTE: 送るのは completed だけの部分更新です（APIのTaskUpdateは全項目が任意のため）
 *
 * @param {string} id - タスクのID（data-id属性から取得するため文字列）
 * @param {boolean} completed - 更新後の完了状態
 * @throws {Error} レスポンスが失敗ステータス（res.okがfalse）の場合
 */
async function toggleTask(id, completed) {
  // FastAPIから指定タスクの更新を取得
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method  : 'PUT',
    headers : { 'Content-Type': 'application/json' },
    body    : JSON.stringify({ completed }),
  });

  // レスポンス結果を判定
  if (!res.ok) throw new Error(`PUT /tasks/${id} failed: ${res.status}`);

  // タスク一覧を再取得して再描画
  await fetchTasks();
}

/**
 * 指定IDのタスクを削除して一覧を取り直す
 *
 * @param {string} id - タスクのID（data-id属性から取得するため文字列）
 * @throws {Error} レスポンスが失敗ステータス（res.okがfalse）の場合
 */
async function deleteTask(id) {
  // FastAPIから指定タスクの削除を取得
  const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });

  // レスポンス結果を判定
  if (!res.ok) throw new Error(`DELETE /tasks/${id} failed: ${res.status}`);

  // タスク一覧を再取得して再描画
  await fetchTasks();
}

// ==========================================
// ローディング・エラー表示
// ==========================================

/**
 * ローディング表示（通信中...）の表示・非表示を切り替える
 *
 * @param {boolean} isLoading - 通信中ならtrue、通信が終わっていればfalse
 */
function showLoading(isLoading) {
  loading.classList.toggle('hidden', !isLoading);
}

/**
 * エラーメッセージを画面に表示する
 *
 * @param {string} message - 画面に表示する文言
 */
function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

/**
 * エラー表示を消す
 */
function clearError() {
  errorBox.classList.add('hidden');
}

/**
 * API呼び出しを包んで、ローディング表示とエラー処理を一元化する
 *
 * @param {() => Promise<void>} fn - 包んで実行するAPI呼び出し
 */
async function apiCall(fn) {
  try {
    clearError();
    showLoading(true);
    await fn();
  } catch (error) {
    // 通信に失敗した場合はUIにも表示する（コンソールだけではユーザーが気づけない）
    console.error(`予期しないエラー: ${error.name} ${error.message}`);
    showError('サーバーとの通信に失敗しました');
  } finally {
    // NOTE: 成功・例外のどちらの経路でも必ずローディング表示を消す
    showLoading(false);
  }
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
// イベントハンドラー
// ==========================================

/**
 * タスク入力欄の送信イベントを処理する
 *
 * @param {SubmitEvent} event - フォーム送信のイベントオブジェクト
 */
function handleTaskSubmit(event) {
  // Formの規定動作を止める（SPA用のページリロード対策）
  event.preventDefault();

  // バリデーション
  // NOTE: 前後の空白を除去した結果が空文字なら追加しない
  const title = taskInput.value.trim();
  if (title === '') return;

  // タスクリストを作成・保存して描画する
  apiCall(async () => {
    await addTask(title);

    // タスク入力欄を空にしてフォーカスする
    // NOTE: クリアは追加が成功した後に行う（失敗時にはクリア処理はされない）
    taskInput.value = '';
    taskInput.focus();
  });
}

/**
 * タスクリスト内のクリックイベントを処理する（イベント移譲）
 *
 * NOTE: タスクリストの削除・完了切り替えを action に応じて実行する
 * @param {MouseEvent} event - クリックイベントのオブジェクト
 */
function handleTaskListClick(event) {
  // クリックされた要素の data-id と data-action を取得
  const { id, action } = event.target.dataset;

  // idが存在しない場合は何もしない
  if (!id) return;

  // actionに応じたAPI呼び出しを実行する
  if (action === 'delete') {
    apiCall(() => deleteTask(id));
  } else if (action === 'toggle') {
    apiCall(() => toggleTask(id, event.target.checked));
  }
}

// ==========================================
// イベントリスナー
// ==========================================

// --- タスク入力欄 ---
taskForm.addEventListener('submit', handleTaskSubmit);

// --- タスクリストの削除・完了切り替え（イベント移譲）---
taskList.addEventListener('click', handleTaskListClick);

// ==========================================
// 初期表示（ページ読み込み時にAPIから一覧取得）
// ==========================================

apiCall(fetchTasks);
