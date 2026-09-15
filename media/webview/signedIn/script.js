const vscode = acquireVsCodeApi();
const errorEl = document.getElementById('error');
const resultEl = document.getElementById('result');

document.getElementById('logout').addEventListener('click', () => {
  vscode.postMessage({ type: 'logout' });
});

document.getElementById('fetchUser').addEventListener('click', () => {
  errorEl.textContent = '';
  resultEl.textContent = '';
  vscode.postMessage({ type: 'fetchUser' });
});

document.getElementById('exportDefinition').addEventListener('click', () => {
  errorEl.textContent = '';
  resultEl.textContent = '';
  const name = document.getElementById('definitionTypeName').value;
  vscode.postMessage({ type: 'exportDefinition', name });
});

window.addEventListener('message', (event) => {
  if (event.data.type === 'error') {
    errorEl.textContent = event.data.message;
  } else if (event.data.type === 'user') {
    resultEl.textContent = JSON.stringify(event.data.data, null, 2);
  } else if (event.data.type === 'exportDefinitionResult') {
    resultEl.textContent = `Written to ${event.data.path}`;
  }
});
