import EventEmitter from 'events';
import { performance } from 'perf_hooks';

export default class IterAsync<IterType, ExtraType> extends EventEmitter {
  indicators: { stop: boolean } = {
    stop: false
  };
  procs_running_cnt: number = 0;
  total_procs_run_cnt: number = 0;
  total_task_time: number = 0;
  concurrency: number;
  extra: ExtraType;
  private gen: () => AsyncGenerator<IterType, void, unknown>;
  private processor: (item: IterType) => Promise<void>;
  constructor(params: {
    concurrency: number;
    extra: ExtraType;
    gen: () => AsyncGenerator<IterType, void, unknown>;
    processor: (
      this: IterAsync<IterType, ExtraType>,
      item: IterType
    ) => Promise<void>;
  }) {
    super();
    this.processor = params.processor.bind(this);
    this.concurrency = params.concurrency;
    this.gen = params.gen.bind(this);
    this.extra = params.extra;
  }

  stop() {
    this.indicators.stop = true;
    this.emit('stop');
    return true;
  }

  async run() {
    const val_generator = this.gen();
    let finished_resolver: (value: boolean) => void = (value: boolean) => {
      return value;
    };
    const wait_finish_promise = new Promise(function (resolve) {
      finished_resolver = resolve;
    });
    this.on('proc_start', async (data: IterType) => {
      if (this.indicators.stop) {
        this.emit('proc_exited', {});
        return;
      }
      const start_time = performance.now();
      await this.processor(data);
      this.total_task_time += performance.now() - start_time;
      this.emit('proc_finished', {});
    });
    this.on('proc_finished', async () => {
      this.total_procs_run_cnt++;
      const generated_val = await val_generator.next();
      if (generated_val.done) {
        this.emit('proc_exited', {});
        return;
      }
      this.emit('proc_start', generated_val.value);
    });
    this.on('proc_exited', () => {
      this.procs_running_cnt--;
      if (this.procs_running_cnt === 0) finished_resolver(true);
    });
    for (let i = 0; i < this.concurrency; i++) {
      const generated_val = await val_generator.next();
      if (generated_val.done) {
        if (this.total_procs_run_cnt === 0) {
          finished_resolver(true);
        }
        break;
      }
      this.procs_running_cnt++;
      this.emit('proc_start', generated_val.value);
    }
    await wait_finish_promise;
    return true;
  }
}
