const vscode = acquireVsCodeApi();
const errorEl = document.getElementById('error');

document.querySelectorAll('.env-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    vscode.postMessage({
      type: 'switchEnvironment',
      environment: btn.dataset.env,
    });
  });
});

document.getElementById('login').addEventListener('click', () => {
  errorEl.textContent = '';
  vscode.postMessage({ type: 'login' });
});

window.addEventListener('message', (event) => {
  if (event.data.type === 'error') {
    errorEl.textContent = event.data.message;
  }
});
