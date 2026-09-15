const vscode = acquireVsCodeApi();
const errorEl = document.getElementById('error');

document.getElementById('login').addEventListener('click', () => {
  errorEl.textContent = '';
  vscode.postMessage({ type: 'login' });
});

window.addEventListener('message', (event) => {
  if (event.data.type === 'error') {
    errorEl.textContent = event.data.message;
  }
});
