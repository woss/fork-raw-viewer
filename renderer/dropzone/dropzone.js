const fs = require('fs-extra');

const name = 'dropzone';
const style = true;

function dropzoneContent() {
  const container = document.createElement('div');
  container.className = 'container';

  const text = document.createElement('div');
  text.className = 'text';

  text.appendChild(document.createTextNode('drag and drop a folder to view'));
  container.appendChild(text);

  return container;
}

module.exports = function ({ events }) {
  var elem = document.createElement('div');
  elem.className = name;
  let hasDir = false;

  const container = dropzoneContent();
  container.onclick = (ev) => {
    ev.preventDefault();
    events.emit('directory:open');
  };

  elem.appendChild(container);

  function open() {
    elem.style.display = 'flex';
  }

  function close() {
    elem.style.display = 'none';
  }

  async function handleOpen(dirpath) {
    try {
      const stat = await fs.stat(dirpath);

      if (!stat.isDirectory()) {
        return events.emit('error', new Error('try opening a folder instead of a file'));
      }

      events.emit('directory:load', { dir: dirpath });
    } catch(e) {
      return events.emit('error', e);
    }
  }

  function stop() {
    return false;
  }

  elem.ondragover = stop.bind('enter');
  elem.ondragend = stop.bind('end');

  elem.ondragleave = () => {
    if (hasDir) {
      elem.style.display = 'none';
    }

    return false;
  };

  elem.ondrop = (e) => {
    e.preventDefault();

    const dir = e.dataTransfer.files[0];

    if (dir) {
      handleOpen(dir.path);
      close();
    }

    return false;
  };

  window.addEventListener('dragenter', (ev) => {
    ev.preventDefault();
    open();
  });

  events.on('directory:load', () => {
    hasDir = true;
    close();
  });

  return { elem, style };
};
