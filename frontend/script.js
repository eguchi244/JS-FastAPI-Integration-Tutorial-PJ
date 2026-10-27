/* ==========================================
 * タスク管理アプリ（Vanilla JS）
 * 状態管理・DOM描画・localStorage永続化
 * ========================================*/

// ==========================================
// 型定義
// ==========================================

/**
 * タスク1件（localStorage に保存する形）
 *
 * @typedef {Object} Task
 * @property {string} id - タスクのID（crypto.randomUUID() で作るUUID）
 * @property {string} title - タスクの内容
 * @property {boolean} completed - 完了していれば true
 * @property {string} createdAt - 作成日時（ISO 8601形式の文字列）
 */

// ==========================================
// DOM要素
// ==========================================
/** タスクの入力フォーム */
const taskForm      = document.getElementById('taskForm');
/** タスクの入力欄 */
const taskInput     = document.getElementById('taskInput');
/** 絞り込みのボタン（すべて・未完了・完了済み） */
const filterButtons = document.querySelectorAll('.filter');
/** タスクの一覧を表示する要素 */
const taskList      = document.getElementById('taskList');
/** 残り件数と総件数を表示する要素 */
const taskCount     = document.getElementById('taskCount');

// ==========================================
// 状態変数
// NOTE: 単一の真実のソース（Single Source of Truth）
// ==========================================
/**
 * 全タスクの一覧（画面の表示と保存の元になる）
 *
 * @type {Task[]}
 */
let tasks  = [];    // タスク配列
/** 選択中の絞り込み（'all' | 'active' | 'completed'） */
let filter = 'all'; // 'all' | 'active' | 'completed'

// ==========================================
// localStorage Key
// ==========================================
/** localStorage に保存するときのキー */
const STORAGE_KEY = 'tasks';

// ==========================================
// タスク操作
// ==========================================

/**
 * 新しいタスクを作成してtasks配列に追加する
 *
 * @param {string} title - タスクのタイトル
 */
function addTask(title) {
  tasks.push({
    id: crypto.randomUUID(),
    title,
    completed: false,
    createdAt: new Date().toISOString(),
  });
}

/**
 * 指定ID以外のタスクでtasks配列を作り直す
 *
 * NOTE: 指定IDのタスクを削除すると同義です
 * @param {string} id - タスクのUUID
 */
function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
}

/**
 * タスクの完了状態を反転して更新する
 *
 * @param {string} id - タスクのUUID
 */
function toggleTask(id) {
  // 指定IDのタスクを取得
  const task = tasks.find((t) => t.id === id);

  // タスクの完了状態を反転する
  // NOTE: undefined対策 - タスクを取得できない時は状態更新しない
  if (task) {
    task.completed = !task.completed;
  }
}

// ==========================================
// localStorage 永続化
// ==========================================

/**
 * tasks配列をlocalStorageに保存する
 */
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/**
 * localStorageからtasksを復元する。
 *
 * NOTE: データが存在しない、または壊れている場合は空配列にフォールバックする
 * - 配列以外（未保存のnull、"abc" や {} など）はすべて空配列として扱う
 */
function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));

    // 配列判定：配列はそのままtasks配列に代入, 配列以外のデータの場合は空配列にする
    tasks = Array.isArray(stored) ? stored : [];
  } catch (error) {
    // 保存データが壊れていた場合は空の状態から始める
    tasks = [];
    console.error(`予期しないエラー: ${error.name} ${error.message}`);
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
 * 現在の状態（tasks, filter）に基づいて画面を再描画する
 *
 * 以下の処理をすべて実行します：
 * 1. 選択中のフィルター（all/active/completed）に応じたタスクの絞り込みとリスト描画
 * 2. フッター（残り件数 / 総件数）のテキスト更新
 * 3. フィルターボタンのアクティブ状態（CSSクラス）の切り替え
 */
function render() {
  // フィルタに応じた絞り込みでtasks配列を作り直す
  const visibleTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  // タスクリストの再描画（空にしてから生成し直す）
  taskList.innerHTML = '';
  visibleTasks.forEach((task) => {
    taskList.appendChild(createTaskElement(task));
  });

  // フッター（残り件数 / 総件数）
  const remaining = tasks.filter((task) => !task.completed).length;
  taskCount.textContent = `残り ${remaining} 件 / 全 ${tasks.length} 件`;

  // フィルタータブのアクティブ状態（CSSクラス）の切り替え
  filterButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
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
  addTask(title);
  saveTasks();
  render();

  // タスク入力欄を空にしてフォーカスする
  taskInput.value = '';
  taskInput.focus();
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

  // actionに応じた状態更新を実行する
  if (action === 'delete') {
    deleteTask(id);
  } else if (action === 'toggle') {
    toggleTask(id);
  } else {
    return;
  }

  // タスクリストを保存して再描画する
  saveTasks();
  render();
}

/**
 * フィルターボタンのクリックイベントを処理する
 *
 * @param {MouseEvent} event - クリックイベントのオブジェクト
 */
function handleFilterClick(event) {
  // クリックされたボタンの data-filter を取得
  const nextFilter = event.target.dataset.filter;

  // data-filterが取得できない場合は何もしない
  if (!nextFilter) return;

  // 状態（filter）を更新
  filter = nextFilter;

  // 画面を再描画する
  render();
}

// ==========================================
// イベントリスナー
// ==========================================

// --- タスク入力欄 ---
taskForm.addEventListener('submit', handleTaskSubmit);

// --- タスクリストの削除・完了切り替え（イベント移譲）---
taskList.addEventListener('click', handleTaskListClick);

// --- フィルターボタンの切り替え（各ボタンに個別バインド） ---
filterButtons.forEach((btn) => {
  btn.addEventListener('click', handleFilterClick);
});

// ==========================================
// 初期描画
// ==========================================
loadTasks();
render();
