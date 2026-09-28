const vscode = acquireVsCodeApi();
const errorEl = document.getElementById('error');
const resultEl = document.getElementById('result');
const nameEl = document.getElementById('definitionTypeName');
const allDirectoriesEl = document.getElementById('allDirectories');
const onlyIfEmptyEl = document.getElementById('onlyIfEmpty');

document.querySelectorAll('.env-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    vscode.postMessage({ type: 'switchEnvironment', environment: btn.dataset.env });
  });
});

document.getElementById('logout').addEventListener('click', () => {
  vscode.postMessage({ type: 'logout' });
});

allDirectoriesEl.addEventListener('change', () => {
  nameEl.disabled = allDirectoriesEl.checked;
});

document.querySelectorAll('[data-operation]').forEach((btn) => {
  btn.addEventListener('click', () => {
    errorEl.textContent = '';
    resultEl.textContent = 'Running…';
    vscode.postMessage({
      type: 'runOperation',
      operation: btn.dataset.operation,
      name: nameEl.value,
      allDirectories: allDirectoriesEl.checked,
      onlyIfEmpty: onlyIfEmptyEl.checked,
    });
  });
});

window.addEventListener('message', (event) => {
  if (event.data.type === 'error') {
    resultEl.textContent = '';
    errorEl.textContent = event.data.message;
  } else if (event.data.type === 'operationResult') {
    const { written, skipped, failed } = event.data;
    const sections = [];
    if (written.length) {
      sections.push(`Written (${written.length}):\n${written.join('\n')}`);
    }
    if (skipped.length) {
      sections.push(`Skipped, already has content (${skipped.length}):\n${skipped.join('\n')}`);
    }
    resultEl.textContent = sections.length ? sections.join('\n\n') : 'Nothing written.';
    errorEl.textContent = failed.length
      ? `Failed (${failed.length}):\n${failed.map((f) => `${f.name}: ${f.message}`).join('\n')}`
      : '';
  }
});
