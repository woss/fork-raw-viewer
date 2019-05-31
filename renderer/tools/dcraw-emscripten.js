const EventEmitter = require('events');
const log = require('../../lib/log.js')('dcraw');

// USAGE:
// let workers = require('workers.js')(4);
// let data = await workers.exec('imageUint8Array', [filepath]);

module.exports = (count) => {
  const arr = [];
  const queue = [];
  const events = new EventEmitter();

  function flushQueue() {
    if (!queue.length) {
      return;
    }

    log.info('flushing %s queued tasks with %s workers', queue.length, arr.length);

    while (arr.length && queue.length) {
      queue.shift()();
    }
  }

  async function spawnWorkers() {
    function createWorker(idx) {
      return new Promise((resolve) => {
        // this path is relative to index.html
        const worker = new Worker('./dcraw-worker.js');

        worker.onmessage = (ev) => {
          if (ev.data.type === 'ready') {
            return resolve(worker);
          }

          if (ev.data.type === 'done') {
            return events.emit(`done:${idx}`, ev.data);
          }

          log.info('worker message', ev);
        };

        worker.idx = idx;

        return worker;
      });
    }

    while (arr.length < count) {
      arr.push(await createWorker(arr.length));
    }

    setImmediate(flushQueue);
  }

  log.timing('worker init', () => spawnWorkers()).then(() => {
    log.info('workers ready');
  }).catch(err => {
    log.error('failed to create workers', err);
  });

  function exec(name, args) {
    return new Promise((resolve, reject) => {
      function doWork() {
        const worker = arr.shift();

        events.once(`done:${worker.idx}`, res => {
          log.info('post message overhead', Date.now() - res.epoch, 'ms');
          arr.push(worker);

          setImmediate(flushQueue);

          if (res.err) {
            return reject(res.err);
          }

          return resolve(res.data);
        });

        worker.postMessage({
          type: 'exec',
          name, args
        });
      }

      if (!arr.length) {
        // there are no workers, add this exec to queue
        return queue.push(doWork);
      }

      return doWork();
    });
  }

  return { exec };
};
