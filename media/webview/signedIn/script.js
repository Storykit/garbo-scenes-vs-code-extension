const vscode = acquireVsCodeApi();
const errorEl = document.getElementById('error');
const resultEl = document.getElementById('result');

document.querySelectorAll('.env-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    vscode.postMessage({ type: 'switchEnvironment', environment: btn.dataset.env });
  });
});

document.getElementById('logout').addEventListener('click', () => {
  vscode.postMessage({ type: 'logout' });
});

document.getElementById('exportDefinition').addEventListener('click', () => {
  errorEl.textContent = '';
  resultEl.textContent = '';
  const name = document.getElementById('definitionTypeName').value;
  vscode.postMessage({ type: 'exportDefinition', name });
});

document.getElementById('generateData').addEventListener('click', () => {
  errorEl.textContent = '';
  resultEl.textContent = '';
  const name = document.getElementById('definitionTypeName').value;
  vscode.postMessage({ type: 'generateData', name });
});

window.addEventListener('message', (event) => {
  if (event.data.type === 'error') {
    errorEl.textContent = event.data.message;
  } else if (event.data.type === 'exportDefinitionResult') {
    resultEl.textContent = `Written to ${event.data.path}`;
  } else if (event.data.type === 'generateDataResult') {
    resultEl.textContent = `Data written to ${event.data.path}`;
  }
});
