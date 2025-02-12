# iterasync

Consume data from a generator function and process it asynchronously using events.
Written to be lightweight, fast, reusable, with a stable interface/usage pattern.

## Install
```bash
npm install @opsimathically/iterasync
```

## Building from source
This package is intended to be run via npm, but if you'd like to build from source, 
clone this repo, enter directory, and run ```npm install``` for dev dependencies, then run 
```npm run build```.

## Usage
```typescript
import IterAsync from '@opsimathically/iterasync';
(async function(){

    // <number, extra_t> are your "item type"/"extra" generics.  They can 
    // be set to whatever types of items (db records, configurations,
    // etc) and extra passthrough data you'll be working with.  In this example
    // we're using a number as our item type, and an arbitrary extra passthrough
    // type defined directly below.
    type extra_t = {
        hello: number;
    };
    const ia = new IterAsync<number, extra_t>({
        // total number of processors (read: function defined below) to 
        // execute at a time.
        concurrency: 10,
        // pass through whatever extra data you want here (db handles, etc)
        extra: {
            hello: 1
        },
        // generate whatever data you want here (pull from db, 
        // iterate from array, read from stream, etc).  The 'this'
        // pointer for this function is bound to the IterAsync 
        // instance directly, but you can also use the ia handle 
        // if you prefer.
        gen: async function* () {
            for (let i = 0; i < 100; i++) {
                if (!ia.extra.hello) {
                    return;
                }
                yield Math.random();
            }
        },
        // Consume your data here.  The 'this' pointer in the
        // processor below is also bound to the IterAsync instance,
        // but we supply a type here so we get autocompletion in 
        // typescript/IDEs.
        processor: async function (
            this: IterAsync<number, extra_t>,
            item: number
        ) {

            // reference/utilize whatever passthrough data
            if (!this.extra.hello) {
                return;
            }

            // do whatever you want with the item
            console.log(item);

            // for demonstration purposes, stop the processor 
            // event cycle (can also be done outside using the 
            // ia handle). In real usage you'll only want to do 
            // this based on whatever logic demands stopping the
            // generator/processor cycle.
            this.stop();
        }
    });

    // Run the IterAsync instance.  This will start the event 
    // driven generation/processing loop.
    await ia.run();
    // since we stopped the loop for example purposes above, you'll 
    // only see one item processed.
    console.log({
        procs_running_cnt: ia.procs_running_cnt,
        total_procs_run_cnt: ia.total_procs_run_cnt,
        total_task_time: ia.total_task_time
    })
})()
```