(function () {
  const vscode = acquireVsCodeApi();

  let state = vscode.getState();
  if (state) {
    buildContentFromState();
  } else {
    vscode.postMessage({type: 'buildState'});
  }

  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
      case 'state': {
        state = message.value;
        vscode.setState(state);
        buildContentFromState();
        break;
      }
    }
  });

  function buildContentFromState() {
    const container = document.querySelector('.libs-container');
    if (Object.keys(state).length === 0) {
      container.innerHTML = 'No projects found';
      return;
    }
    container.innerHTML = '';
    for (let [libName, libState] of Object.entries(state)) {
      const libDiv = document.createElement('div');
      if (libState.exclude) {
        libDiv.classList.add('checked');
      }
      libDiv.innerHTML = `
        <div class='checkbox-box'>
          <i class='codicon codicon-check'></i>
        </div>
        <div title="${libName}">
          ${libName}
        </div>`;

      libDiv.addEventListener('click', () => {
        const checked = libDiv.classList.toggle('checked');
        onCheckChange(libName, checked);
      });
      container.appendChild(libDiv);
    }
  }

  function onCheckChange(libName, checked) {
    state[libName].exclude = checked;
    saveState();
  }

  function setStateForAllCheckboxes(checked) {
    const libDivs = document.querySelectorAll('.libs-container > div');
    for (let i = 0; i < libDivs.length; i++) {
      if (checked) {
        libDivs[i].classList.add('checked');
      } else {
        libDivs[i].classList.remove('checked');
      }
    }
    for (let [, libState] of Object.entries(state)) {
      libState.exclude = checked;
    }
    saveState();
  }

  function saveState() {
    vscode.setState(state);
    vscode.postMessage({ type: 'saveState', value: JSON.stringify(state) });
  }

  document.querySelector('.refresh-button').addEventListener('click', () => {
    vscode.postMessage({ type: 'buildState' });
  });

  document.querySelector('.select-all-button').addEventListener('click', () => {
    setStateForAllCheckboxes(true);
  });

  document.querySelector('.unselect-all-button').addEventListener('click', () => {
    setStateForAllCheckboxes(false);
  });

  document.querySelector('.reload-button').addEventListener('click', () => {
    vscode.postMessage({ type: 'reloadWindow' });
  });
}());


