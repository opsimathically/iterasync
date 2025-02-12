import IterAsync from '@src/classes/IterAsync.class';
import test from 'node:test';
import assert from 'node:assert';
import * as wtfnode from 'wtfnode';

process.on('beforeExit', () => {
  wtfnode.dump();
});

(async function () {
  type extra_t = {
    hello: number;
  };

  await test('Check that stop works and that gen/processor can use this or ia as self reference', async function () {
    const ia = new IterAsync<number, extra_t>({
      concurrency: 10,
      extra: {
        hello: 1
      },
      gen: async function* () {
        for (let i = 0; i < 100; i++) {
          if (!ia.extra.hello) {
            assert.fail('Extra was not set correctly using ia handle.');
          }
          yield Math.random();
        }
      },
      processor: async function (
        this: IterAsync<number, extra_t>,
        item: number
      ) {
        if (!this.extra.hello) {
          assert.fail('Extra was not set correctly using this in processor.');
        }
        console.log(item);
        this.stop();
      }
    });
    await ia.run();
    if (ia.total_procs_run_cnt !== 1) assert.fail('Stop operation failed.');
  });

  await test('Check all tasks completed 100 at a time.', async function () {
    const ia = new IterAsync<number, extra_t>({
      concurrency: 100,
      extra: {
        hello: 1
      },
      gen: async function* () {
        for (let i = 0; i < 1000; i++) {
          yield Math.random();
        }
      },
      processor: async function (this: IterAsync<number, extra_t>) {}
    });
    await ia.run();
    if (ia.total_procs_run_cnt !== 1000)
      assert.fail('Tests failed to complete.');
  });

  await test('Testing data count < concurrency.', async function () {
    const ia = new IterAsync<number, extra_t>({
      concurrency: 100,
      extra: {
        hello: 1
      },
      gen: async function* () {
        for (let i = 0; i < 10; i++) {
          yield Math.random();
        }
      },
      processor: async function (this: IterAsync<number, extra_t>) {}
    });
    await ia.run();
    if (ia.total_procs_run_cnt !== 10)
      assert.fail('Run count was not as expected (expected 10).');
  });

  await test('Testing non-numeric object type.', async function () {
    type test_obj_t = { hello: string };
    const test_arr: test_obj_t[] = Array.from({ length: 1000 }, () => ({
      hello: 'there'
    }));
    const ia = new IterAsync<test_obj_t, extra_t>({
      concurrency: 100,
      extra: {
        hello: 1
      },
      gen: async function* () {
        for (let i = 0; i < test_arr.length; i++) {
          yield test_arr[i];
        }
      },
      processor: async function (
        this: IterAsync<test_obj_t, extra_t>,
        item: test_obj_t
      ) {
        if (item.hello !== 'there') assert.fail("Complex type didn't work.");
      }
    });
    await ia.run();
    if (ia.total_procs_run_cnt !== 1000)
      assert.fail('Run count was not as expected (expected 10).');
  });
})();
