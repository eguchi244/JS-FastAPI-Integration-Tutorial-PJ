/** APIサーバーのURL */
const API_BASE = 'http://localhost:8000';

/**
 * APIからタスク一覧を取得し、コンソールに表示する（通信の動作確認）
 */
async function main() {
  const res = await fetch(`${API_BASE}/tasks`);
  console.log(await res.json());
}

main();
