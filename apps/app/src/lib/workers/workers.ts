export interface WorkerMessage<T extends string = string, P = unknown> {
  type: T;
  payload: P;
}

export interface WebWorker<
  I extends WorkerMessage,
  O extends WorkerMessage,
> extends Worker {
  onmessage: ((this: Worker, ev: MessageEvent<O>) => unknown) | null;

  postMessage(message: I, transfer?: Transferable[]): unknown;

  postMessage(message: I, options?: StructuredSerializeOptions): unknown;

  addEventListener(
    type: "message",
    listener: (this: Worker, ev: MessageEvent<O>) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): unknown;

  addEventListener(
    type: "messageerror",
    listener: (this: Worker, ev: MessageEvent) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): unknown;

  addEventListener(
    type: "error",
    listener: (this: Worker, ev: ErrorEvent) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): unknown;

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): unknown;
}

interface TypedMessagePort<
  I extends WorkerMessage,
  O extends WorkerMessage,
> extends MessagePort {
  onmessage:
    | ((this: TypedMessagePort<I, O>, ev: MessageEvent<O>) => unknown)
    | null;
  onmessageerror:
    | ((this: TypedMessagePort<I, O>, ev: MessageEvent) => unknown)
    | null;

  postMessage(message: I, transfer?: Transferable[]): unknown;

  postMessage(message: I, options?: StructuredSerializeOptions): unknown;

  addEventListener(
    type: "message",
    listener: (this: TypedMessagePort<I, O>, ev: MessageEvent<O>) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): unknown;

  addEventListener(
    type: "messageerror",
    listener: (this: TypedMessagePort<I, O>, ev: MessageEvent) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): unknown;

  addEventListener(
    type: "error",
    listener: (this: TypedMessagePort<I, O>, ev: ErrorEvent) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): unknown;

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): unknown;
}

interface TypedSharedWorker<
  I extends WorkerMessage,
  O extends WorkerMessage,
> extends SharedWorker {
  port: TypedMessagePort<I, O>;

  addEventListener(
    type: "message",
    listener: (this: SharedWorker, ev: MessageEvent<O>) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): unknown;

  addEventListener(
    type: "messageerror",
    listener: (this: SharedWorker, ev: MessageEvent) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): unknown;

  addEventListener(
    type: "error",
    listener: (this: SharedWorker, ev: ErrorEvent) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): unknown;

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): unknown;
}

export interface SharedWebWorker<
  I extends WorkerMessage,
  O extends WorkerMessage,
> extends TypedSharedWorker<I, O> {
  postMessage(message: I, transfer?: Transferable[]): unknown;

  postMessage(message: I, options?: StructuredSerializeOptions): unknown;
}

type AppWorker<I extends WorkerMessage, O extends WorkerMessage> =
  | WebWorker<I, O>
  | SharedWebWorker<I, O>;

interface WorkerModule<I extends WorkerMessage, O extends WorkerMessage> {
  default: new () => WebWorker<I, O>;
}

interface SharedWorkerModule<I extends WorkerMessage, O extends WorkerMessage> {
  default: new () => TypedSharedWorker<I, O>;
}

export async function loadWorker<
  I extends WorkerMessage,
  O extends WorkerMessage,
>(module: Promise<WorkerModule<I, O>>) {
  const Worker = await module;

  return new Worker.default();
}

export async function loadSharedWorker<
  I extends WorkerMessage,
  O extends WorkerMessage,
>(module: Promise<SharedWorkerModule<I, O>>): Promise<SharedWebWorker<I, O>> {
  const Worker = await module;

  console.debug(
    "Loading shared worker… To inspect the worker, open the developer tools from " +
      "chrome://inspect/#workers",
  );

  return new SharedWorkerImpl(new Worker.default());
}

class SharedWorkerImpl<
  W extends TypedSharedWorker<I, O>,
  I extends WorkerMessage,
  O extends WorkerMessage,
> implements SharedWebWorker<I, O> {
  readonly #worker: W;

  constructor(worker: W) {
    this.#worker = worker;
  }

  get port() {
    return this.#worker.port;
  }

  get postMessage() {
    return this.#worker.port.postMessage.bind(this.#worker.port);
  }

  get addEventListener() {
    return this.#worker.addEventListener.bind(this.#worker);
  }

  get removeEventListener() {
    return this.#worker.removeEventListener.bind(this.#worker);
  }

  get dispatchEvent() {
    return this.#worker.dispatchEvent.bind(this.#worker);
  }

  get onerror() {
    return this.#worker.onerror;
  }

  set onerror(handler) {
    this.#worker.onerror = handler;
  }
}

export function dispatchRequest<
  I extends WorkerMessage,
  O extends WorkerMessage,
>(worker: AppWorker<I, O>, message: I, transferables: Transferable[] = []) {
  worker.postMessage(message, transferables);
}

export async function expectResponse<
  I extends WorkerMessage,
  O extends WorkerMessage,
>(worker: WebWorker<I, O>, expectedType: O["type"]) {
  return new Promise((resolve, reject) => {
    worker.addEventListener("message", (event) => {
      const { type, payload } = event.data;

      if (type !== expectedType) {
        reject(new Error(`Unexpected message type ${type}`));
      }

      resolve(payload);
    });
  }) satisfies Promise<O["payload"]>;
}

export async function workerOperation<
  I extends WorkerMessage,
  O extends WorkerMessage,
>(
  module: Promise<WorkerModule<I, O>>,
  message: I,
  transferables?: Transferable[],
) {
  const worker = await loadWorker(module);

  dispatchRequest(worker, message, transferables);
  worker.postMessage(message, transferables);

  const response = await expectResponse(worker, message.type);

  worker.terminate();

  return response;
}
