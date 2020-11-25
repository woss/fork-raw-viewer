const { expect } = require('chai');
const Jimp = require('jimp');
const waitForThrowable = require('wait-for-throwable');

const { start, stop } = require('./lib/app-provider.js');
const config = require('./lib/config-provider.js');
const { images, path: fixturePath } = require('./lib/fixtures.js');

const { urlToBuffer } = require('../renderer/tools/bufferToUrl.js');

describe('[smoke tests]', () => {
  async function cleanup() {
    const includeLogs = this.currentTest.state === 'failed';

    await stop(includeLogs);
    await config.cleanAll();
  }

  async function hashImage(dataUrl) {
    const original = urlToBuffer(dataUrl);
    const img = await Jimp.read(original);
    img.resize(50, Jimp.AUTO);
    return img.hash();
  }

  afterEach(cleanup);

  it('opens to the drag and drop screen', async () => {
    const configPath = await config.create({});
    const { utils } = await start(configPath);

    await utils.waitForVisible('.dropzone');

    expect(await utils.getText('.dropzone .container'))
      .to.equal('drag a folder to open\n\nor click to select a folder');
  });

  it('loads fixture images', async () => {
    expect(images.length).to.be.above(0);

    const configPath = await config.create({
      client: {
        lastDirectory: fixturePath()
      }
    });
    const { utils } = await start(configPath);

    const elements = await utils.waitForElementCount('.filmstrip .thumbnail', images.length);

    for (let i in images) {
      const { name, hash } = images[i];

      const element = elements[i];

      const filename = await utils.getElementAttribute(element, 'data-filename');
      expect(filename).to.equal(name);

      const [ img ] = await utils.waitForElementCount(`.filmstrip .thumbnail:nth-child(${+i + 1}) img`, 1);

      const dataUrl = await waitForThrowable(async () => {
        const dataUrl = await utils.getElementAttribute(img, 'src');

        expect(dataUrl).to.be.a('string', `${name} did not render to a string`);
        expect(`${dataUrl.slice(0, 40)}...`).to.match(/^data/, `${name} did not render to a data url`);

        return dataUrl;
      });

      expect(await hashImage(dataUrl)).to.match(hash, `hash for ${name} did not match`);
    }
  });
});
