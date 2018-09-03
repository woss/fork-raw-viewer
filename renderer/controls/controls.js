const fs = require('fs');
const path = require('path');

const toggle = require('./toggle.js');
const select = require('./select.js');

const name = 'controls';
const style = fs.readFileSync(path.resolve(__dirname, `${name}.css`), 'utf8');

module.exports = function ({ events }) {
  const elem = document.createElement('div');
  elem.className = name;

  const zoom = toggle({
    name: 'zoom',
    values: [ 'fit', '1:1' ]
  });

  zoom.on('change', ({ value }) => {
    events.emit('image:zoom', { scale: value === '1:1' ? 1 : 'fit' });
  });

  const ratings = select({
    name: 'rating',
    values: [
      { label: '★ 0+', value: 0 },
      { label: '★ 1+', value: 1 },
      { label: '★ 2+', value: 2 },
      { label: '★ 3+', value: 3 },
      { label: '★ 4+', value: 4 },
      { label: '★ 5', value: 5 }
    ]
  });

  ratings.on('change', ({ value }) => {
    events.emit('image:filter', { rating: value });
  });

  elem.appendChild(zoom.elem);
  elem.appendChild(ratings.elem);

  events.on('image:load', () => {
    zoom.value = 'fit';
  });

  return { elem, style };
};
